import { type Plugin, ReportEventClassify } from '@wa-dev/transparent-sdk-core'
import type { PerfDataMetric, PerformancePlugin, PerfMetricValue } from './interface'
import { WhenType } from './interface'
import { PerfMetricName } from './interface'
// 导入所有的 performance 插件
import { FPPlugin } from './FPPlugin'
import { FCPPlugin } from './FCPPlugin'
import { LCPPlugin } from './LCPPlugin'
import { FIDPlugin } from './FIDPlugin'
import { TTIAndTBTPlugin } from './TTIAndTBTPlugin'
import { NTPlugin } from './NTPlugin'
import { BrowserClient } from 'browser/src/BrowserClient'

// 首屏性能检测
export class PerformanceVital {
  private perfData: Partial<PerfDataMetric> = {}

  // 插件的状态， 0-未添加数据，1-已添加数据
  private pluginStatus: Record<string, 0 | 1> = {}

  // 计数方式 判断插件是否完成性能数据采集
  private incompleteCount: number = 0

  performancePlugins: any[] = []

  constructor(private client: BrowserClient) {}

  addCount() {
    ++this.incompleteCount
  }

  changePluginStatus(key: string, value: 0 | 1) {
    this.pluginStatus[key] = value
  }

  /**
   *
   * @param key 添加的 data 的 key
   * @param value 添加的 data 的 value
   */
  addData(key: PerfMetricName, value: PerfMetricValue) {
    console.log('addData---', key, value)
    // 添加数据
    this.perfData[key] = value
    // TODO：判断是否触发上报
    return this
  }

  // 插件完成采集性能数据后，一定要调用该方法，否则导致不能上报性能数据
  complete() {
    console.log('complete')
    if (--this.incompleteCount === 0) {
      console.log('开始上报')
      // 所有要采集的数据已经采集完成，触发上报
      this.client.report(ReportEventClassify.PERFORMANCE, this.perfData)
    }
  }
}

const afterLoad = (cb: () => void) => {
  // if (document.readyState === 'complete') {
  //   setTimeout(cb)
  // } else {
  //   window.addEventListener('pageshow', cb, { once: true, capture: true })
  // }
  window.addEventListener('load', cb, { once: true, capture: true })
}

const plugins = [FPPlugin, FCPPlugin, LCPPlugin, FIDPlugin, TTIAndTBTPlugin, NTPlugin]

const initPerf = (client: BrowserClient) => {
  const performanceVital = new PerformanceVital(client)

  const classifyByWhen: Record<WhenType, PerformancePlugin['apply'][]> = {
    immediate: [],
    afterLoad: []
  }

  plugins.forEach(({ when, apply }) => {
    // 初始化插件完成状态
    performanceVital.addCount()
    classifyByWhen[when].push(apply)
  })

  const applyPlugins = (list: PerformancePlugin['apply'][]) => {
    list.forEach((apply) => {
      apply(performanceVital)
    })
  }

  Object.keys(classifyByWhen).forEach((key) => {
    if (key === WhenType.Immediate) {
      applyPlugins(classifyByWhen[key])
    }
    if (key === WhenType.AfterLoad) {
      afterLoad(() => {
        applyPlugins(classifyByWhen[key])
      })
    }
  })
}

export const MonitorNavigationPerfPlugin = (): Plugin<BrowserClient> => {
  return {
    name: 'MonitorNavigationPerfPlugin',
    setup: (client) => {
      initPerf(client)
    }
  }
}
