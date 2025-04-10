import {
  IpcDumpWindowHierarchy,
  IpcGetOverview,
  IpcGetTargets,
  IpcInputKey,
  IpcScreencap,
} from '../../common/types'
import { handleEvent, resolveUnpack } from 'share/main/lib/util'
import Hdc, { Client } from 'hdckit'
import log from 'share/common/log'
import map from 'licia/map'
import startWith from 'licia/startWith'
import trim from 'licia/trim'
import each from 'licia/each'
import os from 'node:os'
import { shell } from './hdc/base'
import * as shellHdc from './hdc/shell'
import * as base from './hdc/base'
import * as bundle from './hdc/bundle'
import * as port from './hdc/port'
import fs from 'fs-extra'
import path from 'node:path'
import isWindows from 'licia/isWindows'
import isStrBlank from 'licia/isStrBlank'
import { getSettingsStore } from './store'
import { isDev } from 'share/common/util'
import { app } from 'electron'
import * as window from 'share/main/lib/window'

const logger = log('hdc')

const settingsStore = getSettingsStore()

let client: Client

const getTargets: IpcGetTargets = async function () {
  const targets = await client.listTargets()

  return Promise.all(
    map(targets, async (connectKey: string) => {
      const parameters = await client.getTarget(connectKey).getParameters()
      let ohosVersion =
        parameters['const.product.software.version'].split(/\s/)[1]
      ohosVersion = ohosVersion.slice(0, ohosVersion.indexOf('('))

      const sdkVersion = parameters['const.ohos.apiversion']

      return {
        name: parameters['const.product.name'],
        key: connectKey,
        ohosVersion,
        sdkVersion,
      }
    })
  ).catch(() => [])
}

const getOverview: IpcGetOverview = async function (connectKey) {
  const target = client.getTarget(connectKey)

  const parameters = await target.getParameters()
  const [deviceInfo, kernelVersion] = await shell(connectKey, [
    'SP_daemon -deviceinfo',
    'uname -a',
  ])

  return {
    name: parameters['const.product.name'],
    brand: parameters['const.product.brand'],
    model: parameters['const.product.model'],
    abi: parameters['const.product.cpu.abilist'],
    serialNum: getPropValue('sn', deviceInfo),
    kernelVersion: kernelVersion.slice(0, kernelVersion.indexOf('#')),
    processor: getPropValue('deviceTypeName', deviceInfo),
    ...(await getMemory(connectKey)),
    ...(await getScreen(connectKey)),
  }
}

async function getScreen(connectKey: string) {
  const screen = await shell(connectKey, 'hidumper -s RenderService -a screen')

  let physicalResolution = ''
  const physicalResolutionMatch = screen.match(
    /physical screen resolution: ((\d+)x(\d+))/
  )
  if (physicalResolutionMatch) {
    physicalResolution = physicalResolutionMatch[1]
  }

  return {
    physicalResolution,
  }
}

async function getMemory(connectKey: string) {
  const memInfo = await shell(connectKey, 'cat /proc/meminfo')
  let memTotal = 0
  let memFree = 0

  const totalMatch = getPropValue('MemTotal', memInfo)
  let freeMatch = getPropValue('MemAvailable', memInfo)
  if (!freeMatch) {
    freeMatch = getPropValue('MemFree', memInfo)
  }
  if (totalMatch && freeMatch) {
    memTotal = parseInt(totalMatch, 10) * 1024
    memFree = parseInt(freeMatch, 10) * 1024
  }

  return {
    memTotal,
    memUsed: memTotal - memFree,
  }
}

function getPropValue(key: string, str: string) {
  const lines = str.split('\n')
  for (let i = 0, len = lines.length; i < len; i++) {
    const line = trim(lines[i])
    if (startWith(line, key)) {
      return trim(line.replace(/.*:/, ''))
    }
  }

  return ''
}

const inputKey: IpcInputKey = async function (connectKey, keyCode) {
  await shell(connectKey, `uinput -K -d ${keyCode} -u ${keyCode}`)
}

const screencap: IpcScreencap = async function (connectKey) {
  const name = 'haro_screen.jpeg'
  const p = `/data/local/tmp/${name}`
  await shell(connectKey, [`rm -r ${p}`, `snapshot_display -i 0 -f ${p}`])

  const target = client.getTarget(connectKey)
  const dest = path.resolve(os.tmpdir(), name)
  await target.recvFile(p, dest)
  const buf = await fs.readFile(dest)

  return buf.toString('base64')
}

const dumpWindowHierarchy: IpcDumpWindowHierarchy = async function (
  connectKey
) {
  const name = 'haro_layout.json'
  const p = `/data/local/tmp/${name}`
  await shell(connectKey, [`rm -r ${p}`, `uitest dumpLayout -p ${p}`])

  const target = client.getTarget(connectKey)
  const dest = path.resolve(os.tmpdir(), name)
  await target.recvFile(p, dest)
  const data = await fs.readFile(dest, 'utf8')
  const json = JSON.parse(data)

  return toHierarchyXml(json)
}

function toHierarchyXml(json: any) {
  const { attributes, children } = json
  let xml = ''

  const tagName = attributes.type
  delete attributes.type
  xml += `<${tagName || 'Layout'}`
  each(attributes, (val, key) => {
    xml += ` ${key}="${val}"`
  })
  xml += '>'

  each(children, (child) => {
    xml += toHierarchyXml(child)
  })

  return xml + `</${tagName || 'Layout'}>`
}

export async function init() {
  logger.info('init')

  let bin = isWindows ? resolveUnpack('hdc/hdc.exe') : resolveUnpack('hdc/hdc')
  if (isDev()) {
    bin = isWindows
      ? resolveUnpack('hdc/win/hdc.exe')
      : resolveUnpack('hdc/mac/hdc')
  }
  const hdcPath = settingsStore.get('hdcPath')
  if (hdcPath === 'hdc' || (!isStrBlank(hdcPath) && fs.existsSync(hdcPath))) {
    bin = hdcPath
  }

  app.on('before-quit', async () => {
    if (settingsStore.get('killHdcWhenExit')) {
      logger.info('kill hdc')
      await client.kill()
    }
  })

  client = Hdc.createClient({
    bin,
  })
  client.trackTargets().then((tracker) => {
    tracker.on('add', onTargetChange)
    tracker.on('remove', onTargetChange)
  })
  function onTargetChange() {
    logger.info('target change')
    setTimeout(() => window.sendTo('main', 'changeTarget'), 2000)
  }

  base.init(client)
  bundle.init(client)
  shellHdc.init(client)
  port.init(client)

  handleEvent('getTargets', getTargets)
  handleEvent('getOverview', getOverview)
  handleEvent('inputKey', inputKey)
  handleEvent('screencap', screencap)
  handleEvent('dumpWindowHierarchy', dumpWindowHierarchy)
}
