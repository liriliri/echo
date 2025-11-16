import { observer } from 'mobx-react-lite'
import { useCallback, useEffect, useRef, useState } from 'react'
import store from '../../store'
import LunaDataGrid from 'luna-data-grid/react'
import Style from './Process.module.scss'
import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import fileSize from 'licia/fileSize'
import className from 'licia/className'
import has from 'licia/has'
import isEmpty from 'licia/isEmpty'
import { t } from 'common/util'
import LunaModal from 'luna-modal'
import singleton from 'licia/singleton'
import map from 'licia/map'
import find from 'licia/find'
import DataGrid from 'luna-data-grid'
import { useWindowResize } from 'share/renderer/lib/hooks'

export default observer(function Process() {
  const [processes, setProcesses] = useState<any[]>([])
  const bundlesRef = useRef<any[]>([])
  const dataGridRef = useRef<DataGrid>(null)
  const [selected, setSelected] = useState<any>(null)
  const [filter, setFilter] = useState('')

  const { target } = store

  const getBundles = useCallback(
    singleton(async function () {
      if (!target) {
        return
      }
      bundlesRef.current = await main.getBundles(target.key)
    }),
    []
  )

  const getProcesses = useCallback(
    singleton(async function () {
      if (target) {
        if (isEmpty(bundlesRef.current)) {
          getBundles()
        }
        const allProcesses = await main.getProcesses(target.key)
        let processes = map(allProcesses, (process: any) => {
          const bundleName = find(bundlesRef.current, (bundleName) => {
            const match = process.name.match(/^[\w.]+/)
            if (!match) {
              return false
            }

            return match[0] === bundleName
          })

          if (bundleName) {
            return {
              ...process,
              bundleName,
            }
          } else {
            return process
          }
        })
        if (!isEmpty(bundlesRef.current) && store.process.onlyBundle) {
          processes = processes.filter((process) => {
            return process.bundleName
          })
        }
        setProcesses(processes)
      }
    }),
    []
  )

  useEffect(() => {
    let destroyed = false

    async function refresh() {
      if (store.panel === 'process') {
        await getProcesses()
      }
      if (!destroyed) {
        setTimeout(refresh, 5000)
      }
    }
    refresh()

    return () => {
      destroyed = true
    }
  }, [])

  useWindowResize(() => dataGridRef.current?.fit())

  async function stop() {
    if (!selected || !has(selected, 'bundleName')) {
      return
    }
    const result = await LunaModal.confirm(
      t('stopBundleConfirm', { name: selected.bundleName })
    )
    if (result) {
      await main.stopBundle(target!.key, selected.bundleName)
      await getProcesses()
    }
  }

  return (
    <div className={className('panel-with-toolbar', Style.container)}>
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarCheckbox
          keyName="onlyBundle"
          value={store.process.onlyBundle}
          label={t('onlyBundle')}
          onChange={(val) => {
            getProcesses()
            store.process.set('onlyBundle', val)
          }}
        />
        <LunaToolbarSeparator />
        <LunaToolbarText
          text={t('totalProcess', { total: processes.length })}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          disabled={selected === null || !has(selected, 'bundleName')}
          icon="delete"
          title={t('stop')}
          onClick={stop}
        />
      </LunaToolbar>
      <LunaDataGrid
        onSelect={async (node) => setSelected(node.data)}
        onDeselect={() => setSelected(null)}
        filter={filter}
        className={Style.processes}
        data={processes}
        columns={columns}
        selectable={true}
        uniqueId="pid"
        onCreate={(dataGrid) => {
          dataGridRef.current = dataGrid
          dataGrid.fit()
        }}
      />
    </div>
  )
})

const columns = [
  {
    id: 'name',
    title: t('processName'),
    sortable: true,
    weight: 30,
  },
  {
    id: '%cpu',
    title: '% CPU',
    sortable: true,
  },
  {
    id: 'time+',
    title: t('cpuTime'),
    sortable: true,
  },
  {
    id: 'res',
    title: t('memory'),
    sortable: true,
    comparator: (a: string, b: string) => fileSize(a) - fileSize(b),
  },
  {
    id: 'pid',
    title: 'PID',
    sortable: true,
  },
  {
    id: 'user',
    title: t('user'),
    sortable: true,
  },
]
