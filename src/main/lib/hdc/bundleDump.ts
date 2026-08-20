import { IBundleInfo } from '../../../common/types'

const RESOURCE_REF_RE = /^\$[a-z]+:/i
const IMAGE_PATH_RE = /\.(png|jpe?g|webp|gif|svg|bmp)$/i

export function isResourceRef(value: string): boolean {
  return RESOURCE_REF_RE.test(value)
}

export function isDisplayableLabel(value?: string | null): boolean {
  if (!value) {
    return false
  }
  const label = value.trim()
  return label.length > 0 && !isResourceRef(label)
}

export function isLocalIconPath(value?: string | null): boolean {
  if (!value) {
    return false
  }
  const icon = value.trim()
  if (!icon || isResourceRef(icon)) {
    return false
  }
  if (icon.startsWith('/') || icon.startsWith('file:')) {
    return !/\.json$/i.test(icon)
  }
  return IMAGE_PATH_RE.test(icon)
}

export function isRemoteIcon(value?: string | null): boolean {
  if (!value) {
    return false
  }
  return /^(https?:|data:)/i.test(value.trim())
}

function firstDisplayableLabel(candidates: Array<string | undefined>): string {
  for (let i = 0, len = candidates.length; i < len; i++) {
    const value = candidates[i]
    if (isDisplayableLabel(value)) {
      return (value as string).trim()
    }
  }
  return ''
}

function firstLocalIconPath(candidates: Array<string | undefined>): string {
  for (let i = 0, len = candidates.length; i < len; i++) {
    const value = candidates[i]
    if (isLocalIconPath(value)) {
      return (value as string).trim()
    }
  }
  return ''
}

function getMainModule(dump: any) {
  if (!dump) {
    return null
  }
  const hapModuleInfos = dump.hapModuleInfos
  if (!Array.isArray(hapModuleInfos) || hapModuleInfos.length === 0) {
    return null
  }
  const mainEntry = dump.mainEntry
  if (mainEntry && Array.isArray(dump.hapModuleNames)) {
    const index = dump.hapModuleNames.indexOf(mainEntry)
    if (index >= 0 && hapModuleInfos[index]) {
      return hapModuleInfos[index]
    }
  }
  return hapModuleInfos[0]
}

function getMainAbilityInfo(mainModule: any) {
  if (!mainModule) {
    return null
  }
  const abilityInfos = mainModule.abilityInfos
  if (!Array.isArray(abilityInfos) || abilityInfos.length === 0) {
    return null
  }
  if (mainModule.mainAbility) {
    const match = abilityInfos.find(
      (ability: any) =>
        ability &&
        (ability.name === mainModule.mainAbility ||
          ability.name?.endsWith(mainModule.mainAbility))
    )
    if (match) {
      return match
    }
  }
  return abilityInfos[0]
}

export function parseBmDumpOutput(dumpText: string): any {
  const lines = dumpText.split('\n')
  const jsonText = lines.slice(1).join('\n').trim()
  if (!jsonText) {
    throw new Error('empty bm dump json')
  }
  return JSON.parse(jsonText)
}

export function localDisplayFromDump(dump: any): {
  label: string
  icon: string
} {
  const applicationInfo = dump?.applicationInfo || {}
  const mainModule = getMainModule(dump)
  const mainAbility = getMainAbilityInfo(mainModule)

  return {
    label: firstDisplayableLabel([
      applicationInfo.label,
      mainModule?.label,
      mainAbility?.label,
      dump?.label,
    ]),
    icon: firstLocalIconPath([
      applicationInfo.iconPath,
      applicationInfo.icon,
      mainModule?.iconPath,
      mainModule?.icon,
      mainAbility?.iconPath,
      mainAbility?.icon,
    ]),
  }
}

export function bundleInfoFromDump(bundleName: string, dump: any): IBundleInfo {
  const applicationInfo = dump?.applicationInfo || {}
  const localDisplay = localDisplayFromDump(dump)
  const bundleInfo: IBundleInfo = {
    bundleName,
    label: localDisplay.label || bundleName,
    icon: localDisplay.icon,
    system: !!applicationInfo.isSystemApp,
    versionName: applicationInfo.versionName || '',
    apiTargetVersion: applicationInfo.apiTargetVersion || 0,
    vendor: applicationInfo.vendor || '',
    installTime: dump?.installTime || 0,
    releaseType: dump?.releaseType || '',
  }

  const mainEntry = dump?.mainEntry
  if (mainEntry && Array.isArray(dump.hapModuleInfos)) {
    const mainModuleInfo =
      dump.hapModuleInfos[dump.hapModuleNames.indexOf(mainEntry)]
    if (mainModuleInfo) {
      bundleInfo.mainAbility =
        mainModuleInfo.mainAbility || mainModuleInfo.abilityInfos?.[0]?.name
    }
  }

  return bundleInfo
}

export function applyOnlineBundleFallback(
  bundleInfo: IBundleInfo,
  onlineInfo?: { name?: string; icon?: string } | null
): IBundleInfo {
  if (!onlineInfo) {
    return bundleInfo
  }

  const next = { ...bundleInfo }
  const localLabel = localDisplayableLabel(bundleInfo)
  if (!localLabel && onlineInfo.name) {
    next.label = onlineInfo.name
  }
  if (!bundleInfo.icon && onlineInfo.icon) {
    next.icon = onlineInfo.icon
  }
  return next
}

function localDisplayableLabel(bundleInfo: IBundleInfo): boolean {
  return (
    isDisplayableLabel(bundleInfo.label) &&
    bundleInfo.label !== bundleInfo.bundleName
  )
}

export function shouldFetchOnlineBundleInfo(
  bundleName: string,
  bundleInfo: IBundleInfo
): boolean {
  if (bundleInfo.system || bundleName.startsWith('com.huawei')) {
    return false
  }
  const hasLocalLabel =
    isDisplayableLabel(bundleInfo.label) && bundleInfo.label !== bundleName
  const hasLocalIcon = !!(
    isLocalIconPath(bundleInfo.icon) || isRemoteIcon(bundleInfo.icon)
  )
  return !hasLocalLabel || !hasLocalIcon
}
