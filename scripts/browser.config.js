import path from 'path'
import commonjsPlugin from '@rollup/plugin-commonjs'
import tsPlugin from 'rollup-plugin-typescript2'

export default [{
  input: path.resolve(process.cwd(), 'packages/browser/src/index.ts'),
  output: {
    // dir: path.resolve(process.cwd(), 'dist/browser'),
    dir: 'dist/aa',
    name: 'TransparentClient',
    format: 'esm',
    // 保留模块结构
    preserveModules: true,
    // 将保留的模块放在根级别的此路径下
    // preserveModulesRoot: path.resolve(process.cwd(), 'dist'),
    preserveModulesRoot: 'dist/aa'
  },
  plugins: [
    commonjsPlugin(),
    tsPlugin()
  ],
  // 三方包不解析
  external: [
    'typescript',
    '@wa-dev/transparent-sdk-core',
    '@wa-dev/transparent-sdk-utils',
  ]
}]
