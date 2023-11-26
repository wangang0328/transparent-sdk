// 代理服务

import { getCurrentTime } from './time'

export type OnResponse = (metirc: Partial<HttpMetirc>) => void
export type OnRequest = (v: RequestInit | XMLHttpRequest) => void

// TODO： 要抹平这两个api 的差异，

export interface HttpMetirc {
  method: string
  url: string
  body: any
  requestTime: number
  responseTime: number
  status: number
  statusText: string
  response: any
}

const onRequestCbs: any[] = []
const onResponseCbs: any[] = []

const notify = (list: (OnRequest | OnResponse)[], data: any) => {
  list.forEach((cb) => cb(data))
}

let isAlreadyProxy = false
const proxyXHR = () => {
  function Xhr() {
    const httpMetirc: Partial<HttpMetirc> = {}
    const xhr = new XMLHttpRequest() as any
    const { send, open } = xhr
    xhr.open = (...pars: any[]) => {
      const [method, url] = pars
      httpMetirc.method = method
      httpMetirc.url = url
      return open.apply(xhr, pars)
    }

    xhr.send = (body: any) => {
      httpMetirc.requestTime = getCurrentTime()
      httpMetirc.body = body
      // 可以在此挂载一些信息，如请求头 setRequestHeader(key, value)
      notify(onRequestCbs, xhr)
      return send.call(xhr, body)
    }

    xhr.addEventListener('onloadend', () => {
      const { response, status, statusText } = xhr
      httpMetirc.status = status
      httpMetirc.response = response
      httpMetirc.statusText = statusText
      httpMetirc.responseTime = getCurrentTime()
      notify(onResponseCbs, httpMetirc)
    })

    return xhr
  }
  const oXHR = window.oXMLHttpRequest
  Xhr.UNSENT = oXHR.UNSENT
  Xhr.OPENED = oXHR.OPENED
  Xhr.HEADERS_RECEIVED = oXHR.HEADERS_RECEIVED
  Xhr.LOADING = oXHR.LOADING
  Xhr.DONE = oXHR.DONE
  // @ts-ignore
  window.XMLHttpRequest = Xhr
}

const proxyFetch = () => {
  window.fetch = async (input: any, init: any) => {
    const httpMetirc: Partial<HttpMetirc> = {}
    const oFetch = window.oFetch
    notify(onRequestCbs, init)
    httpMetirc.url = typeof input === 'string' ? input : input.url
    httpMetirc.method = init.method
    httpMetirc.requestTime = getCurrentTime()
    // 请求体
    httpMetirc.body = init.body

    return oFetch.call(window, input, init).then(async (response) => {
      // response 是一个stream 对象，只能读取一次，读取完了就没了， 所以clone一个新的，防止后续报错 body stream already read 问题
      const cloneRes = response.clone()
      httpMetirc.response = await cloneRes.text()
      httpMetirc.responseTime = getCurrentTime()
      httpMetirc.status = cloneRes.status
      httpMetirc.statusText = cloneRes.statusText
      notify(onResponseCbs, httpMetirc)
      return response
    })
  }
}

export const proxyHttp = (
  onRequest?: null | ((v: RequestInit | XMLHttpRequest) => void | null),
  onResponse?: (metirc: Partial<HttpMetirc>) => void
) => {
  onRequest && onRequestCbs.push(onRequest)
  onResponse && onResponseCbs.push(onResponse)
  if (isAlreadyProxy) {
    // 已经做了代理，后面不重复代理，监听的函数缓存
    return
  }
  window.oXMLHttpRequest = XMLHttpRequest
  window.oFetch = fetch
  isAlreadyProxy = true

  proxyXHR()
  proxyFetch()
}
