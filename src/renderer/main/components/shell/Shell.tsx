import { observer } from 'mobx-react-lite'
import LunaToolbar, {
  LunaToolbarSpace,
} from 'luna-toolbar/react'
import Term from './Term'
import LunaTab, { LunaTabItem } from 'luna-tab/react'
import { t } from '../../../../common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import store from '../../store'
import Style from './Shell.module.scss'
import className from 'licia/className'
import { useEffect, useRef, useState } from 'react'
import uuid from 'licia/uuid'
import map from 'licia/map'
import filter from 'licia/filter'
import LunaCommandPalette from 'luna-command-palette/react'
import find from 'licia/find'
import idxOf from 'licia/idxOf'
import { Terminal } from '@xterm/xterm'

interface IShell {
  id: string
  name: string
  sessionId: string
  terminal?: Terminal
}

export default observer(function Shell() {
  const [shells, setShells] = useState<Array<IShell>>([])
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false)
  const [selectedShell, setSelectedShell] = useState<IShell>({
    id: '',
    name: '',
    sessionId: '',
  })
  const numRef = useRef(1)
  const { target } = store

  useEffect(() => add(), [])

  function add() {
    const id = uuid()
    const shell = {
      id,
      name: `${t('shell')} ${numRef.current++}`,
      sessionId: '',
    }
    setShells([...shells, shell])
    setSelectedShell(shell)
  }

  
  function close(id: string) {
    const closedShell = find(shells, (shell) => shell.id === id)
    let closedIdx = idxOf(shells, closedShell)
    const newShells = filter(shells, (shell) => shell.id !== id)
    setShells(newShells)

    if (closedShell === selectedShell) {
      if (closedIdx >= newShells.length) {
        closedIdx = newShells.length - 1
      }
      setSelectedShell(newShells[closedIdx])
    }
  }
  
  const tabItems = map(shells, (shell) => {
    return (
      <LunaTabItem
        key={shell.id}
        id={shell.id}
        title={shell.name}
        closable={true}
        selected={selectedShell.id === shell.id}
      />
    )
  })

  const terms = map(shells, (shell) => {
    return (
      <Term
        key={shell.id}
        onSessionIdChange={(id) => {
          shell.sessionId = id
        }}
        onCreate={(terminal) => {
          shell.terminal = terminal
        }}
        visible={selectedShell.id === shell.id && store.panel === 'shell'}
      />
    )
  })

  const commands = map(getCommands(), ([title, command]) => {
    return {
      title: `${title} (${command})`,
      handler: () => {
        main.writeShell(selectedShell.sessionId, command)
        setTimeout(() => {
          if (selectedShell.terminal) {
            selectedShell.terminal.focus()
          }
        }, 500)
      },
    }
  })

  return (
    <div className="panel-with-toolbar">
      <div className={className('panel-toolbar', Style.toolbar)}>
        <LunaTab
          className={Style.tabs}
          height={31}
          onSelect={(id) => {
            const shell = find(shells, (shell) => shell.id === id)
            if (shell) {
              setSelectedShell(shell)
            }
          }}
          onClose={close}
        >
          {tabItems}
        </LunaTab>
        <LunaToolbar className={Style.control}>
          <ToolbarIcon
            icon="add"
            title={t('add')}
            onClick={add}
            disabled={!target}
          />
          <LunaToolbarSpace />
          <ToolbarIcon
            icon="list"
            title={t('shortcut')}
            onClick={() => setCommandPaletteVisible(true)}
            disabled={!target}
          />
        </LunaToolbar>
      </div>
      <div className="panel-body">
        {terms}
        <LunaCommandPalette
          placeholder={t('typeCmd')}
          visible={commandPaletteVisible}
          onClose={() => setCommandPaletteVisible(false)}
          commands={commands}
        />
      </div>
    </div>
  )
})

function getCommands() {
  return [
    [t('reboot'), 'reboot\n'],
    [t('getUdid'), 'bm get --udid\n'],
    [t('batteryInfo'), 'hidumper -s BatteryService -a -i\n'],
  ]
}
