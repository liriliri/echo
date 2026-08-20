import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyOnlineBundleFallback,
  bundleInfoFromDump,
  isDisplayableLabel,
  isLocalIconPath,
  localDisplayFromDump,
  parseBmDumpOutput,
  shouldFetchOnlineBundleInfo,
} from './bundleDump'

const PERSONAL_BUNDLE = 'com.tonycoder.personalapp'

function personalDump(overrides: Record<string, unknown> = {}) {
  return {
    installTime: 1710000000000,
    releaseType: 'Release',
    mainEntry: 'entry',
    hapModuleNames: ['entry'],
    hapModuleInfos: [
      {
        name: 'entry',
        mainAbility: 'EntryAbility',
        label: '$string:module_label',
        icon: '$media:module_icon',
        abilityInfos: [{ name: 'EntryAbility' }],
      },
    ],
    applicationInfo: {
      bundleName: PERSONAL_BUNDLE,
      isSystemApp: false,
      versionName: '1.2.3',
      apiTargetVersion: 12,
      vendor: 'Tony',
      label: '个人工具',
      icon: '$media:app_icon',
      iconPath:
        '/data/app/el1/bundle/public/com.tonycoder.personalapp/entry/resources/base/media/app_icon.png',
    },
    ...overrides,
  }
}

describe('bundleDump from mocked bm dump JSON', () => {
  it('parses bm dump -n text and prefers local label/iconPath when AppGallery has none', () => {
    const dumpText = `${PERSONAL_BUNDLE}:
${JSON.stringify(personalDump(), null, 4)}`

    const dump = parseBmDumpOutput(dumpText)
    const bundleInfo = bundleInfoFromDump(PERSONAL_BUNDLE, dump)
    const merged = applyOnlineBundleFallback(bundleInfo, {})

    assert.equal(merged.label, '个人工具')
    assert.equal(
      merged.icon,
      '/data/app/el1/bundle/public/com.tonycoder.personalapp/entry/resources/base/media/app_icon.png'
    )
    assert.equal(merged.versionName, '1.2.3')
    assert.equal(merged.vendor, 'Tony')
    assert.equal(merged.mainAbility, 'EntryAbility')
    assert.equal(merged.system, false)
    assert.equal(shouldFetchOnlineBundleInfo(PERSONAL_BUNDLE, merged), false)
  })

  it('keeps AppGallery as fallback when local dump has only resource refs', () => {
    const dump = personalDump({
      applicationInfo: {
        bundleName: PERSONAL_BUNDLE,
        isSystemApp: false,
        versionName: '0.0.1',
        apiTargetVersion: 12,
        vendor: '',
        label: '$string:app_name',
        icon: '$media:app_icon',
        iconPath: '$media:app_icon',
      },
    })
    const local = localDisplayFromDump(dump)
    assert.equal(local.label, '')
    assert.equal(local.icon, '')

    const bundleInfo = bundleInfoFromDump(PERSONAL_BUNDLE, dump)
    assert.equal(bundleInfo.label, PERSONAL_BUNDLE)
    assert.equal(bundleInfo.icon, '')
    assert.equal(shouldFetchOnlineBundleInfo(PERSONAL_BUNDLE, bundleInfo), true)

    const merged = applyOnlineBundleFallback(bundleInfo, {
      name: 'Gallery Name',
      icon: 'https://appgallery.example/icon.png',
    })
    assert.equal(merged.label, 'Gallery Name')
    assert.equal(merged.icon, 'https://appgallery.example/icon.png')
  })

  it('does not let AppGallery overwrite a local dump label or icon path', () => {
    const bundleInfo = bundleInfoFromDump(PERSONAL_BUNDLE, personalDump())
    const merged = applyOnlineBundleFallback(bundleInfo, {
      name: 'Store Title',
      icon: 'https://appgallery.example/store.png',
    })

    assert.equal(merged.label, '个人工具')
    assert.equal(
      merged.icon,
      '/data/app/el1/bundle/public/com.tonycoder.personalapp/entry/resources/base/media/app_icon.png'
    )
  })

  it('treats resource refs as non-displayable and device iconPath as local', () => {
    assert.equal(isDisplayableLabel('$string:app_name'), false)
    assert.equal(isDisplayableLabel('个人工具'), true)
    assert.equal(isLocalIconPath('$media:app_icon'), false)
    assert.equal(
      isLocalIconPath(
        '/data/app/el1/bundle/public/com.example.app/resources/base/media/icon.png'
      ),
      true
    )
  })
})
