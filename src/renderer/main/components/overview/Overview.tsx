import { observer } from 'mobx-react-lite'
import Style from './Overview.module.scss'
import { JSX, useEffect, useState } from 'react'
import isEmpty from 'licia/isEmpty'
import types from 'licia/types'
import { notify } from 'share/renderer/lib/util'
import { t } from '../../../../common/util'
import store from '../../store'
import copy from 'licia/copy'
import { PannelLoading } from '../../../components/loading'
import className from 'licia/className'

export default observer(function Overview() {
  const [overview, setOverview] = useState<types.PlainObj<string | number>>({})

  const { target } = store

  useEffect(() => refresh(), [])

  function refresh() {
    if (target) {
      main.getOverview(target.key).then(setOverview)
    }
  }

  let content: JSX.Element | null = null

  if (!target) {
    content = (
      <div className={className('panel', Style.container)}>
        {t('targetNotConnected')}
      </div>
    )
  } else if (isEmpty(overview)) {
    content = <PannelLoading />
  } else {
    content = (
      <div className={Style.info}>
        <div className={Style.row}>
          {item(t('name'), overview.name, 'phone')}
          {item(t('brand'), overview.brand)}
          {item(t('model'), overview.model, 'model')}
        </div>
        <div className={Style.row}>
          {item(t('serialNum'), overview.serialNum, 'serial-number')}
          {item(
            t('ohosVersion'),
            `OpenHarmony ${target.ohosVersion} (API ${target.sdkVersion})`,
            'ohos'
          )}
          {item(t('kernelVersion'), overview.kernelVersion, 'ohos')}
        </div>
      </div>
    )
  }

  return <div className={className('panel', Style.container)}>{content}</div>
})

function item(title, value, icon = 'info', onDoubleClick?: () => void) {
  function copyValue() {
    setTimeout(() => {
      if (hasDoubleClick) {
        return
      }
      copy(value)
      notify(t('copied'), { icon: 'info' })
    }, 200)
  }

  let hasDoubleClick = false

  return (
    <div
      className={Style.item}
      onClick={copyValue}
      onDoubleClick={() => {
        if (!onDoubleClick) {
          return
        }
        hasDoubleClick = true
        onDoubleClick()
      }}
    >
      <div className={Style.title}>
        <span className={`icon-${icon}`}></span>
        &nbsp;{title}
      </div>
      <div className={Style.value}>{value || t('unknown')}</div>
    </div>
  )
}
