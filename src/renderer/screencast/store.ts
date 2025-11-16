import BaseStore from 'share/renderer/store/BaseStore'
import { ITarget } from 'common/types'
import { action, makeObservable, observable, runInAction } from 'mobx'
import ScreencastClient from './lib/ScreencastClient'

class Store extends BaseStore {
  target!: ITarget
  screencastClient!: ScreencastClient
  alwaysOnTop = false
  scale = 1
  constructor() {
    super()

    makeObservable(this, {
      alwaysOnTop: observable,
      target: observable,
      scale: observable,
      setAlwaysOnTop: action,
      setScale: action,
    })

    this.init()
    this.bindEvent()
  }
  setAlwaysOnTop(val: boolean) {
    this.alwaysOnTop = val
    main.setScreencastStore('alwaysOnTop', val)
    main.setScreencastAlwaysOnTop(val)
  }
  setScale(scale: number) {
    this.scale = scale
    this.screencastClient.start()
    main.setScreencastStore('scale', scale)
  }
  async setTarget(target: ITarget | null) {
    if (target === null) {
      main.closeScreencast()
    } else {
      runInAction(() => (this.target = target))
      if (this.screencastClient) {
        this.screencastClient.destroy()
      }
      this.screencastClient = new ScreencastClient(this.target.key)
    }
  }
  private async init() {
    const alwaysOnTop = await main.getScreencastStore('alwaysOnTop')
    if (alwaysOnTop) {
      main.setScreencastAlwaysOnTop(true)
      runInAction(() => (this.alwaysOnTop = true))
    }
    const scale = await main.getScreencastStore('scale')
    if (scale) {
      runInAction(() => (this.scale = scale))
    }
    const target = await main.getMainStore('target')
    this.setTarget(target)
  }
  private bindEvent() {
    main.on('changeMainStore', (name: string, val: any) => {
      if (name === 'target') {
        this.setTarget(val)
      }
    })
  }
}

export default new Store()
