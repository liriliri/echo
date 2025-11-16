import LunaToolbar, {
  LunaToolbarCheckbox,
  LunaToolbarInput,
  LunaToolbarSeparator,
  LunaToolbarSpace,
  LunaToolbarText,
} from 'luna-toolbar/react'
import { observer } from 'mobx-react-lite'
import { useEffect, useRef, useState } from 'react'
import store from '../../store'
import map from 'licia/map'
import isEmpty from 'licia/isEmpty'
import LunaIconList from 'luna-icon-list/react'
import defaultIcon from '../../../assets/default-icon.png'
import { t } from 'common/util'
import ToolbarIcon from 'share/renderer/components/ToolbarIcon'
import { IBundleInfo } from 'common/types'
import chunk from 'licia/chunk'
import concat from 'licia/concat'
import isNull from 'licia/isNull'
import Style from './Application.module.scss'
import { PannelLoading } from '../common/loading'
import find from 'licia/find'
import endWith from 'licia/endWith'
import BundleInfoModal from './BundleInfoModal'
import LunaDataGrid from 'luna-data-grid/react'
import toEl from 'licia/toEl'
import dateFormat from 'licia/dateFormat'
import contextMenu from 'share/renderer/lib/contextMenu'
import LunaModal from 'luna-modal'
import className from 'licia/className'
import { isFileDrop, notify } from 'share/renderer/lib/util'
import { installBundles } from '../../../lib/util'
import DataGrid from 'luna-data-grid'
import { useWindowResize } from 'share/renderer/lib/hooks'

export default observer(function Application() {
  const [isLoading, setIsLoading] = useState(false)
  const [bundleInfo, setBundleInfo] = useState<IBundleInfo | null>(null)
  const [bundleInfos, setBundleInfos] = useState<IBundleInfo[]>([])
  const [filter, setFilter] = useState('')
  const [dropHighlight, setDropHighlight] = useState(false)
  const dataGridRef = useRef<DataGrid>(null)
  const [bundleInfoModalVisible, setBundleInfoModalVisible] = useState(false)
  const [isOpenEffectAnimating, setIsOpenEffectAnimating] = useState(false)
  const [openEffectStyle, setOpenEffectStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const draggingRef = useRef(0)
  const iconsRef = useRef<any[]>([])

  const { target } = store

  useEffect(() => {
    refresh()
  }, [])
  useWindowResize(() => dataGridRef.current?.fit())

  async function refresh() {
    if (!target || isLoading) {
      return
    }

    setBundleInfos([])
    setIsLoading(true)
    const bundles = await main.getBundles(
      target.key,
      store.application.sysBundle
    )
    const chunks = chunk(bundles, 5)
    let bundleInfos: IBundleInfo[] = []
    for (let i = 0, len = chunks.length; i < len; i++) {
      const chunk: string[] = chunks[i]
      bundleInfos = concat(
        bundleInfos,
        await main.getBundleInfos(target.key, chunk)
      )
      iconsRef.current = map(bundleInfos, (info) => {
        const style: any = {
          borderRadius: '20%',
        }

        return {
          info: info,
          src: info.icon || defaultIcon,
          name: info.label,
          style,
        }
      })
      setBundleInfos(bundleInfos)
    }
    setIsLoading(false)
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDropHighlight(false)
    const files = e.dataTransfer.files
    const apkPaths: string[] = []
    for (let i = 0, len = files.length; i < len; i++) {
      const path = preload.getPathForFile(files[i])
      if (!endWith(path, '.hap')) {
        continue
      }
      apkPaths.push(path)
    }
    await install(apkPaths)
  }

  async function install(hapPaths?: string[]) {
    const result = await installBundles(target!.key, hapPaths)
    if (result) {
      refresh()
    }
  }

  function showInfo(bunldeName: string) {
    const bundleInfo = find(
      bundleInfos,
      (info) => info.bundleName === bunldeName
    )
    if (bundleInfo) {
      setBundleInfo(bundleInfo)
      setBundleInfoModalVisible(true)
    }
  }

  async function open(bundleName: string, ability: string) {
    await main.startBundle(store.target!.key, bundleName, ability)
  }

  function onContextMenu(e: PointerEvent, info: IBundleInfo) {
    const target = store.target!

    const template: any[] = [
      {
        label: t('bundleInfo'),
        click() {
          showInfo(info.bundleName)
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('open'),
        click: () => {
          if (info.mainAbility) {
            open(info.bundleName, info.mainAbility)
          }
        },
      },
      {
        label: t('stop'),
        click: async () => {
          const result = await LunaModal.confirm(
            t('stopBundleConfirm', { name: info.label })
          )
          if (result) {
            await main.stopBundle(target.key, info.bundleName)
          }
        },
      },
      {
        type: 'separator',
      },
      {
        label: t('cleanCache'),
        click: async () => {
          const result = await LunaModal.confirm(
            t('cleanCacheConfirm', { name: info.label })
          )
          if (result) {
            await main.cleanBundleCache(target.key, info.bundleName)
            notify(t('cacheCleaned'), { icon: 'success' })
          }
        },
      },
      {
        label: t('cleanData'),
        click: async () => {
          const result = await LunaModal.confirm(
            t('cleanDataConfirm', { name: info.label })
          )
          if (result) {
            await main.cleanBundleData(target.key, info.bundleName)
            notify(t('dataCleaned'), { icon: 'success' })
          }
        },
      },
      {
        label: t('uninstall'),
        click: async () => {
          const result = await LunaModal.confirm(
            t('uninstallConfirm', { name: info.label })
          )
          if (result) {
            await main.uninstallBundle(target.key, info.bundleName)
            refresh()
          }
        },
      },
    ]

    contextMenu(e, template)
  }

  const applications = (
    <div
      className={Style.applications}
      style={{
        overflowY: store.application.listView ? 'hidden' : 'auto',
      }}
      onDrop={onDrop}
      onDragEnter={() => {
        draggingRef.current++
      }}
      onDragLeave={() => {
        draggingRef.current--
        if (draggingRef.current === 0) {
          setDropHighlight(false)
        }
      }}
      onDragOver={(e) => {
        if (!isFileDrop(e)) {
          return
        }
        e.preventDefault()
        setDropHighlight(true)
      }}
    >
      {store.application.listView ? (
        <LunaDataGrid
          onClick={(e: any, node) => {
            showInfo((node.data as any).bundleName)
          }}
          onDoubleClick={(e: any, node) => {
            const info = (node.data as any).info
            if (info.mainAbility) {
              open(info.bundleName, info.mainAbility)
            }
          }}
          onContextMenu={(e: any, node) => {
            onContextMenu(e, (node.data as any).info)
          }}
          filter={filter}
          columns={columns}
          data={map(bundleInfos, (info: IBundleInfo) => {
            return {
              info,
              label: toEl(
                `<span><img src="${info.icon || defaultIcon}" />${
                  info.label
                }</span>`
              ),
              bundleName: info.bundleName,
              versionName: info.versionName,
              vendor: info.vendor,
              apiTargetVersion: info.apiTargetVersion,
              installTime: dateFormat(
                new Date(info.installTime),
                'yyyy-mm-dd HH:MM:ss'
              ),
              releaseType: info.releaseType,
            }
          })}
          selectable={true}
          uniqueId="bundleName"
          onCreate={(dataGrid) => {
            dataGridRef.current = dataGrid
            dataGrid.fit()
          }}
        />
      ) : (
        <LunaIconList
          icons={iconsRef.current}
          size={store.application.itemSize}
          filter={filter}
          onClick={(e: any, icon) => {
            const info = (icon.data as any).info
            showInfo(info.bundleName)
          }}
          onDoubleClick={(e: any, icon) => {
            const info = (icon.data as any).info
            if (!info.mainAbility) {
              return
            }
            const container: HTMLElement = icon.container
            const clientRect = container.getBoundingClientRect()
            setOpenEffectStyle({
              left: clientRect.left,
              top: clientRect.top - 60,
              width: clientRect.width,
              height: clientRect.width,
            })
            open(info.bundleName, info.mainAbility)
            setIsOpenEffectAnimating(true)
          }}
          onContextMenu={(e: any, icon) => {
            onContextMenu(e, (icon.data as any).info)
          }}
        />
      )}
      <div
        className={className({
          [Style.openEffect]: true,
          [Style.openEffectAnimation]: isOpenEffectAnimating,
        })}
        style={openEffectStyle}
        onAnimationEnd={() => setIsOpenEffectAnimating(false)}
      />
    </div>
  )

  return (
    <div className="panel-with-toolbar">
      <LunaToolbar className="panel-toolbar">
        <LunaToolbarInput
          keyName="filter"
          value={filter}
          placeholder={t('filter')}
          onChange={(val) => setFilter(val)}
        />
        <LunaToolbarCheckbox
          keyName="sysBundle"
          value={store.application.sysBundle}
          label={t('sysBundle')}
          onChange={(val) => {
            store.application.set('sysBundle', val)
            refresh()
          }}
          disabled={isLoading}
        />
        <LunaToolbarSeparator />
        <LunaToolbarText
          text={t('totalBundle', { total: bundleInfos.length })}
        />
        <LunaToolbarSpace />
        <ToolbarIcon
          icon="add"
          title={t('install')}
          onClick={() => install()}
          disabled={!target}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="zoom-in"
          title={t('zoomIn')}
          disabled={
            store.application.listView ||
            store.application.itemSize > 256 ||
            isEmpty(bundleInfos)
          }
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 1.2)
            store.application.set('itemSize', itemSize)
          }}
        />
        <ToolbarIcon
          icon="zoom-out"
          title={t('zoomOut')}
          disabled={
            store.application.listView ||
            store.application.itemSize < 32 ||
            isEmpty(bundleInfos)
          }
          onClick={() => {
            const itemSize = Math.round(store.application.itemSize * 0.8)
            store.application.set('itemSize', itemSize)
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="grid"
          title={t('iconView')}
          state={store.application.listView ? '' : 'hover'}
          onClick={() => {
            if (store.application.listView) {
              store.application.set('listView', false)
            }
          }}
        />
        <ToolbarIcon
          icon="list"
          title={t('listView')}
          state={store.application.listView ? 'hover' : ''}
          onClick={() => {
            if (!store.application.listView) {
              store.application.set('listView', true)
            }
          }}
        />
        <LunaToolbarSeparator />
        <ToolbarIcon
          icon="refresh"
          title={t('refresh')}
          disabled={isLoading || !target}
          onClick={() => refresh()}
        />
      </LunaToolbar>
      <div
        className={className('panel-body', {
          [Style.highlight]: dropHighlight,
        })}
      >
        {isLoading && isEmpty(bundleInfos) ? <PannelLoading /> : applications}
      </div>
      {!isNull(bundleInfo) && (
        <BundleInfoModal
          bundleInfo={bundleInfo}
          visible={bundleInfoModalVisible}
          onClose={() => setBundleInfoModalVisible(false)}
        />
      )}
    </div>
  )
})

const columns = [
  {
    id: 'label',
    title: t('name'),
    sortable: true,
    weight: 20,
  },
  {
    id: 'bundleName',
    title: t('bundleName'),
    sortable: true,
    weight: 20,
  },
  {
    id: 'versionName',
    title: t('version'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'vendor',
    title: t('vendor'),
    sortable: true,
    weight: 10,
  },
  {
    id: 'apiTargetVersion',
    title: t('apiTargetVersion'),
    sortable: true,
    weight: 15,
  },
  {
    id: 'installTime',
    title: t('installTime'),
    sortable: true,
    weight: 15,
  },
  {
    id: 'releaseType',
    title: t('releaseType'),
    sortable: true,
    weight: 10,
  },
]
