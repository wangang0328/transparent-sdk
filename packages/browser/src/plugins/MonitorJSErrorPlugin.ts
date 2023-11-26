import { ReportEventClassify, type Plugin } from '@wa-dev/transparent-sdk-core'
import { parseErrorStack, genErrorId } from '@wa-dev/transparent-sdk-utils'
import { BrowserClient } from '../BrowserClient'
import { ErrorMechanismType } from '../constants'
import { ExceptionFrame, ExceptionMetirc, ExceptionPositionInfo } from '../interface'
import { genReportDefaultExceptionData, getErrorTypeByEvent } from '../utils'

// type Options = Record<string, any>

/**
 * js 错误上报类型结构
 */
interface JSExceptionMetirc extends ExceptionMetirc {
  meta: ExceptionPositionInfo
  /**
   * 必须有错误堆栈
   */
  stackTrace: (ExceptionFrame | string)[]
}

// TODO: 加参数 options: Options = {}
export const MonitorJSErrorPlugin = (): Plugin<BrowserClient> => {
  const errorPluginSetup = (client: BrowserClient) => {
    const jsErrHandler = (ev: ErrorEvent) => {
      if (getErrorTypeByEvent(ev) !== ErrorMechanismType.JS) {
        return
      }
      // 解析错误栈信息
      const parsedStack = parseErrorStack(ev.error)
      const { colno, lineno, filename, message, error } = ev

      // 生成错误的 uid， 如果只使用 message 和 name 可能会导致是来源于不同的代码片段，
      // 考虑将解析的堆栈加入到计算方法中，然后生成hash, 考虑到性能和长度，最多只用前三个
      // TODO：过滤掉匿名函数
      const errInfoStr = parsedStack.slice(0, 3).reduce((preStr, errFrame) => {
        return typeof errFrame === 'string' ? `${preStr}${errFrame}` : `${errFrame.functionName}${errFrame.row}`
      }, '')

      const reportData = genReportDefaultExceptionData<JSExceptionMetirc>(
        ErrorMechanismType.JS,
        genErrorId(`${filename}${lineno}${colno}${errInfoStr}`),
        message,
        error.name,
        {
          col: colno,
          row: lineno,
          fileUrl: filename
        },
        parsedStack
      )
      // 上报数据
      client.report(ReportEventClassify.EXCEPTION, reportData)
    }

    client.on('init', () => {
      window.addEventListener('error', jsErrHandler, true)
    })

    const errIds = new Set()
    client.on('report', (reportData) => {
      // 拦截是否相同错误的id
      if (reportData.classify === ReportEventClassify.EXCEPTION) {
        if (errIds.has(reportData.data.errorUid)) {
          return false
        }
        errIds.add(reportData.data.errorUid)
      }
    })
  }

  return {
    name: 'MonitorJSErrorPlugin',
    setup: errorPluginSetup
    // teardown: () => {
    //   // window.removeEventListener('error', jsErrHandler, true)
    // }
  }
}
