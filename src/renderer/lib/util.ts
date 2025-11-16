import { t } from 'common/util'
import isEmpty from 'licia/isEmpty'
import { isObservable, toJS } from 'mobx'
import { notify } from 'share/renderer/lib/util'

export async function setMainStore(name: string, val: any) {
  await main.setMainStore(name, isObservable(val) ? toJS(val) : val)
}

export async function installBundles(connectKey: string, hapPaths?: string[]) {
  let hasSuccess = false

  if (!hapPaths) {
    const { filePaths } = await main.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'hap file', extensions: ['hap'] }],
    })
    if (isEmpty(filePaths)) {
      return hasSuccess
    }
    hapPaths = filePaths
  }

  for (let i = 0, len = hapPaths!.length; i < len; i++) {
    const hapPath = hapPaths![i]
    notify(t('bundleInstalling', { path: hapPath }), { icon: 'info' })
    try {
      await main.installBundle(connectKey, hapPath!)
      hasSuccess = true
    } catch {
      notify(t('installBundleErr'), { icon: 'error' })
    }
  }

  return hasSuccess
}
