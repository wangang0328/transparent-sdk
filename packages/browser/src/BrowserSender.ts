import { BuildedData, Sender, type SendOptions } from '@wa-dev/transparent-sdk-core'

// 发送监控数据到服务器
// 优先使用sendBeacon
const defaultOptions: SendOptions = {
  maxTime: 5 * 1000,
  maxLen: 10,
  concurrentSendCount: 4,
  retryCount: 2
}

export class BrowserSender extends Sender {
  private isSupportBeacon: boolean = typeof navigator.sendBeacon === 'function'

  private visibilityState: 'hidden' | 'visible' = 'visible'

  constructor(
    private url: string,
    options: Partial<SendOptions> = {}
  ) {
    const targetOptions = { ...defaultOptions, ...options }
    // 监听
    super(targetOptions)
    this.listenVisibility()
  }

  sendByBeacon(data: string) {
    const res = navigator.sendBeacon(this.url, data)
    if (res) {
      return Promise.resolve('')
    }
    return Promise.reject('')
  }

  sendByXHR(data: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const XMLHttpRequest = window.oXMLHttpRequest || window.XMLHttpRequest
      const xhr = new XMLHttpRequest()
      const onLoadFn = () => {
        xhr.removeEventListener('loadend', onLoadFn)
        // xhr 如果请求失败 status 的值是0
        if (xhr.status >= 400 || xhr.status === 0) {
          reject('')
        } else {
          resolve('')
        }
      }
      xhr.addEventListener('loadend', onLoadFn)
      xhr.open('POST', this.url)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send(data)
    })
  }

  async ajax(data: BuildedData[]) {
    const dataStr = JSON.stringify({ datas: data })
    if (this.isSupportBeacon && this.visibilityState === 'hidden') {
      // 页面隐藏/关闭，清空缓存的数据，使用senBeacon 上报
      return this.sendByBeacon(dataStr)
    }
    return this.sendByXHR(dataStr)
  }

  listenVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.visibilityState = 'hidden'
        // 清空
        this.clearALl()
      } else {
        this.visibilityState = 'visible'
      }
    })
  }
}
