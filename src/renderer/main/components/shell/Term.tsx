import { observer } from 'mobx-react-lite'
import store from '../../store'
import { Terminal, ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebglAddon } from '@xterm/addon-webgl'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useEffect, useRef, useState } from 'react'
import {
  colorBgContainer,
  colorBgContainerDark,
  colorPrimary,
  colorText,
  colorTextDark,
  fontFamilyCode,
} from '../../../../common/theme'
import copy from 'licia/copy'
import Style from './Term.module.scss'
import '@xterm/xterm/css/xterm.css'
import { t } from '../../../../common/util'
import contextMenu from 'share/renderer/lib/contextMenu'
import isHidden from 'licia/isHidden'
import LunaCommandPalette from 'luna-command-palette/react'
import map from 'licia/map'

interface ITermProps {
  visible: boolean
}

export default observer(function Term(props: ITermProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal>(null)
  const fitAddonRef = useRef<FitAddon>(null)
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false)
  const sessionIdRef = useRef('')

  const { target } = store

  useEffect(() => {
    const term = new Terminal({
      allowProposedApi: true,
      fontSize: 14,
      fontFamily: fontFamilyCode,
      theme: getTheme(store.theme === 'dark'),
    })

    const fitAddon = new FitAddon()
    fitAddonRef.current = fitAddon
    term.loadAddon(fitAddon)
    const fit = () => {
      if (!isHidden(terminalRef.current!)) {
        fitAddon.fit()
      }
    }
    window.addEventListener('resize', fit)

    term.loadAddon(new Unicode11Addon())
    term.unicode.activeVersion = '11'

    try {
      term.loadAddon(new WebglAddon())
      /* eslint-disable @typescript-eslint/no-unused-vars */
    } catch (e) {
      term.loadAddon(new CanvasAddon())
    }

    term.open(terminalRef.current!)
    termRef.current = term

    function onShellData(id, data) {
      if (sessionIdRef.current !== id) {
        return
      }
      term.write(data)
    }
    const offShellData = main.on('shellData', onShellData)

    if (target) {
      main.createShell(target.key).then((id) => {
        sessionIdRef.current = id
        term.onData((data) => main.writeShell(sessionIdRef.current, data))
        fit()
      })
    }

    return () => {
      offShellData()
      if (sessionIdRef.current) {
        main.killShell(sessionIdRef.current)
      }
      term.dispose()
      window.removeEventListener('resize', fit)
    }
  }, [])

  useEffect(() => {
    if (fitAddonRef.current && props.visible) {
      fitAddonRef.current.fit()
    }
    if (props.visible) {
      setTimeout(() => {
        if (termRef.current) {
          termRef.current.focus()
        }
      }, 500)
    }
  }, [props.visible])

  const theme = getTheme(store.theme === 'dark')
  if (termRef.current) {
    termRef.current.options.theme = theme
  }

  const onContextMenu = (e: React.MouseEvent) => {
    if (!target) {
      return
    }

    const term = termRef.current!
    const template: any[] = [
      {
        label: t('shortcut'),
        click() {
          setCommandPaletteVisible(true)
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('copy'),
        click() {
          if (term.hasSelection()) {
            copy(term.getSelection())
            term.focus()
          }
        },
      },
      {
        label: t('paste'),
        click: async () => {
          const text = await navigator.clipboard.readText()
          if (text) {
            main.writeShell(sessionIdRef.current, text)
          }
        },
      },
      {
        label: t('selectAll'),
        click() {
          term.selectAll()
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('reset'),
        click() {
          if (sessionIdRef.current) {
            main.killShell(sessionIdRef.current)
          }
          term.reset()
          if (target) {
            main.createShell(target.key).then((id) => {
              sessionIdRef.current = id
            })
            term.focus()
          }
        },
      },
      {
        label: t('clear'),
        click() {
          term.clear()
          term.focus()
        },
      },
    ]

    contextMenu(e, template)
  }

  const commands = map(getCommands(), ([title, command]) => {
    return {
      title: `${title} (${command})`,
      handler: () => {
        main.writeShell(sessionIdRef.current, command)
        setTimeout(() => {
          termRef.current?.focus()
        }, 500)
      },
    }
  })

  return (
    <>
      <div
        className={Style.term}
        style={{ display: props.visible ? 'block' : 'none' }}
        ref={terminalRef}
        onContextMenu={onContextMenu}
      />
      <LunaCommandPalette
        placeholder={t('typeCmd')}
        visible={commandPaletteVisible}
        onClose={() => setCommandPaletteVisible(false)}
        commands={commands}
      />
    </>
  )
})

function getCommands() {
  return [
    [t('reboot'), 'reboot\n'],
    [t('getUdid'), 'bm get --udid\n'],
    [t('batteryInfo'), 'hidumper -s BatteryService -a -i\n'],
  ]
}

function getTheme(dark = false) {
  let theme: ITheme = {
    background: colorBgContainer,
    foreground: colorText,
    cursor: colorText,
  }

  if (dark) {
    theme = {
      background: colorBgContainerDark,
      foreground: colorTextDark,
      cursor: colorTextDark,
    }
  }

  return {
    selectionForeground: '#fff',
    selectionBackground: colorPrimary,
    ...theme,
  }
}
