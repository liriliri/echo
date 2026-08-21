export interface BundleInfo {
  bundleName: string
  versionName: string
  icon: string
  label: string
  system: boolean
  apiTargetVersion: number
  vendor: string
  installTime: number
  releaseType: string
  mainAbility?: string
}

export function parseBmDumpJson(dump: string): any {
  const lines = dump.split('\n')
  return JSON.parse(lines.slice(1).join('\n'))
}

export function createBundleInfo(bundleName: string, info: any): BundleInfo {
  const bundleInfo: BundleInfo = {
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
): BundleInfo[] {
  const result: BundleInfo[] = []

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
