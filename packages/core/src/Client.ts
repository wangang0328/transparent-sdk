import { Builder } from './Builder'
import { ConfigManager } from './ConfigManager'
import { Sender } from './Sender'
import type { Config, RecordAny, ReportEvent, BuildedData } from './interface'
import { ReportEventClassify } from './interface'

/**
 * 处理类的生命周期钩子
 */
type HandledCallback<T = any> = (data: T) => void | T | false
type VoidCallback = () => void
type ConfigCallback = (config: Config) => Config | void

type HookKey =
  | 'init'
  | 'beforeConfig'
  | 'config'
  | 'start'
  | 'report'
  | 'beforeBuild'
  | 'build'
  | 'beforeSend'
  | 'send'
  | 'beforeDestroy'

export class Client {
  // 待上报的数据
  private preStartQueue: ReportEvent[] = []

  // 是否开启上报
  private started: boolean = false

  // 是否准备好数据（如：远程拉取配置信息）
  private ready: boolean = false

  private pluginObservers: Partial<Record<HookKey, any[]>> = {}

  constructor(
    private builder: Builder,
    private configManager: ConfigManager,
    private sender: Sender
  ) {}

  // 初始化
  init(config: Config) {
    this.emit('init')

    const handledBeforeConfig = this.hookCallback(this.emit('beforeConfig', config), config)
    // 传入的用户配置
    this.configManager.setConfig(handledBeforeConfig)
    this.configManager.onReady((resConfig) => {
      const targetConfigs = this.hookCallback(this.emit('config', resConfig), resConfig)
      // 设置最新的值
      this.configManager.setConfig(targetConfigs)
      this.ready = true
      this.flushPreStartDataQueue()
    })
    return this
  }

  // 开启上报
  start() {
    this.started = true
    this.emit('start')
    this.flushPreStartDataQueue()
  }

  // 插件监听到数据开始上报
  report(classify: ReportEventClassify, eventData: ReportEvent['data']) {
    const data = {
      classify,
      data: eventData
    }
    if (!this.started || !this.ready) {
      // 最多预存200条数据，防止一直没有开启上报，导致内存泄漏
      this.preStartQueue.length < 200 && this.preStartQueue.push(data)
      return
    }
    console.log('report---data---', data)
    // report 和 beforeBuild 做的事情目前来说的话，基本一样
    // report
    let reportEvent = this.hookHandled(this.emit('report', data), data)
    if (reportEvent === false) return

    // beforeBuild
    reportEvent = this.hookHandled(this.emit('beforeBuild', reportEvent), reportEvent)
    if (reportEvent === false) return

    let buildData: BuildedData<RecordAny, RecordAny> | boolean = this.builder.build(reportEvent)
    buildData = this.hookHandled(this.emit('build', buildData), buildData)
    if (buildData === false) return

    // TODO：beforeSend 是否考虑加一些请求头响应头
    // TODO: 放到sender里面去，在真正发送前去回调
    const sendData = this.hookHandled(
      this.emit('beforeSend', buildData as BuildedData<RecordAny, RecordAny>),
      buildData
    )

    if (sendData === false) return
    this.sender.send(sendData)
    this.emit('send')
  }

  destroy() {
    this.emit('beforeDestroy')
    // TODO: 其他操作
  }

  flushPreStartDataQueue() {
    if (this.ready && this.started) {
      this.preStartQueue.forEach(({ classify, data }) => {
        this.report(classify, data)
      })
      this.preStartQueue = []
    }
  }

  // 初始化
  on(hook: 'init', cb: VoidCallback): void

  // 处理config配置信息前
  on(hook: 'beforeConfig', cb: ConfigCallback): void

  // 开启上报，开启上报时，配置信息可能还没完成
  on(hook: 'start', cb: VoidCallback): void

  // 配置信息处理完成包括从远程拉取配置信息，处理配置信息和start是并行的
  on(hook: 'config', cb: ConfigCallback): void

  // monitor 监听到了数据，将数据传给client
  // 此时config可能还没配置完成
  // 处理类，返回无效值可中断后续流程
  on(hook: 'report', cb: HandledCallback<ReportEvent>): void

  // 包装平台数据之前
  // 处理类，返回无效值可中断后续流程
  on(hook: 'beforeBuild', cb: HandledCallback<ReportEvent>): void

  // 包装平台相关数据后
  // 处理类，返回无效值可中断后续流程
  on(hook: 'build', cb: HandledCallback<BuildedData>): void

  // 数据发送前
  // 处理类，返回无效值可中断后续流程
  on(hook: 'beforeSend', cb: HandledCallback<BuildedData>): void

  // 数据发送之后
  on(hook: 'send', cb: VoidCallback): void

  // client实例销毁前
  on(hook: 'beforeDestroy', cb: VoidCallback): void

  on(hook: HookKey, cb: any) {
    if (this.pluginObservers[hook]) {
      this.pluginObservers[hook]!.push(cb)
    } else {
      this.pluginObservers[hook] = [cb]
    }
  }

  emit(hook: 'init'): ReturnType<VoidCallback>[]
  emit(hook: 'beforeConfig', initConfig: Config): ReturnType<ConfigCallback>[]
  emit(hook: 'start'): ReturnType<VoidCallback>[]
  emit(hook: 'config', initedConfig: Partial<Config>): ReturnType<ConfigCallback>[]
  emit(hook: 'report', data: ReportEvent): ReturnType<HandledCallback<ReportEvent>>[]
  emit(hook: 'beforeBuild', data: ReportEvent): ReturnType<HandledCallback<ReportEvent>>[]
  emit(hook: 'build', data: BuildedData): ReturnType<HandledCallback<BuildedData>>[]
  emit(hook: 'beforeSend', data: BuildedData): ReturnType<HandledCallback<BuildedData>>[]
  emit(hook: 'send'): ReturnType<VoidCallback>[]
  emit(hook: 'beforeDestroy'): ReturnType<VoidCallback>[]

  emit(hook: HookKey, ...restPar: any[]) {
    const cbs = this.pluginObservers[hook] || []
    // 生命周期钩子分为 处理类/回调类
    // 处理类：report, beforeBuild, build, beforeSend 返回的值是false，可终止后续的执行流程
    // eslint-disable-next-line prefer-spread
    const results = cbs.map((cb) => cb.apply(null, restPar))
    return results
  }

  // 处理类回调结果的计算，如果有无效值，返回null
  private hookHandled<T = any>(results: any[], defaultData?: T) {
    if (results.findIndex((v) => v === false) > -1) {
      return false
    }
    return this.hookCallback<T>(results, defaultData)
  }

  /**
   * 回调类结果数据的处理，返回的是无效值的话，跳过，
   */
  private hookCallback<T = any>(results: any[], defaultData?: T) {
    const effectiveResult = results.filter((r) => !!r)
    if (effectiveResult.length || defaultData === undefined) {
      return Object.assign({}, ...effectiveResult)
    }
    return defaultData
  }
}
