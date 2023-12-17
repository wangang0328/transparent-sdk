import { type Config, type SendOptions } from '@wa-dev/transparent-sdk-core'
import { diffTime } from '@wa-dev/transparent-sdk-utils'
import { BrowserBuilder } from './src/BrowserBuilder'
import { BrowserClient } from './src/BrowserClient'
import { BrowserConfigManager } from './src/BrowserConfigManager'
import { BrowserSender } from './src/BrowserSender'
import { MonitorNavigationPerfPlugin } from './src/plugins/monitor-navigation-perf-plugin'

interface BrowserConfig extends Config<BrowserClient> {
  senderOptions?: Partial<SendOptions>
}

const defaultPlugins = [MonitorNavigationPerfPlugin]

// 校准本地时间
const calibrateTime = (url: string) => {
  fetch(url, { method: 'POST' }).then((res) => {
    // 由于浏览器限制，响应头的 Date 日期不能被js获取，需要添加响应头 Access-Control-Expose-Headers Date
    // Access-Control-Expose-Headers 控制暴露的开关
    // Date 是服务器发送资源时服务器的时间，会有一定的误差(还会有一个单程传输耗时的误差)
    // 服务端可以返回处理耗时的时长，然后通过(ttfb - 处理耗时)/2
    diffTime(res.headers.get('date'))
  })
}

export const createClient = (config: BrowserConfig) => {
  const builder = new BrowserBuilder(config.pid, config.version)
  const sender = new BrowserSender(config.apiUrl, config.senderOptions)
  const configManager = new BrowserConfigManager()
  const client = new BrowserClient(builder, configManager, sender)
  const { plugins, ...restConfig } = config
  const normaledPlugins = [...defaultPlugins, ...(plugins || [])]
  console.log(normaledPlugins)
  calibrateTime(config.apiUrl)
  // 启动插件
  // TODO：插件根据 name 去重
  normaledPlugins.map((fn) => fn()).forEach(({ setup }: any) => setup(client))
  client.init(restConfig)
  return client
}
