/**
 * 获取调用栈信息
 */
export const extractCallStack = () => {
  // 第一个是Error， 第二个 是 extrackCallStack 函数
  const getStack = (stackStr: string) => stackStr.split('\n').slice(2).join('\n')
  try {
    const obj = {} as any
    // 如果不支持 captureStackTrace catch可以捕获信息，也可以获取当前的调用栈
    Error.captureStackTrace(obj)
    return getStack(obj.stack || '')
  } catch (error) {
    return getStack(error.stack || '')
  }
}

const errorLineReg = /^(?:\s*)at\s(.*?)\s\((.*?)(?::(\d+))?(?::(\d+))?\)\s*$/i

export const parseErrorLine = (lineStr: string) => {
  const matches = lineStr.match(errorLineReg)
  if (matches === null) {
    return lineStr
  }
  const [, functionName, fileUrl, row, col] = matches
  return {
    fileUrl,
    functionName,
    row: parseInt(row) || -1,
    col: parseInt(col) || -1
  }
}

// 解析错误堆栈的数量，超过10个不再处理
const STACK_LENGTH_LIMIT = 10

// 解析错误堆栈信息
export const parseErrorStack = (err: Error, lengthLimit: number = STACK_LENGTH_LIMIT) => {
  const stackStr = err.stack || ''
  // 第一行数据是错误 message 信息
  const stackList = stackStr.split('\n').slice(1)

  // string 是原始数据，表示没有解析成功
  const parsedInfos = stackList.slice(0, lengthLimit).map((lineStr) => parseErrorLine(lineStr))
  return parsedInfos
}

/**
 * 对每一个错误详情生成一串编码，可以上报前过滤掉相同错误，也方便服务端进行错误归类
 */
export const genErrorId = (errInfo: string) => {
  // 因为考虑到包的体积，没有使用三方库，服务端可以根据编码的错误id 自行处理生成
  // 转成base64格式的， encodeURIComponent，编码中文， btoa不能处理中文
  return btoa(encodeURIComponent(errInfo))
}

/**
 * 包装异步方法，返回详细调用栈信息追踪
 */
export function wrapTryAsyncMethod(originMethod: any) {
  const stackCallPath = extractCallStack()
  function wrapped(...args: any[]) {
    try {
      // 此时要去掉 wrapped 和 trackSyncMethod
      return originMethod.apply(this, args)
    } catch (error) {
      // 第一个调用栈信息是 trackSyncMethod
      error.stack = stackCallPath.split('\n').slice(1).join('\n')
      throw error
    }
  }
  return wrapped
}
