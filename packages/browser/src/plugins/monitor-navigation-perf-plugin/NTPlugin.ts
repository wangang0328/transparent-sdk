import { PerfMetricName, type PerformancePlugin, type NavigationTimingVal, WhenType } from './interface'
import { getPerfTiming } from '../../utils'

const resolveTiming = (timing: PerformanceNavigationTiming | PerformanceTiming): NavigationTimingVal => {
  const {
    redirectStart,
    redirectEnd,
    domainLookupStart,
    domainLookupEnd,
    connectEnd,
    connectStart,
    // 0 表示 非 https
    secureConnectionStart,
    requestStart,
    responseStart,
    responseEnd,
    domInteractive,
    domContentLoadedEventStart,
    loadEventStart
  } = timing

  return {
    Redirect: redirectEnd - redirectStart,
    DNS: domainLookupEnd - domainLookupStart,
    TCP: connectEnd - connectStart,
    // TODO：不准？
    SSL: secureConnectionStart > 0 ? connectEnd - secureConnectionStart : 0,
    TTFB: responseStart - requestStart,
    Trans: responseEnd - responseStart,
    DomParse: domInteractive - responseEnd,
    // TODO： 不准？
    ResLoad: loadEventStart - domContentLoadedEventStart,
    Origin: timing
  }
}

export const NTPlugin: PerformancePlugin = {
  name: 'NTPlugin',
  when: WhenType.AfterLoad,
  apply: (performanceVital) => {
    // const timeing = getPerfTiming()
    // 过个 5s 获取内容
    setTimeout(() => {
      const timing = getPerfTiming()
      performanceVital.addData(PerfMetricName.NT, resolveTiming(timing)).complete()
    }, 5000)
  }
}
