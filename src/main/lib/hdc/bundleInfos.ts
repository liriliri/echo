import { IBundleInfo } from '../../../common/types'

export function parseBmDumpJson(dump: string): any {
  const lines = dump.split('\n')
  return JSON.parse(lines.slice(1).join('\n'))
}

export function createBundleInfo(bundleName: string, info: any): IBundleInfo {
  const bundleInfo: IBundleInfo = {
    bundleName,
    label: bundleName,
    icon: '',
    system: false,
    versionName: '',
    apiTargetVersion: 0,
    vendor: '',
    installTime: 0,
    releaseType: '',
  }

  const applicationInfo = info.applicationInfo
  bundleInfo.system = applicationInfo.isSystemApp
  bundleInfo.versionName = applicationInfo.versionName
  bundleInfo.apiTargetVersion = applicationInfo.apiTargetVersion
  bundleInfo.vendor = applicationInfo.vendor
  bundleInfo.installTime = info.installTime
  bundleInfo.releaseType = info.releaseType

  const mainEntry = info.mainEntry
  if (mainEntry) {
    const hapModuleNames = info.hapModuleNames
    const hapModuleInfos = info.hapModuleInfos
    const index = Array.isArray(hapModuleNames)
      ? hapModuleNames.indexOf(mainEntry)
      : -1
    const mainModuleInfo =
      index === -1 || !Array.isArray(hapModuleInfos)
        ? undefined
        : hapModuleInfos[index]
    if (mainModuleInfo) {
      const fallbackAbility = Array.isArray(mainModuleInfo.abilityInfos)
        ? mainModuleInfo.abilityInfos[0]?.name
        : undefined
      if (mainModuleInfo.mainAbility || fallbackAbility) {
        bundleInfo.mainAbility = mainModuleInfo.mainAbility || fallbackAbility
      }
    }
  }

  return bundleInfo
}

export function getBundleInfosFromDumps(
  bundleNames: string[],
  dumpInfos: string[],
): IBundleInfo[] {
  const result: IBundleInfo[] = []

  for (let i = 0, len = bundleNames.length; i < len; i++) {
    const bundleName = bundleNames[i]
    try {
      const dump = dumpInfos[i]
      if (typeof dump !== 'string') {
        continue
      }
      const info = parseBmDumpJson(dump)
      result.push(createBundleInfo(bundleName, info))
    } catch {
      continue
    }
  }

  return result
}
