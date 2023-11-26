import { ErrorMechanismType } from './constants'

export interface ExceptionPositionInfo {
  // 文件地址
  fileUrl: string
  // 列
  col: number
  // 行
  row: number
}

export interface ExceptionFrame extends ExceptionPositionInfo {
  functionName: string
}

/**
 * 格式化之后，异常数据的结构体
 */
export interface ExceptionMetirc {
  /**
   * 上报错误归类
   */
  mechanism: ErrorMechanismType
  /**
   * 错误信息
   */
  value?: string
  /**
   * 错误类型
   */
  type: string | 'unknown'

  /**
   * 错误堆栈, string 表示当前行解析失败了，将源数据放入其中
   */
  stackTrace?: (ExceptionFrame | string)[]

  // TODO: pageInformation breadCrumbs 在errorSenderHandelr 统一封装
  pageInformation?: any
  // behavior stack
  breadcrumbs?: any[]

  // 错误的标示码
  errorUid: string
  // 附带信息
  meta?: Record<string, any>
}
