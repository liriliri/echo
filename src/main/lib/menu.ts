import { Menu, MenuItemConstructorOptions, app, shell } from 'electron'
import * as window from 'share/main/lib/window'
import isMac from 'licia/isMac'
import { t } from '../../common/util'
import upperCase from 'licia/upperCase'
import isWindows from 'licia/isWindows'
import { handleEvent } from 'share/main/lib/util'

function getTemplate(): MenuItemConstructorOptions[] {
  const hideMenu = isMac
    ? [
        {
          type: 'separator',
        },
        {
          label: t('hideHaro'),
          role: 'hide',
        },
        {
          label: t('hideOthers'),
          role: 'hideothers',
        },
        {
          label: t('showAll'),
          role: 'unhide',
        },
      ]
    : []

  const haro = {
    label: upperCase(app.name),
    submenu: [
      {
        label: t('aboutHaro'),
        click() {
          window.sendTo('main', 'showAbout')
        },
      },
      ...hideMenu,
      {
        type: 'separator',
      },
      {
        label: t('quitHaro'),
        click() {
          window.getWin('main')?.close()
        },
      },
    ],
  }

  const edit = {
    label: t('edit'),
    submenu: [
      {
        role: 'cut',
        label: t('cut'),
      },
      {
        role: 'copy',
        label: t('copy'),
      },
      {
        role: 'paste',
        label: t('paste'),
      },
      {
        role: 'delete',
        label: t('delete'),
      },
      {
        role: 'selectAll',
        label: t('selectAll'),
      },
    ],
  }

  const tools = {
    label: t('tools'),
    submenu: [
      {
        label: t('terminal'),
        click() {
          // terminal.showWin()
        },
      },
    ],
  }

  const help: any = {
    role: 'help',
    label: t('help'),
    submenu: [
      {
        label: t('donate'),
        click() {
          shell.openExternal('http://surunzi.com/wechatpay.html')
        },
      },
      {
        label: t('reportIssue'),
        click() {
          shell.openExternal('https://github.com/liriliri/haro/issues')
        },
      },
      {
        type: 'separator',
      },
      {
        role: 'toggledevtools',
        label: t('toggleDevtools'),
      },
    ],
  }

  const template = [tools, help]
  if (isMac) {
    template.unshift(haro, edit)
  } else {
    template.unshift(haro)
  }

  return template
}

function updateMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(getTemplate()))

  if (isWindows) {
    window.sendTo('main', 'refreshMenu')
  }
}

export function init() {
  updateMenu()

  handleEvent('updateMenu', updateMenu)
}
