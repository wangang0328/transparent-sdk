/**
 *
 * @param type 监听的类型 同 PerformanceObserverInit 的 type
 * @param name 是否根据名字过滤，如果不传，不过滤 entryList.getEntriesByName('')
 * @param once 是否只监听一次，true: 如果监听到了数据 会手动 disconnect
 */
export const observer = (
  type: string,
  cb: (list: PerformanceEntry[], ob: PerformanceObserver) => void,
  name: string = '',
  once: boolean = false
) => {
  const observerIns = new PerformanceObserver((entryList) => {
    if (name) {
      cb(entryList.getEntriesByName(name), observerIns)
    } else {
      cb(entryList.getEntries(), observerIns)
    }
    // 只监听一次
    if (once) {
      observerIns.disconnect()
    }
  })

  observerIns.observe({ type, buffered: true })
}
