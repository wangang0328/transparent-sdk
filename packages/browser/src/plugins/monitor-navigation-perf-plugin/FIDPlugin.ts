import { type PerformancePlugin, PerfMetricName, WhenType } from './interface'
import { observer } from './utils'

/**
 * first-input-delay
 * 首次输入延迟，有点击就会触发
 */
// TODO: 可能要加一个定时器
export const FIDPlugin: PerformancePlugin = {
  name: 'FIDPlugin',
  when: WhenType.Immediate,
  apply: (performanceVital) => {
    observer(
      'first-input',
      (entryList) => {
        const entry = entryList[0] as PerformanceEventTiming
        const delay = entry.processingStart - entry.startTime
        performanceVital.addData(PerfMetricName.FID, delay).complete()
        // performanceVital.complete()
      },
      '',
      true
    )
  }
}
