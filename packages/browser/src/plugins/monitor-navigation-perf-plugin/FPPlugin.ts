import { type PerformancePlugin, PerfMetricName, WhenType } from './interface'
import { observer } from './utils'

/**
 * first-paint
 */
export const FPPlugin: PerformancePlugin = {
  name: 'FPPlugin',
  when: WhenType.Immediate,
  apply: (performanceVital) => {
    observer(
      'paint',
      (entryList) => {
        const info = entryList[0] || { startTime: 0 }
        performanceVital.addData(PerfMetricName.FP, info.startTime).complete()
        // performanceVital.complete()
      },
      'first-paint',
      true
    )
  }
}
