import { type Plugin, ReportEventClassify } from '@wa-dev/transparent-sdk-core'
import { BrowserClient } from '../BrowserClient'
import { genErrorId, parseErrorStack, wrapTryAsyncMethod } from '@wa-dev/transparent-sdk-utils'
import { ErrorMechanismType } from '../constants'
import { genReportDefaultExceptionData } from '../utils'

interface MonitorPromiseErrorPluginOptions {
  /**
   * 可选，是否追踪全路径的调用栈，默认是 ture
   * 如果开启，会重写then 方法，进行调用信息追踪，对性能会有一定的损耗
   */
  trackAllCallStack?: boolean
}

// 其实也就是在监听 promise 错误
export const MonitorPromiseErrorPlugin = ({
  trackAllCallStack = true
}: MonitorPromiseErrorPluginOptions = {}): Plugin<BrowserClient> => {
  if (trackAllCallStack) {
    const originThen = Promise.prototype.then
    // 重写 then 捕获调用信息
    Promise.prototype.then = function (onFulfilled, onRejected) {
      const wrappedFulfilled = wrapTryAsyncMethod(onFulfilled)
      return originThen.apply(this, [wrappedFulfilled, onRejected])
    }
  }

  return {
    name: 'MonitorPromiseErrorPlugin',
    setup: (client) => {
      client.on('init', () => {
        const handlePromiseError = (ev: PromiseRejectionEvent) => {
          // 解析错误栈信息
          const parsedStack = parseErrorStack(ev.reason)
          const { reason } = ev

          // 生成错误的 uid， 如果只使用 message 和 name 可能会导致是来源于不同的代码片段，
          // 考虑将解析的堆栈加入到计算方法中，然后生成hash, 考虑到性能和长度，最多只用前三个
          // TODO：过滤掉匿名函数
          const errInfoStr = parsedStack.slice(0, 3).reduce((preStr, errFrame) => {
            return typeof errFrame === 'string' ? `${preStr}${errFrame}` : `${errFrame.functionName}${errFrame.row}`
          }, '')

          const reportData = genReportDefaultExceptionData(
            ErrorMechanismType.UNHANDLED_REJECTION,
            genErrorId(`${ErrorMechanismType.UNHANDLED_REJECTION}${reason.message || ''}${errInfoStr}`),
            reason.message,
            reason.name,
            {},
            parsedStack
          )
          // 上报数据
          client.report(ReportEventClassify.EXCEPTION, reportData)
        }

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

        window.addEventListener('unhandledrejection', handlePromiseError)
      })
    }
  }
}
