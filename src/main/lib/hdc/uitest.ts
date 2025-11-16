import { Client, UiDriver } from 'hdckit'
import each from 'licia/each'
import * as window from 'share/main/lib/window'
import {
  IpcDumpWindowHierarchy,
  IpcInputText,
  IpcStartCaptureScreen,
  IpcStopCaptureScreen,
  IpcTouchDown,
  IpcTouchMove,
  IpcTouchUp,
} from 'common/types'
import { getTargetStore, setTargetStore } from './base'
import { handleEvent, resolveResources } from 'share/main/lib/util'

let client: Client

async function getUiDriver(connectKey: string): Promise<UiDriver> {
  let uiDriver = getTargetStore(connectKey, 'uiDriver')
  if (!uiDriver) {
    const target = await client.getTarget(connectKey)
    uiDriver = await target.createUiDriver(
      resolveResources('uitestkit_sdk/uitest_agent_v1.1.0.so'),
      '1.1.0'
    )
    await uiDriver.stop()
    setTargetStore(connectKey, 'uiDriver', uiDriver)
  }
  return uiDriver
}

const dumpWindowHierarchy: IpcDumpWindowHierarchy = async function (
  connectKey
) {
  const uiDriver = await getUiDriver(connectKey)
  const layout = await uiDriver.captureLayout()
  return toHierarchyXml(layout)
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

const startCaptureScreen: IpcStartCaptureScreen = async function (
  connectKey,
  scale
) {
  const uiDriver = await getUiDriver(connectKey)
  await stopCaptureScreen(connectKey)
  uiDriver.startCaptureScreen(
    function (image) {
      window.sendTo('screencast', 'captureScreen', connectKey, image)
    },
    {
      scale,
    }
  )
}

const stopCaptureScreen: IpcStopCaptureScreen = async function (connectKey) {
  const uiDriver = await getUiDriver(connectKey)
  uiDriver.stopCaptureScreen()
}

const touchDown: IpcTouchDown = async function (connectKey, x, y) {
  const uiDriver = await getUiDriver(connectKey)
  await uiDriver.touchDown(x, y)
}

const touchMove: IpcTouchMove = async function (connectKey, x, y) {
  const uiDriver = await getUiDriver(connectKey)
  await uiDriver.touchMove(x, y)
}

const touchUp: IpcTouchUp = async function (connectKey, x, y) {
  const uiDriver = await getUiDriver(connectKey)
  await uiDriver.touchUp(x, y)
}

const inputText: IpcInputText = async function (connectKey, text) {
  const uiDriver = await getUiDriver(connectKey)
  await uiDriver.inputText(text)
}

export function init(c: Client) {
  client = c

  handleEvent('dumpWindowHierarchy', dumpWindowHierarchy)
  handleEvent('startCaptureScreen', startCaptureScreen)
  handleEvent('stopCaptureScreen', stopCaptureScreen)
  handleEvent('touchDown', touchDown)
  handleEvent('touchMove', touchMove)
  handleEvent('touchUp', touchUp)
  handleEvent('inputText', inputText)
}
