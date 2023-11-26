import { ReportEventClassify, type Plugin } from '@wa-dev/transparent-sdk-core'
import { BrowserClient } from '../BrowserClient'
import { genReportDefaultExceptionData, getErrorTypeByEvent } from '../utils'
import { ErrorMechanismType } from '../constants'
import { genErrorId } from '@wa-dev/transparent-sdk-utils'
import { ExceptionMetirc } from '../interface'

export interface ResourceMeta {
  // 资源地址
  url: string
  html: string
  // 资源标签类型
  type: string
}

interface ResourceTarget {
  // 标签信息
  outHtml?: string
  src?: string
  tagName?: string
}

export interface ResourceExceptionMetirc extends ExceptionMetirc {
  meta: ResourceMeta
}

export const MonitorResourceErrorPlugin = (): Plugin<BrowserClient> => {
  return {
    name: 'MonitorResourceErrorPlugin',
    setup: (client) => {
      const resourceErrHandler = (ev: Event) => {
        if (getErrorTypeByEvent(ev) !== ErrorMechanismType.RESOURCE) {
          return
        }
        const { outHtml, src, tagName } = ev.target as ResourceTarget
        const meta: ResourceTarget = {
          outHtml: outHtml || '',
          src: src || '',
          tagName: tagName || ''
        }
        const reportData = genReportDefaultExceptionData<ResourceExceptionMetirc>(
          ErrorMechanismType.RESOURCE,
          genErrorId(`${ErrorMechanismType.RESOURCE}${outHtml || ''}`),
          '',
          'ResourceError',
          meta
        )
        // 上报数据
        client.report(ReportEventClassify.EXCEPTION, reportData)
      }

      client.on('init', () => {
        window.addEventListener('error', resourceErrHandler, true)
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
  }
}
