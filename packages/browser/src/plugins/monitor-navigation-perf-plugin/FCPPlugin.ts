import { type PerformancePlugin, PerfMetricName, WhenType } from './interface'
import { observer } from './utils'

/**
 * first-contentful-paint
 * 首次内容绘制
 * 内容包括：文本，图片（包括背景图片），svg元素，非空白的canvas元素
 */
export const FCPPlugin: PerformancePlugin = {
  name: 'FCPPlugin',
  when: WhenType.Immediate,
  apply: (performanceVital) => {
    observer(
      'paint',
      (entryList) => {
        const info = entryList[0] || { startTime: 0 }
        performanceVital.addData(PerfMetricName.FCP, info.startTime).complete()
        // performanceVital.complete()
      },
      'first-contentful-paint',
      true
    )
  }
}
