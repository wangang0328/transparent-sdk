export interface Plugin<T = any> {
  name: string
  setup: (client: T) => void
  teardown?: () => void
}

export interface Config<P = any> {
  // 获取远程数据的配置信息
  fetchRemoteConfig?: any
  plugins?: ((options?: any) => Plugin<P>)[]
  /**
   * 接口地址
   */
  apiUrl: string
  version: string
  pid: string
  [key: string]: any
}

/**
 * 上报事件类型
 */
export enum ReportEventClassify {
  /**
   * 性能相关
   */
  PERFORMANCE = 'PERFORMANCE',

  /**
   * 错误
   */
  EXCEPTION = 'EXCEPTION',

  /**
   * 埋点
   */
  TRACKING = 'TRACKING',

  /**
   * pv 访问数据
   */
  PV = 'PV',

  /**
   * api请求数据
   */
  API = 'API',

  /**
   * 用户自定义
   */
  CUSTOM = 'CUSTOM'
}

export interface DimensionStructure {
  // userId, 本次用户登陆的id
  uid: string
  // 回话id，刷新浏览器后重新生成
  sessionId: string
  // 产品id
  pid: string
  // 产品版本
  version: string
  // 环境信息
  enviroment: string
}

export type RecordAny = Record<string, any>
/**
 * 上报事件的数据类型
 */
export interface ReportEvent<T extends RecordAny = RecordAny> {
  /**
   * 上报类型
   */
  classify: ReportEventClassify
  data: T
}

/**
 * build 后的数据类型
 */
export type BuildedData<T extends RecordAny = RecordAny, O extends RecordAny = RecordAny> = {
  [key in keyof O]: O[key]
} & {
  data: ReportEvent<T>
}

export enum Host {
  Browser = 'browser',
  Node = 'node',
  WX = 'wx',
  App = 'app'
}
