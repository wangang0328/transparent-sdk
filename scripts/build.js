import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { execa } from 'execa'
import minimist from 'minimist'
import { Extractor, ExtractorConfig } from '@microsoft/api-extractor'
// import { outputFileSync } from 'fs-extra/esm'
// import cloneDeep from 'lodash.clonedeep'

const require = createRequire(import.meta.url)

// const distDir = path.resolve(process.cwd(), 'dist')

// 本地包所有的版本
const allVersions = {}

const allTargets = fs
  .readdirSync('packages')
  .filter(
    (f) => {
      if (!fs.statSync(`packages/${f}`).isDirectory()) {
        // 非目录
        return false
      }
      const pkg = require(`../packages/${f}/package.json`)
      allVersions[pkg.name] = pkg.version
      if (pkg.private && !pkg.buildOptions) {
        return false
      }
      return true
    }
  )
// NOTE: 使用npm run 有问题，参数解析有误，使用 pnpm run
// 获取命令
const args = minimist(process.argv.slice(2))
const targets = args._?.length ? args._ : allTargets

const formats = args.formats ? args.formats.replace(/\,/g, '_') : ''

// 替换本地依赖的版本
const localVersion = /^\workspace:\s*[\*\^]\s*$/
const replaceLocalDep = (dependecyObj = {}) => {
  const target = { ...dependecyObj }
  for (const key in dependecyObj) {
    if (Object.hasOwnProperty.call(dependecyObj, key)) {
      const val = dependecyObj[key]
      if (localVersion.test(val)) {
        target[key] = allVersions[key]
      }
    }
  }
  return target
}

const build = async (target) => {
  const pkgDir = path.resolve(`packages/${target}`)
  const distDir = path.resolve(pkgDir, 'dist')
  // 加载格式化后的 dir
  const resolveFormatDir = (p) => path.resolve(distDir, p)
  const pkg = require(path.resolve(`${pkgDir}/package.json`))

  // const filename = pkg.buildOptions?.filename || target
  // 删除 dist 的filename
  await execa(
    'rimraf',
    [distDir]
  )
  // -c 执行 rollup.config.js 文件
  // --enviroment 向配置文件传递环境变量，通过 process.env.获取
  await execa(
    'rollup',
    [
      '-c',
      '--environment',
      [`TARGET:${target}`, `FORMATS:${formats}`].filter(Boolean).join(',')
    ],
    {
      stdio: 'inherit'
    }
  )

  // 处理 .d.ts声明文件
  // const extractorPath = path.resolve(process.cwd(), 'api-extractor.json')
  // const extractorJSON = require(extractorPath)
  // const targetExtractorJSON = cloneDeep(extractorJSON)
  // targetExtractorJSON.mainEntryPointFilePath = targetExtractorJSON.mainEntryPointFilePath
  //   .replace('__NAME__', filename)
  //   .replace('__FORMAT__', 'es') // TODO: 动态生成， 和rollup.config.js 有很多重复的东西
  //   .replace('__ORIGIN_NAME__', target)
  // targetExtractorJSON.dtsRollup.untrimmedFilePath = targetExtractorJSON.dtsRollup.untrimmedFilePath.replace('__NAME__', filename)

  // 执行 ExtractorConfig.prepare 报错，使用loadFileAndPrepare api 将数据写入到对应的文件中
  // await outputFileSync(`${pkgDir}/api-extractor.json`, JSON.stringify(targetExtractorJSON), 'utf-8')

  const extractorConfig = ExtractorConfig.loadFileAndPrepare(`${pkgDir}/api-extractor.json`)
  Extractor.invoke(extractorConfig, { localBuild: true, showVerboseMessages: false })

  // 生成package.json文件
  // const buildPackageJosn = JSON.stringify({
  //   name: pkg.name,
  //   version: pkg.version,
  //   description: pkg.description,
  //   main: 'lib/index.js',
  //   // TODO：过滤获取 workspace： * 的内容，然后改变依赖
  //   module: 'es/index.js',
  //   browser: 'dist/index.js',
  //   types: 'index.d.ts',
  //   dependencies: replaceLocalDep(pkg.dependencies),
  //   peerDependencies: replaceLocalDep(pkg.peerDependencies)
  // }, null, '\t')

  // fs.writeFile(
  //   path.resolve(distDir, `${filename}/package.json`),
  //   buildPackageJosn,
  //   { encoding: 'utf8' },
  //   () => {}
  //   // { encoding: 'utf8' }
  // )

  // 删除其余的声明文件
  allTargets.forEach(name => {
    // TODO: 动态
    const totalFormats = ['es', 'lib', 'umd']
    totalFormats.forEach(async (format) => {
      await execa('rimraf', [resolveFormatDir(`${format}/${name}`)])
    })
  })
}


// 最大并发数量
const MAX_COUNT = 4

const buildAll = async (targets) => {
  const ret = []
  const executing = []
  for (const item of targets) {
    const p = Promise.resolve().then(() => build(item))
    ret.push(p)
    if (targets.length > MAX_COUNT) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1))
      executing.push(e)
      if (executing.length > MAX_COUNT) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(ret)
}

buildAll(targets)