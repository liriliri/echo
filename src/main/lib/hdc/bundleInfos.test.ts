import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBundleInfosFromDumps } from './bundleInfos.ts'

function dumpText(bundleName: string, info: unknown) {
  return `${bundleName}:\n${JSON.stringify(info, null, 4)}`
}

function happyDump(bundleName: string) {
  return dumpText(bundleName, {
    installTime: 1710000000000,
    releaseType: 'Release',
    mainEntry: 'entry',
    hapModuleNames: ['entry'],
    hapModuleInfos: [
      {
        name: 'entry',
        mainAbility: 'EntryAbility',
        abilityInfos: [{ name: 'EntryAbility' }],
      },
    ],
    applicationInfo: {
      isSystemApp: false,
      versionName: '1.2.3',
      apiTargetVersion: 12,
      vendor: 'Example',
    },
  })
}

function missingMainEntryDump(bundleName: string) {
  return dumpText(bundleName, {
    installTime: 1710000001000,
    releaseType: 'Release',
    mainEntry: 'entry',
    hapModuleNames: ['feature'],
    hapModuleInfos: [
      {
        name: 'feature',
        mainAbility: 'FeatureAbility',
        abilityInfos: [{ name: 'FeatureAbility' }],
      },
    ],
    applicationInfo: {
      isSystemApp: false,
      versionName: '2.0.0',
      apiTargetVersion: 11,
      vendor: 'Other',
    },
  })
}

describe('getBundleInfosFromDumps', () => {
  it('returns bundle info on the happy path', () => {
    const bundleName = 'com.example.good'
    assert.deepEqual(
      getBundleInfosFromDumps([bundleName], [happyDump(bundleName)]),
      [
        {
          bundleName,
          label: bundleName,
          icon: '',
          system: false,
          versionName: '1.2.3',
          apiTargetVersion: 12,
          vendor: 'Example',
          installTime: 1710000000000,
          releaseType: 'Release',
          mainAbility: 'EntryAbility',
        },
      ],
    )
  })

  it('keeps other bundles when one dump is not JSON', () => {
    const good = 'com.example.good'
    const bad = 'com.example.broken'
    const infos = getBundleInfosFromDumps(
      [good, bad],
      [happyDump(good), `${bad}:\nnot-json {{{`],
    )

    assert.equal(infos.length, 1)
    assert.equal(infos[0].bundleName, good)
    assert.equal(infos[0].mainAbility, 'EntryAbility')
  })

  it('lists a bundle when mainEntry indexOf is -1', () => {
    const orphan = 'com.example.orphan'
    const infos = getBundleInfosFromDumps(
      [orphan],
      [missingMainEntryDump(orphan)],
    )

    assert.equal(infos.length, 1)
    assert.equal(infos[0].bundleName, orphan)
    assert.equal(infos[0].versionName, '2.0.0')
    assert.equal(infos[0].mainAbility, undefined)
  })

  it('does not empty the list when a bad JSON dump is mixed with indexOf -1', () => {
    const good = 'com.example.good'
    const bad = 'com.example.broken'
    const orphan = 'com.example.orphan'
    const infos = getBundleInfosFromDumps(
      [good, bad, orphan],
      [
        happyDump(good),
        `${bad}:\n[truncated dump`,
        missingMainEntryDump(orphan),
      ],
    )

    assert.deepEqual(
      infos.map((info) => info.bundleName),
      [good, orphan],
    )
    assert.equal(infos[0].mainAbility, 'EntryAbility')
    assert.equal(infos[1].mainAbility, undefined)
  })
})
