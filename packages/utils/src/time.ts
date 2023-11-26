let diff = 0

export const diffTime = (date: string) => {
  if (!date) {
    return
  }
  const inDiff = Date.now() - new Date(date).getTime()
  diff = inDiff
}

/**
 * 获取校准后的时间
 * 在客户端使用，服务器不需要调用
 */
export const getCalibrateTime = () => {
  return Date.now() - diff
}
