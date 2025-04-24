import { FC, PropsWithChildren, useEffect, useState } from 'react'
import Toolbar from './components/toolbar/Toolbar'
import Style from './App.module.scss'
import { observer } from 'mobx-react-lite'
import store from './store'
import Overview from './components/overview/Overview'
import Screenshot from './components/screenshot/Screenshot'
import Application from './components/application/Application'
import { createPortal } from 'react-dom'
import LunaModal from 'luna-modal/react'
import { t } from '../../common/util'
import icon from '../assets/icon.png'
import Process from './components/process/Process'
import Shell from './components/shell/Shell'
import Layout from './components/layout/Layout'
import Modal from 'luna-modal'
import Webview from './components/webview/Webview'
import Hilog from './components/hilog/Hilog'

export default observer(function App() {
  const [aboutVisible, setAboutVisible] = useState(false)

  useEffect(() => {
    const offShowAbout = main.on('showAbout', () => setAboutVisible(true))
    const offUpdateError = main.on('updateError', () => {
      Modal.alert(t('updateErr'))
    })
    const offUpdateNotAvailable = main.on('updateNotAvailable', () => {
      Modal.alert(t('updateNotAvailable'))
    })
    const offUpdateAvailable = main.on('updateAvailable', async () => {
      const result = await Modal.confirm(t('updateAvailable'))
      if (result) {
        main.openExternal('https://echo.liriliri.io')
      }
    })
    return () => {
      offShowAbout()
      offUpdateError()
      offUpdateNotAvailable()
      offUpdateAvailable()
    }
  }, [])

  return (
    <>
      <Toolbar />
      {store.isInit && (
        <div className={Style.workspace}>
          <div
            className={Style.panels}
            key={store.target ? store.target.key : ''}
          >
            <Panel panel="overview">
              <Overview />
            </Panel>
            <Panel panel="application">
              <Application />
            </Panel>
            <Panel panel="process">
              <Process />
            </Panel>
            <Panel panel="shell">
              <Shell />
            </Panel>
            <Panel panel="layout">
              <Layout />
            </Panel>
            <Panel panel="screenshot">
              <Screenshot />
            </Panel>
            <Panel panel="hilog">
              <Hilog />
            </Panel>
            <Panel panel="webview">
              <Webview />
            </Panel>
          </div>
        </div>
      )}
      {createPortal(
        <LunaModal
          title={t('aboutEcho')}
          visible={aboutVisible}
          width={400}
          onClose={() => setAboutVisible(false)}
        >
          <div className={Style.about}>
            <img className={Style.icon} src={icon} />
            <div>ECHO</div>
            <div>
              {t('version')} {ECHO_VERSION}
            </div>
          </div>
        </LunaModal>,
        document.body
      )}
    </>
  )
})

interface IPanelProps {
  panel: string
}

const Panel: FC<PropsWithChildren<IPanelProps>> = observer(function Panel(
  props
) {
  const [used, setUsed] = useState(false)

  let visible = false

  if (store.panel === props.panel) {
    if (!used) {
      setUsed(true)
    }
    visible = true
  }

  const style: React.CSSProperties = {}
  if (!visible) {
    style.opacity = 0
    style.pointerEvents = 'none'
  }

  return (
    <div className={Style.panel} style={style}>
      {used ? props.children : null}
    </div>
  )
})
