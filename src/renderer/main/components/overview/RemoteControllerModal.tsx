import LunaModal from 'luna-modal/react'
import { observer } from 'mobx-react-lite'
import { createPortal } from 'react-dom'
import { t } from 'common/util'
import { IModalProps } from 'share/common/types'
import Style from './RemoteControllerModal.module.scss'
import className from 'licia/className'
import store from '../../store'

// https://docs.openharmony.cn/pages/v4.1/en/application-dev/reference/apis-input-kit/js-apis-keycode.md
const KEYCODE_HOME = 1
const KEYCODE_BACK = 2
const KEYCODE_VOLUME_UP = 16
const KEYCODE_VOLUME_DOWN = 17
const KEYCODE_POWER = 18
const KEYCODE_DPAD_UP = 2012
const KEYCODE_DPAD_DOWN = 2013
const KEYCODE_DPAD_LEFT = 2014
const KEYCODE_DPAD_RIGHT = 2015
const KEYCODE_DPAD_CENTER = 2016

export default observer(function RemoteControllerModal(props: IModalProps) {
  function inputKey(keyCode: number) {
    return () => {
      if (!store.target) {
        return
      }
      main.inputKey(store.target.key, keyCode)
    }
  }

  return createPortal(
    <LunaModal
      title={t('remoteController')}
      width={400}
      visible={props.visible}
      onClose={props.onClose}
    >
      <div className={Style.remoteController}>
        <div className={Style.top}>
          <div className={Style.button}>
            <span
              className="icon-power"
              title={t('power')}
              onClick={inputKey(KEYCODE_POWER)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('volumeDown')}
              className="icon-volume-down"
              onClick={inputKey(KEYCODE_VOLUME_DOWN)}
            />
          </div>
          <div className={Style.button}>
            <span
              className="icon-volume"
              title={t('volumeUp')}
              onClick={inputKey(KEYCODE_VOLUME_UP)}
            />
          </div>
        </div>
        <div className={Style.directionPad}>
          <div className={Style.ok} onClick={inputKey(KEYCODE_DPAD_CENTER)}>
            OK
          </div>
          <div className={Style.up} onClick={inputKey(KEYCODE_DPAD_UP)} />
          <div className={Style.right} onClick={inputKey(KEYCODE_DPAD_RIGHT)} />
          <div className={Style.down} onClick={inputKey(KEYCODE_DPAD_DOWN)} />
          <div className={Style.left} onClick={inputKey(KEYCODE_DPAD_LEFT)} />
        </div>
        <div className={Style.bottom}>
          <div className={Style.button}>
            <span
              title={t('home')}
              className="icon-circle"
              onClick={inputKey(KEYCODE_HOME)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('back')}
              className={className('icon-back', Style.back)}
              onClick={inputKey(KEYCODE_BACK)}
            />
          </div>
          <div className={Style.button}>
            <span
              title={t('appSwitch')}
              className="icon-square"
              onClick={inputKey(-1)}
            />
          </div>
        </div>
      </div>
    </LunaModal>,
    document.body
  )
})
