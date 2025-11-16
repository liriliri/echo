import { observer } from 'mobx-react-lite'
import Style from './Overview.module.scss'
import { JSX, useEffect, useState } from 'react'
import types from 'licia/types'
import { notify } from 'share/renderer/lib/util'
import { t } from 'common/util'
import store from '../../store'
import copy from 'licia/copy'
import { PannelLoading } from '../common/loading'
import className from 'licia/className'
import fileSize from 'licia/fileSize'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import LunaToolbar, { LunaToolbarSpace } from 'luna-toolbar/react'
import PortMappingModal from './PortMappingModal'
import RemoteControllerModal from './RemoteControllerModal'

export default observer(function Overview() {
  const [portModalVisible, setPortModalVisible] = useState(false)
  const [remoteControllerModalVisible, setRemoteControllerModalVisible] =
    useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [overview, setOverview] = useState<types.PlainObj<string | number>>({})

  const { target } = store

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    if (!target || isLoading) {
      return
    }

    try {
      setIsLoading(true)
      const overview = await main.getOverview(target.key)
      setOverview(overview)
    } catch {
      notify(t('commonErr'), { icon: 'error' })
    }

    setIsLoading(false)
  }

  let content: JSX.Element | null = null

  if (!target) {
    content = (
      <div className={className('panel', Style.container)}>
        {t('targetNotConnected')}
      </div>
    )
  } else if (isLoading) {
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
        <div className={Style.row}>
          {item(
            t('processor'),
            `${overview.processor || t('unknown')} (${overview.abi})`,
            'processor'
          )}
          {item(t('physicalResolution'), overview.physicalResolution, 'phone')}
          {item(t('memory'), fileSize(overview.memTotal as number), 'memory')}
        </div>
      </div>
    )
  }

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
        <ToolbarIcon
          icon="terminal"
          title={t('hdcCli')}
          onClick={() => main.openHdcCli()}
        />
        <ToolbarIcon
          icon="bidirection"
          disabled={!target}
          title={t('portMapping')}
          onClick={() => setPortModalVisible(true)}
        />
        <ToolbarIcon
          icon="remote-controller"
          disabled={!target}
          title={t('remoteController')}
          onClick={() => setRemoteControllerModalVisible(true)}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading || !target}
          onClick={() => refresh()}
        />
      </LunaToolbar>
      {content}
      <PortMappingModal
        visible={portModalVisible}
        onClose={() => setPortModalVisible(false)}
      />
      <RemoteControllerModal
        visible={remoteControllerModalVisible}
        onClose={() => setRemoteControllerModalVisible(false)}
      />
    </div>
  )
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
