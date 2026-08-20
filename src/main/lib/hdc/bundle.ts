import {
  IBundleInfo,
  IpcCleanBundleCache,
  IpcCleanBundleData,
  IpcGetBundleInfos,
  IpcGetBundles,
  IpcGetTopBundle,
  IpcInstallBundle,
  IpcStartBundle,
  IpcStopBundle,
  IpcUninstallBundle,
} from 'common/types'
import { Client } from 'hdckit'
import { handleEvent } from 'share/main/lib/util'
import { shell } from './base'
import trim from 'licia/trim'
import axios from 'axios'
import types from 'licia/types'
import log from 'share/common/log'
import map from 'licia/map'
import startWith from 'licia/startWith'
import filter from 'licia/filter'
import contain from 'licia/contain'
import path from 'node:path'
import os from 'node:os'
import fs from 'fs-extra'
import {
  applyOnlineBundleFallback,
  bundleInfoFromDump,
  isLocalIconPath,
  parseBmDumpOutput,
  shouldFetchOnlineBundleInfo,
} from './bundleDump'

const logger = log('hdcBundle')

let client: Client

const getBundles: IpcGetBundles = async (connectKey, system = true) => {
  const result = await shell(connectKey, 'bm dump -a')
  const bundles = map(trim(result).split('\n').slice(1), (line) => trim(line))

  return system ? bundles : filter(bundles, (bundle) => !isSystemBundle(bundle))
}

function isSystemBundle(bundle: string) {
  const sysBundlePrefixs = [
    'com.huawei.hmos',
    'com.huawei.hms',
    'com.huawei.msdp',
    'com.ohos',
  ]
  for (let i = 0, len = sysBundlePrefixs.length; i < len; i++) {
    if (startWith(bundle, sysBundlePrefixs[i])) {
      return true
    }
  }

  if (
    contain(
      [
        'ohos.global.systemres',
        'com.huawei.associateassistant',
        'com.huawei.batterycare',
        'com.huawei.shell_assistant',
        'com.usb.right',
      ],
      bundle
    )
  ) {
    return true
  }

  return false
}

const getBundleInfos: IpcGetBundleInfos = async (connectKey, bundleNames) => {
  const result: IBundleInfo[] = []

  const dumpInfos = await shell(
    connectKey,
    map(bundleNames, (name) => `bm dump -n ${name}`)
  )
  const infos = map(dumpInfos, (dump) => parseBmDumpOutput(dump))

  for (let i = 0, len = bundleNames.length; i < len; i++) {
    const bundleName = bundleNames[i]
    const bundleInfo = bundleInfoFromDump(bundleName, infos[i])

    if (shouldFetchOnlineBundleInfo(bundleName, bundleInfo)) {
      try {
        const onlineInfo = await getOnlineBundleInfo(bundleName)
        Object.assign(
          bundleInfo,
          applyOnlineBundleFallback(bundleInfo, onlineInfo)
        )
      } catch (e) {
        logger.error(e)
      }
    }

    if (isLocalIconPath(bundleInfo.icon)) {
      try {
        bundleInfo.icon = await loadLocalIcon(connectKey, bundleInfo.icon)
      } catch (e) {
        logger.error(e)
        bundleInfo.icon = ''
        if (shouldFetchOnlineBundleInfo(bundleName, bundleInfo)) {
          try {
            const onlineInfo = await getOnlineBundleInfo(bundleName)
            Object.assign(
              bundleInfo,
              applyOnlineBundleFallback(bundleInfo, onlineInfo)
            )
          } catch (onlineErr) {
            logger.error(onlineErr)
          }
        }
      }
    }
    result.push(bundleInfo)
  }

  return result
}

const INFO_URL = 'https://web-drcn.hispace.dbankcloud.com/edge/webedge/appinfo'
const onlineInfos: types.PlainObj<any> = {}
async function getOnlineBundleInfo(bundleName: string) {
  if (onlineInfos[bundleName]) {
    return onlineInfos[bundleName]
  }

  logger.info('get online bundle info', bundleName)
  const { data } = await axios.post(INFO_URL, {
    pkgName: bundleName,
    appId: bundleName,
    locale: 'zh_CN',
    countryCode: 'CN',
    orderApp: 1,
  })
  onlineInfos[bundleName] = data

  return data
}

async function loadLocalIcon(
  connectKey: string,
  iconPath: string
): Promise<string> {
  const target = await client.getTarget(connectKey)
  const dest = path.resolve(
    os.tmpdir(),
    `echo-icon-${Date.now()}-${Math.random().toString(16).slice(2)}${path.extname(iconPath)}`
  )
  await target.recvFile(iconPath, dest)
  const buf = await fs.readFile(dest)
  await fs.remove(dest).catch(() => {})
  const ext = path.extname(iconPath).toLowerCase()
  const mime =
    ext === '.webp'
      ? 'image/webp'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

const installBundle: IpcInstallBundle = async (connectKey, hap) => {
  const target = await client.getTarget(connectKey)
  await target.install(hap)
}

const startBundle: IpcStartBundle = async (connectKey, bundleName, ability) => {
  await shell(connectKey, `aa start -a ${ability} -b ${bundleName}`)
}

const stopBundle: IpcStopBundle = async (connectKey, bundleName) => {
  await shell(connectKey, `aa force-stop ${bundleName}`)
}

const cleanBundleData: IpcCleanBundleData = async (connectKey, bundleName) => {
  await shell(connectKey, `bm clean -n ${bundleName} -d`)
}

const cleanBundleCache: IpcCleanBundleCache = async (
  connectKey,
  bundleName
) => {
  await shell(connectKey, `bm clean -n ${bundleName} -c`)
}

const uninstallBundle: IpcUninstallBundle = async (connectKey, bundleName) => {
  const target = await client.getTarget(connectKey)
  await target.uninstall(bundleName)
}

const getTopBundle: IpcGetTopBundle = async (connectKey) => {
  const abilityInfo = await shell(connectKey, 'aa dump -a')
  const lines = map(abilityInfo.split('\n'), (line) => trim(line))

  let name = ''
  let pid = 0
  let state = ''
  for (let i = 0, len = lines.length; i < len; i++) {
    const line = lines[i]
    if (startWith(line, 'process name')) {
      name = line.slice('process name ['.length, -1)
    } else if (startWith(line, 'pid')) {
      const pidMatch = line.match(/pid #(\d+)/)
      if (pidMatch) {
        pid = parseInt(pidMatch[1], 10)
      }
    } else if (startWith(line, 'state')) {
      if (line === 'state #FOREGROUND' && !isSystemBundle(name)) {
        state = 'foreground'
        break
      }
    }
  }
  if (state !== 'foreground') {
    return {
      name: '',
      pid: 0,
    }
  }

  return {
    name,
    pid,
  }
}

export async function init(c: Client) {
  client = c

  handleEvent('getBundles', getBundles)
  handleEvent('installBundle', installBundle)
  handleEvent('getBundleInfos', getBundleInfos)
  handleEvent('startBundle', startBundle)
  handleEvent('stopBundle', stopBundle)
  handleEvent('cleanBundleData', cleanBundleData)
  handleEvent('cleanBundleCache', cleanBundleCache)
  handleEvent('uninstallBundle', uninstallBundle)
  handleEvent('getTopBundle', getTopBundle)
}
