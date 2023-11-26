import { type PerformancePlugin, PerfMetricName, WhenType } from './interface'
import { observer } from './utils'

/**
 * largest-contentful-paint
 * 浏览器会多次报告LCP，一般真正的LCP 是用户交互前最近一次报告的LCP，
 * 因为交互往往会改变可见的内容
 */
export const LCPPlugin: PerformancePlugin = {
  name: 'LCPPlugin',
  when: WhenType.Immediate,
  apply: (performanceVital) => {
    let timer: NodeJS.Timeout | null = null
    let obIns: PerformanceObserver | null = null
    const completeCollect = () => {
      // 用户发生了点击，不再收集上报信息
      performanceVital.complete()
      !!obIns && obIns.disconnect()
      obIns = null
      window.removeEventListener('click', completeCollect)
    }
    window.addEventListener('click', completeCollect, { once: true })
    observer(
      'largest-contentful-paint',
      (entryList, observerIns) => {
        obIns = observerIns
        const info = entryList[0] || { startTime: 0 }
        performanceVital.addData(PerfMetricName.LCP, info.startTime)
        // 如果一直没有点击的极限情况
        // 监听到 lcp, 5s后触发完成，
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        timer = setTimeout(completeCollect, 10000)
      },
      '',
      true
    )
  }
}
