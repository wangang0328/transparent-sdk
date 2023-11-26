// 性能相关

export const getPerfTiming = () => {
  const timings = performance.getEntriesByType('navigation')
  return timings.length ? (timings[0] as PerformanceNavigationTiming) : performance.timing
}
