import LunaToolbar, { LunaToolbarSelect } from 'luna-toolbar/react'
import types from 'licia/types'
import Style from './Target.module.scss'
import { observer } from 'mobx-react-lite'
import isEmpty from 'licia/isEmpty'
import store from '../../store'
import { t } from 'common/util'
import each from 'licia/each'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { notify } from 'share/renderer/lib/util'

export default observer(function Target() {
  let targetOptions: types.PlainObj<string> = {}
  let targetDisabled = false
  if (!isEmpty(store.targets)) {
    targetOptions = {}
    each(store.targets, (target) => {
      targetOptions[`${target.name} (${target.key})`] = target.key
    })
  } else {
    targetOptions[t('targetNotConnected')] = ''
    targetDisabled = true
  }

  return (
    <>
      <LunaToolbar
        className={Style.container}
        onChange={(key, val) => {
          if (key === 'target') {
            store.selectTarget(val)
          }
        }}
      >
        <LunaToolbarSelect
          keyName="target"
          disabled={targetDisabled}
          value={store.target ? store.target.key : ''}
          options={targetOptions}
        />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          onClick={async () => {
            await store.refreshTargets()
            notify(t('targetRefreshed'), { icon: 'success' })
          }}
        />
        <ToolbarIcon
          icon="screencast"
          disabled={!store.target}
          title={t('screencast')}
          onClick={() => main.showScreencast()}
        />
      </LunaToolbar>
    </>
  )
})
