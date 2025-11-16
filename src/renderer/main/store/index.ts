import { makeObservable, observable, runInAction } from 'mobx'
import { setMainStore } from '../../lib/util'
import BaseStore from 'share/renderer/store/BaseStore'
import isStr from 'licia/isStr'
import find from 'licia/find'
import { Settings } from './settings'
import { Application } from './application'
import { ITarget } from 'common/types'
import { setMemStore } from 'share/renderer/lib/util'
import isEmpty from 'licia/isEmpty'
import { Process } from './process'
import { Layout } from './layout'

class Store extends BaseStore {
  targets: ITarget[] = []
  target: ITarget | null = null
  panel = 'overview'
  settings = new Settings()
  application = new Application()
  process = new Process()
  layout = new Layout()
  ready = false
  constructor() {
    super()

    makeObservable(this, {
      targets: observable,
      target: observable,
      panel: observable,
      ready: observable,
    })

    this.bindEvent()
    this.init()
  }
  selectTarget = (target: string | ITarget | null) => {
    if (isStr(target)) {
      const d = find(this.targets, ({ key }) => key === target)
      if (d) {
        this.target = d
      }
    } else {
      this.target = target
    }

    setMainStore('target', this.target)
  }
  selectPanel(panel: string) {
    this.panel = panel
    setMainStore('panel', panel)
  }
  refreshTargets = async () => {
    const targets = await main.getTargets()
    runInAction(() => {
      this.targets = targets
      setMemStore('targets', targets)
    })
    if (!isEmpty(targets)) {
      if (!this.target) {
        this.selectTarget(targets[0])
      } else {
        const target = find(targets, ({ key }) => key === this.target!.key)
        if (!target) {
          this.selectTarget(targets[0])
        }
      }
    } else {
      if (this.target) {
        this.selectTarget(null)
      }
    }
  }
  private async init() {
    const panel = await main.getMainStore('panel')
    if (panel) {
      runInAction(() => (this.panel = panel))
    }

    const target = await main.getMainStore('target')
    if (target) {
      runInAction(() => (this.target = target))
    }
    await this.refreshTargets()

    this.ready = true
  }
  private bindEvent() {
    main.on('changeTarget', this.refreshTargets)
  }
}

export default new Store()
