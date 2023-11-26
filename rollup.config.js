import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import json from '@rollup/plugin-json'
import terser from '@rollup/plugin-terser'
import tsPlugin from 'rollup-plugin-typescript2'
import replacePlugin from '@rollup/plugin-replace'

// TODO: package.json 暂未处理

// mjs 使用 import，esm 环境下，不能使用 require，createRequire 它可以创建一个require函数
// import.meta.url 当前模块文件的绝对路径
const require = createRequire(import.meta.url)

// 为什么不直接使用 __dirname ?
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, process.env.TARGET)
const inlineFormats = process.env.FORMATS ? process.env.FORMATS.split('_') : null
const resolve = (p) => path.resolve(packageDir, p)
// 包的 package.json 路径
const pkg = require(resolve('package.json'))
const buildOptons = pkg.buildOptions || {}
const name = buildOptons.filename || path.basename(packageDir)

const defaultPackageFormats = ['cjs', 'esm']
const packageFormats = inlineFormats || buildOptons.format || defaultPackageFormats
// if (!buildOptons) {
//   console.error(
//     `please in ${process.env.TARGET} package.json add "buildOptions" options`
//   )
//   process.exit(1)
// }

// 打包后的dir
const distDir = path.resolve(__dirname, 'dist')
const resolveDist = (p) => path.resolve(distDir, p)
// 定义输出类型对应的编译项
const outuptConfig = {
  esm: {
    dir: resolveDist(`${name}/es`),
    // name: 'TransparentClient',
    format: 'esm',
    // 保留模块结构
    preserveModules: true,
    // 将保留的模块放在根级别的此路径下
    preserveModulesRoot: resolveDist(`${name}/es/browser/src`)
  },
  umd: {
    dir: resolveDist(`${name}/dist`),
    name: buildOptons.name || name,
    format: 'umd'
  },
  cjs: {
    dir: resolveDist(`${name}/lib`),
    // name: 'TransparentClient',
    format: 'cjs'
  }
}

const createConfig = (format, output, plugins) => {
  // 是否输出声明文件
  // const shouldEmitDeclarations = !!pkg.types
  // 是否压缩 TODO：
  const minifyPlugin = format === 'en' ? [terser()] : []
  return {
    input: resolve('src/index.ts'),
    output,
    external: [
      ...['path', 'fs', 'os', 'http'],
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [...minifyPlugin, ...plugins, replacePlugin({ __SDK_VERSION__: `'${pkg.version}'` }), tsPlugin(), json()]
  }
}

const packageConfigs = packageFormats.map((format) => createConfig(format, outuptConfig[format], []))

export default packageConfigs
