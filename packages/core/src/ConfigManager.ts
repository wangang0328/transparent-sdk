import type { Config } from './interface'

type CallbackFn = (config: Partial<Config>) => void

export class ConfigManager {
  private config: Partial<Config> = {}
  private onChangeCbList: CallbackFn[] = []
  private onReadyCbList: CallbackFn[] = []
  // 是否拉取完成
  private fetchStatus: 'fetching' | 'fetched' | 'beforeFetch' = 'beforeFetch'

  // 远程拉取配置信息
  // eslint-disable-next-line @typescript-eslint/ban-types
  private async fetchRemote(fetchRemoteConfig?: Function) {
    // TODO: 可以配置路由/自定义函数等方式
    try {
      if (typeof fetchRemoteConfig === 'function') {
        this.fetchStatus = 'fetching'
        const res = await fetchRemoteConfig()
        this._setConfig(res)
      }
    } catch (error) {
    } finally {
      this.fetchStatus = 'fetched'
      // 如果不远程获取参数，可以让 onReady能挂载上
      Promise.resolve().then(() => {
        this.notify(this.onReadyCbList)
      })
    }
  }

  private _setConfig(c: Partial<Config>) {
    this.config = { ...this.config, ...c }
    this.notify(this.onChangeCbList)
  }

  setConfig(c: Partial<Config>) {
    // 简单合并配置信息
    this._setConfig(c)
    if (this.fetchStatus === 'beforeFetch') {
      this.fetchRemote(c.fetchRemoteConfig)
    }
  }

  getConfig() {
    return this.config
  }

  onReady(cb: CallbackFn) {
    if (!this.onReadyCbList.find((c) => c === cb)) {
      this.onReadyCbList.push(cb)
    }
  }

  onChange(cb: CallbackFn) {
    if (!this.onChangeCbList.find((c) => c === cb)) {
      this.onChangeCbList.push(cb)
    }
  }

  notify(list: CallbackFn[]) {
    list.forEach((cb) => {
      cb(this.config)
    })
  }
}
