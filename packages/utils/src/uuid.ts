/**
 * 生成uuid
 * @param len 长度
 */
export const uuid = (len = 28) => {
  // 以当前的时间戳作为开头，确保唯一性
  let str = Date.now().toString(36)
  if (str.length >= len) {
    return str.slice(0, len)
  }

  while (str.length < len) {
    const randomStr = Math.floor(Math.random() * 10e16).toString(36)
    str = `${str}${randomStr}`
    if (str.length > len) {
      // 超出了长度，截取
      return str.slice(0, len)
    }
  }
  return str
}
