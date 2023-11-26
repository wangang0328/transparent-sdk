import { PerformanceVital } from './index'

export enum PerfMetricName {
  FP = 'first-paint',
  FCP = 'first-contentful-paint',
  LCP = 'largest-ccontentful-paint',
  FID = 'first-input-delay',
  CLS = 'cumulative-layout-shift',
  NT = 'navigation-timing',
  FMP = 'first-meaningful-paint',
  TTI = 'total-time-interactive',
  TBT = 'total-block-time'
}

export type PerfMetricValue = number | NavigationTimingVal

export type PerfDataMetric = Record<PerfMetricName, PerfMetricValue>

// 触发上报初始化的时机
// export type WhenType = 'immediate' | 'afterLoad'

export enum WhenType {
  Immediate = 'immediate',
  AfterLoad = 'afterLoad'
}

export interface PerformancePlugin {
  // 当前操作的 plugin 名称，用来判断是否所有的 plugin 都触发完了，
  // 如果都触发完就开始上报
  name: string
  // 触发时机
  when: WhenType
  apply: (v: PerformanceVital) => void
}

// 关键时间段
export interface NavigationTimingVal {
  Redirect: number
  // DNS 解析耗时
  DNS: number
  // TCP链接
  TCP: number
  // SSL 安全连接
  SSL: number
  // 首包
  TTFB: number
  // 内容传输耗时
  Trans: number
  // dom解析耗时
  DomParse: number
  // 资源加载(所有)耗时
  ResLoad: number
  // 原始资源数据
  Origin: PerformanceNavigationTiming | PerformanceTiming
}
