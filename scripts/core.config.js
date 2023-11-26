import path from 'path'
import commonjsPlugin from '@rollup/plugin-commonjs'
import tsPlugin from 'rollup-plugin-typescript2'

export default [
  {
    input: path.resolve(process.cwd(), 'packages/core/src/index.ts'),
    output: {
      dir: path.resolve(process.cwd(), 'dist/core'),
      name: 'TransparentCore',
      format: 'esm',
      // 保留模块结构
      preserveModules: true,
      // 将保留的模块放在根级别的此路径下
      preserveModulesRoot: 'src'
    },
    plugins: [commonjsPlugin(), tsPlugin()],
    external: ['typescript']
  }
]
