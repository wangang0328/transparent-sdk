import { Plugin, ReportEventClassify } from '@wa-dev/transparent-sdk-core'
import { BrowserClient } from '../BrowserClient'
import { genReportDefaultExceptionData, proxyHttp } from '../utils'
import { ErrorMechanismType } from '../constants'
import { genErrorId } from '@wa-dev/transparent-sdk-utils'

const toJSON = (v: any) => {
  try {
    return JSON.stringify(v) || ''
  } catch (error) {
    return ''
  }
}
// 监听异步请求错误
// 任何http请求底层都是用的 fetch/xhr， 所以要对这两个函数进行劫持
// 考虑到好多产品都是统一返回状态码200， 然后自定义状态错误码
// 所以在此增加一些配置，支持参数配置
export const MonitorHttpRequestPlugin = (): Plugin<BrowserClient> => {
  return {
    name: 'MonitorHttpRequestPlugin',
    setup: (client) => {
      const errIds = new Set()

      client.on('init', () => {
        // 监听http错误
        proxyHttp(undefined, (metirc) => {
          // xhr 如果请求失败 status 的值是0
          if (metirc.status! >= 400 || metirc.status! === 0) {
            const eventData = genReportDefaultExceptionData(
              ErrorMechanismType.HTTP,
              genErrorId(`${metirc.url}${toJSON(metirc.body)}${toJSON(metirc.response)}`),
              metirc.response || '',
              'HttpError',
              metirc
            )
            // currentMetirc
            // 异常状态
            client.report(ReportEventClassify.EXCEPTION, eventData)
          }
          // 其他情况不上报
        })
      })

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
  }
}
