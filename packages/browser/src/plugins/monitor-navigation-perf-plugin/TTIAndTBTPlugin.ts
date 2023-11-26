// total time interactive 即从页面加载开始到页面处于完全可交互状态所花费的时间
import { type PerformancePlugin, PerfMetricName, WhenType } from './interface'
import { observer } from './utils'
import { getPerfTiming } from '../../utils'

// 计算方式
// 1. 从起始点（一般选择 FCP 或 FMP）时间开始，向前搜索一个不小于 5s 的静默窗口期。静默窗口期：窗口所对应的时间内没有 Long Task，且进行中的网络请求数不超过 2 个。
// 2. 找到静默窗口期后，从静默窗口期向后搜索到最近的一个 Long Task，Long Task 的结束时间即为 TTI。
// 3. 如果没有找到 Long Task，以起始点时间作为 TTI。
// 4. 如果 2、3 步骤得到的 TTI < DOMContentLoadedEventEnd，以 DOMContentLoadedEventEnd 作为TTI

const getLongTasks = (): Promise<PerformanceEntryList> => {
  // 获取longTask
  return new Promise((resolve) => {
    // 已经延迟10s初始化了
    // 如果1s内一直没有触发长任务，那么不再监听，回传数据
    let timer: NodeJS.Timeout | null = null
    timer = setTimeout(() => {
      timer = null
      resolve([])
    }, 1000)

    const cb = (list: PerformanceEntryList) => {
      if (timer) {
        // 十秒内触发了 longTask，去掉定时器
        clearTimeout(timer)
        timer = null
      }
      resolve(list)
    }

    observer('longtask', cb, '', true)
  })
}

const genTTI = (fcp: number, longtasks: PerformanceEntry[], resources: PerformanceResourceTiming[]) => {
  // 1. 没有长任务
  if (!longtasks.length) {
    return fcp
  }

  // 静默窗口：定义窗口(5s内)所对应的时间内没有 Long Task，且进行中的网络请求数不超过 2 个
  // 获取长任务时间之间间隔大于 5s 的时间段
  const idleDurations: [number, number][] = []
  let lastEndTime = fcp
  longtasks.forEach(({ startTime, duration }) => {
    if (startTime - lastEndTime >= 5000) {
      // 5s 内没有长任务
      idleDurations.push([lastEndTime, startTime])
    }
    lastEndTime = startTime + duration
  })

  // 没有找到静默的窗口
  if (!idleDurations.length) {
    // 没有符合空闲任务时间段，就找最后一个长任务的 时间段
    const lastTask = longtasks[longtasks.length - 1]
    return lastTask.startTime + lastTask.duration
  }

  for (let i = 0; i < idleDurations.length; i++) {
    const [idleStartTime, idleEndTime] = idleDurations[i]
    // 当前空任务窗口的请求资源数量
    let currentIdleWindowRequestCount = 0
    resources.forEach((resourceInfo) => {
      if (!(idleEndTime < resourceInfo.startTime || resourceInfo.responseEnd < idleStartTime)) {
        // 和空闲任务窗口有交集
        ++currentIdleWindowRequestCount
      }
    })

    if (currentIdleWindowRequestCount <= 2) {
      // 找到了
      return idleStartTime
    }
  }

  // 没有找到符合条件的，返回最后一个时间的长任务
  const lastTask = longtasks[longtasks.length - 1]
  return lastTask.startTime + lastTask.duration
}

const getTTIAndTBT = async () => {
  // 获取 fcp 时间点
  const [fcpInfo] = performance.getEntriesByName('first-contentful-paint')
  const fcp = fcpInfo ? fcpInfo.startTime : 0
  const longtasks = await getLongTasks()
  // 过滤掉开始时间早于fcp的数据
  const filtedLongtasks = longtasks.filter(({ startTime }) => startTime > fcp)

  // 获取资源
  const resources = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(
    ({ responseEnd }) => responseEnd || 0 > fcp
  )

  // 找到第一个安静窗口
  const tti = genTTI(fcp, filtedLongtasks, resources)

  const { domContentLoadedEventEnd } = getPerfTiming()
  const targetTTI = tti < domContentLoadedEventEnd ? domContentLoadedEventEnd : tti
  // 获取TBT
  const TBT = filtedLongtasks.reduce((totalTime, { startTime, duration }) => {
    return startTime < targetTTI ? totalTime + duration : totalTime
  }, 0)
  return [targetTTI, TBT]
}

export const TTIAndTBTPlugin: PerformancePlugin = {
  name: 'fcp',
  when: WhenType.AfterLoad,
  apply: (performanceVital) => {
    setTimeout(async () => {
      const [tti, tbt] = await getTTIAndTBT()
      performanceVital.addData(PerfMetricName.TTI, tti)
      performanceVital.addData(PerfMetricName.TBT, tbt)
      performanceVital.complete()
    }, 10000)
  }
}
