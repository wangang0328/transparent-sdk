import { ErrorMechanismType } from '../constants'
import { ExceptionMetirc } from '../interface'

/**
 * 获取错误类型
 */
export const getErrorTypeByEvent = (
  e: ErrorEvent | Event
): ErrorMechanismType.CORS | ErrorMechanismType.JS | ErrorMechanismType.RESOURCE => {
  const isJsErr = e instanceof ErrorEvent
  if (!isJsErr) {
    return ErrorMechanismType.CORS
  }
  return (e as ErrorEvent).message === 'Script error.' ? ErrorMechanismType.CORS : ErrorMechanismType.JS
}

/**
 * 生成默认的上报异常数据
 */
export const genReportDefaultExceptionData = <T extends ExceptionMetirc = ExceptionMetirc>(
  mechanism: ErrorMechanismType,
  errorUid: string,
  value = '',
  type = 'unknown',
  meta: Record<string, any> = {},
  stackTrace: any[] = []
) => {
  return {
    mechanism,
    value,
    type: type || 'unknown',
    stackTrace,
    errorUid,
    meta
  } as T
}
