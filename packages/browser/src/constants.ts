// 错误类型
export enum ErrorMechanismType {
  // js 运行报错
  JS = 'js',
  RESOURCE = 'resource',
  UNHANDLED_REJECTION = 'unhandledrejection',
  // http请求错误
  HTTP = 'http',
  // 跨域脚本执行错误
  CORS = 'cors',
  VUE = 'vue',
  REACT = 'react'
}
