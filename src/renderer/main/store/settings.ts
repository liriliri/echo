import { action, makeObservable, observable, runInAction } from 'mobx'
import isUndef from 'licia/isUndef'

export class Settings {
  theme = 'light'
  hdcPath = ''
  killHdcWhenExit = false
  constructor() {
    makeObservable(this, {
      theme: observable,
      hdcPath: observable,
      killHdcWhenExit: observable,
      set: action,
    })

    this.init()
  }
  async init() {
    const names = ['theme', 'hdcPath', 'killHdcWhenExit']
    for (let i = 0, len = names.length; i < len; i++) {
      const name = names[i]
      const val = await main.getSettingsStore(name)
      if (!isUndef(val)) {
        runInAction(() => (this[name] = val))
      }
    }
  }
  async set(name: string, val: any) {
    runInAction(() => {
      this[name] = val
    })
    await main.setSettingsStore(name, val)
  }
}
