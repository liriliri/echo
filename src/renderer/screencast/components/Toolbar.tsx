import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSelect,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { t } from 'common/util'
import Style from './Toolbar.module.scss'
import store from '../store'
import download from 'licia/download'
import toStr from 'licia/toStr'
import toNum from 'licia/toNum'
import fullscreen from 'licia/fullscreen'
import LunaModal from 'luna-modal'

const KEYCODE_HOME = 1
const KEYCODE_BACK = 2
const KEYCODE_VOLUME_UP = 16
const KEYCODE_VOLUME_DOWN = 17
const KEYCODE_POWER = 18

export default observer(function Toolbar() {
  const { target, screencastClient } = store

  async function captureScreenshot() {
    const canvas = screencastClient.canvas
    const dataUrl = canvas.toDataURL('image/png')
    const blob = await fetch(dataUrl).then((res) => res.blob())
    download(blob, 'screenshot.png', 'image/png')
  }

  async function toggleFullscreen() {
    fullscreen.toggle(screencastClient.canvas)
  }

  function inputKey(keyCode: number) {
    return () => main.inputKey(target.key, keyCode)
  }

  async function inputText() {
    const text = await LunaModal.prompt(t('inputText'), '')
    if (text) {
      main.inputText(target.key, text)
    }
  }

  return (
    <>
      <LunaToolbar
        className={Style.container}
        onChange={(key, val) => {
          if (key === 'scale') {
            store.setScale(toNum(val))
          }
        }}
      >
        <ToolbarIcon
          icon="power"
          title={t('power')}
          onClick={inputKey(KEYCODE_POWER)}
        />
        <ToolbarIcon
          icon="volume"
          title={t('volumeUp')}
          onClick={inputKey(KEYCODE_VOLUME_UP)}
        />
        <ToolbarIcon
          icon="volume-down"
          title={t('volumeDown')}
          onClick={inputKey(KEYCODE_VOLUME_DOWN)}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="back"
          title={t('back')}
          onClick={inputKey(KEYCODE_BACK)}
        />
        <ToolbarIcon
          icon="circle"
          title={t('home')}
          onClick={inputKey(KEYCODE_HOME)}
        />
        <ToolbarIcon icon="text" title={t('inputText')} onClick={inputText} />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="camera"
          title={t('screenshot')}
          onClick={captureScreenshot}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="pin"
          title={t('alwaysOnTop')}
          state={store.alwaysOnTop ? 'hover' : ''}
          onClick={() => {
            store.setAlwaysOnTop(!store.alwaysOnTop)
          }}
        />
        <ToolbarIcon
          icon="fullscreen"
          title={t('fullscreen')}
          onClick={toggleFullscreen}
        />
        <LunaToolbarSpace />
        <LunaToolbarText text={t('scale') + ':'} />
        <LunaToolbarSelect
          keyName="scale"
          value={toStr(store.scale)}
          options={{
            '0.5': '0.5',
            '0.6': '0.6',
            '0.7': '0.7',
            '0.8': '0.8',
            '0.9': '0.9',
            '1.0': '1',
          }}
        />
      </LunaToolbar>
    </>
  )
})
