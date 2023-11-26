import { Builder, type RecordAny, Host } from '@wa-dev/transparent-sdk-core'
import { getCalibrateTime, uuid } from '@wa-dev/transparent-sdk-utils'

// TODO: url(如果是错误类型的时候，可以忽略该参数？) timestamp，runTime 这两个的值可能距离产生的事件时间偏高，
// 但仅限于加载时错误的情况，也就是有mini版本或者远程获取配置文件的时候，这种影响可以忽略？
interface BrowserBuildedData {
  // userId，有效期6个月
  uid: string
  // sessionid, 放到sessionStorage中
  sid: string

  // product id
  pid: string

  // url, 当前页面地址, 此时url 不准
  // 写个插件，监听 report report的时候插入url
  url: string

  // 时间戳，要校准
  timestamp: number

  // performance.now()
  timeFromRun: number

  // 宿主环境
  host: string

  netWork: null | any

  version: string

  sdkVersion: string
}

declare global {
  interface Navigator {
    connection: {
      // 网络信息
      effectiveType: '2g' | '3g' | '4g' | 'slow-2'
      // 往返时间， 表示从发送端发送数据开始，到发送端收到来自接收端的确认总共经历的时间。
      rtt: number
      // 带宽
      downlink: number
      // eslint-disable-next-line @typescript-eslint/ban-types
      addEventListener: Function
    }
  }
}

enum CachedKey {
  UID = '__TRANSPARENT_UID__',
  SID = '__TRANSPARENT_SID__'
}

// TODO: 限制 eventData 的具体数据类型
export class BrowserBuilder implements Builder<RecordAny, BrowserBuildedData> {
  private _uid: string

  private _sid: string

  private netWork: Omit<Navigator['connection'], 'addEventListener'> | null = null

  constructor(
    private pid: string,
    private version: string
  ) {
    // 获取 sid, uid
  }

  build(eventData) {
    return {
      data: eventData,
      sid: this.sid,
      pid: this.pid,
      uid: this.uid,
      url: location.href,
      timestamp: getCalibrateTime(),
      timeFromRun: performance.now(),
      host: Host.Browser,
      netWork: this.netWork,
      version: this.version,
      // TODO: 写死，replace替换
      sdkVersion: __SDK_VERSION__
    }
  }

  get uid() {
    if (this._uid) {
      return this._uid
    }
    this._uid = this.getId(localStorage, CachedKey.UID)
    return this._uid
  }

  get sid() {
    if (this._sid) {
      return this._sid
    }
    this._sid = this.getId(sessionStorage, CachedKey.SID)
    return this._sid
  }

  getId(storage: Storage, key: CachedKey) {
    let id = localStorage.getItem(key)
    if (id) {
      return id
    }
    id = uuid()
    localStorage.setItem(key, id)
    return id
  }

  initNetWork() {
    if (navigator.connection) {
      const { effectiveType, rtt, downlink } = navigator.connection
      // 支持
      this.netWork = { effectiveType, rtt, downlink }
      if (typeof navigator.connection.addEventListener === 'function') {
        navigator.connection.addEventListener('change', ({ target }) => {
          const { effectiveType, rtt, downlink } = target || {}
          this.netWork = { effectiveType, rtt, downlink }
        })
      }
    }
  }
}
