import { BrowserClient } from '../BrowserClient'
import { ReportEventClassify, type Plugin } from '@wa-dev/transparent-sdk-core'
import { type HttpMetirc, proxyHttp } from '../utils/http-proxy'
import { getCurrentTime } from '../utils'

// type BehaviorName = 'click' | 'urlChange' |
enum BehaviorName {
  CLICK = 'click',
  URL_CHANGE = 'urlChange',
  AJAX = 'ajax',
  SELF_EVENT = 'selfEvent'
}

interface BreadCrumbOptions {
  // 缓存的最大长度
  max?: number
}

// 点击事件行为内容
interface ClickValue {
  // 节点名称
  nodeName: string
  // 类名
  className: string
  // 内部text
  innerText: string
  innerHtml: string
}

// 请求资源内容信息
type HttpValue = Partial<Omit<HttpMetirc, 'response' | 'body'>>

interface UrlValue {
  // 上一个页面的路由
  oldUrl: string
  // 当前页面的路由
  currentUrl: string
}

interface Behavior<V extends Record<string, any> = Record<string, any>> {
  page: string
  name: BehaviorName
  timestamp: number
  value: V
}

const defaultOptions: BreadCrumbOptions = {
  max: 20
}

class BreadCrumb {
  private queue: Behavior[] = []
  private options: BreadCrumbOptions = defaultOptions

  constructor(o: BreadCrumbOptions = {}) {
    this.options = { ...this.options, ...o }
  }

  push(v: Behavior) {
    if (this.isMaxLen()) {
      // 已经到了最大值
      this.shift()
    }
    this.queue.push(v)
  }

  shift() {
    this.queue.shift()
  }

  get(length?: number) {
    return length === undefined ? this.queue : this.queue.slice(0, length)
  }

  clear() {
    this.queue = []
  }

  getLength() {
    return this.queue.length
  }

  private isMaxLen() {
    return this.getLength() >= this.options.max!
  }
}

// 单页面路由监听， hash 改变了，可以通过 hashchange 和popstate
// history模式 不能监听到pushState 和 replaceState
// 所以统一用 popState 监听， 然后自定义pushState 和 replaceState 事件

// 派发新事件
const wrapHistoryEvent = (type: keyof History) => {
  const o = history[type]
  return function (this: unknown, ...restPar) {
    const e = new Event(type)
    window.dispatchEvent(e)
    return o.apply(this, restPar)
  }
}

// 添加 pushState replaceState
const initHistoryEvent = () => {
  history.pushState = wrapHistoryEvent('pushState')
  history.replaceState = wrapHistoryEvent('replaceState')
}

// const proxyHistory = (handler) => {
//   window.addEventListener('replaceState', handler, true)
//   window.addEventListener('pushState', handler, true)
//   // window.addEventListener('popstate', handler, true)
// }

// const proxyHash = (handler) => {
//   // hash 改变会触发 popstate 和 hashchange， hashchange 会早于popstate， 可以统一监听 popstate
//   // TODO：后续做成动态的， 比如只监听 histor/hash，两个都监听
//   // window.addEventListener('hashchange', handler, true)
//   window.addEventListener('popstate', handler, true)
// }

const proxyUrlChange = (handler: EventListenerOrEventListenerObject) => {
  window.addEventListener('replaceState', handler, true)
  window.addEventListener('pushState', handler, true)
  window.addEventListener('popstate', handler, true)
}

const genBehaviorData = <T extends Record<string, any> = Record<string, any>>(name: BehaviorName) => {
  return {
    page: location.href,
    name,
    timestamp: getCurrentTime(),
    value: {}
  } as Behavior<T>
}

// 监听click事件
const initClick = (breadCrumb: BreadCrumb) => {
  const handler = (ev: MouseEvent) => {
    const targetDom = (ev.target || {}) as any
    const behaviorData = genBehaviorData<ClickValue>(BehaviorName.CLICK)
    const innerHtml = targetDom.innerHtml || ''
    const innerText = targetDom.innerText || ''
    behaviorData.value = {
      // 内部三个元素
      innerHtml: innerHtml.split('\n').slice(0, 3).join('\n'),
      innerText: innerText.split('\n').slice(0, 3).join('\n'),
      className: targetDom.className,
      nodeName: targetDom.nodeName
    }
    breadCrumb.push(behaviorData)
  }
  window.addEventListener('click', handler)
}

// 监听http请求
const initHttp = (breadCrumb: BreadCrumb) => {
  const handler = (data: Partial<HttpMetirc>) => {
    // 不上传 response 和 body
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { response, body, ...restData } = data
    // 判断
    const behaviorData = genBehaviorData<HttpValue>(BehaviorName.AJAX)
    behaviorData.value = restData
    breadCrumb.push(behaviorData)
  }
  proxyHttp(null, handler)
}

const initUrl = (breadCrumb: BreadCrumb) => {
  initHistoryEvent()

  const handler = () => {
    const behaviorData = genBehaviorData<UrlValue>(BehaviorName.URL_CHANGE)
    behaviorData.value = {
      // TODO: 实现之前的路由
      oldUrl: '',
      currentUrl: location.href
    }
    breadCrumb.push(behaviorData)
  }
  proxyUrlChange(handler)
}

// 监听用户行为，
// 监听的事件：点击，路由跳转， ajax请求， 用户自定义事件
// 最多保存 一定的数量，超出时，最早的行为出队列
export const BreadCrumbPlugin = (): Plugin<BrowserClient> => {
  const breadCrumb = new BreadCrumb()
  return {
    name: 'BreadCrumbPlugin',
    setup: (client) => {
      client.on('init', () => {
        initClick(breadCrumb)
        initHttp(breadCrumb)
        initUrl(breadCrumb)
      })
      // TODO: 判断添加breadCrumb
      client.on('report', (v) => {
        if (v.classify === ReportEventClassify.EXCEPTION) {
          // 异常 添加行为记录,只能在report的时候添加，否则可能导致行为记录不准
          v.data.behavior = breadCrumb.get()
        }
      })
    }
  }
}
