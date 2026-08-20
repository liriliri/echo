import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getTargets, HdcTargetClient } from './targets'

function mockClient(
  entries: Record<string, Record<string, any> | Error>
): HdcTargetClient {
  return {
    listTargets: async () => Object.keys(entries),
    getTarget(connectKey: string) {
      return {
        async getParameters() {
          const value = entries[connectKey]
          if (value instanceof Error) {
            throw value
          }
          if (!value) {
            throw new Error(`unknown target: ${connectKey}`)
          }
          return value
        },
      }
    },
  }
}

describe('getTargets', () => {
  it('returns target info on the happy path', async () => {
    const client = mockClient({
      '2HU0223G15000621': {
        'const.product.name': 'ALN-AL00',
        'const.product.software.version':
          'ALN-AL00 5.0.0.22(SP35DEVC00E22R4P1log)',
        'const.ohos.apiversion': '12',
      },
    })

    assert.deepEqual(await getTargets(client), [
      {
        name: 'ALN-AL00',
        key: '2HU0223G15000621',
        ohosVersion: '5.0.0.22',
        sdkVersion: '12',
      },
    ])
  })

  it('keeps other devices when one target throws', async () => {
    const client = mockClient({
      'bad-device': new Error('getParameters failed'),
      'good-device': {
        'const.product.name': 'OH emulator',
        'const.product.software.version':
          'OpenHarmony 4.1.0(API Version 11 Release)',
        'const.ohos.apiversion': '11',
      },
    })

    assert.deepEqual(await getTargets(client), [
      {
        name: 'OH emulator',
        key: 'good-device',
        ohosVersion: '4.1.0',
        sdkVersion: '11',
      },
    ])
  })

  it('parses a version string without space or parenthesis', async () => {
    const client = mockClient({
      emulator: {
        'const.product.name': 'rk3568',
        'const.product.software.version': '5.0.0.22',
        'const.ohos.apiversion': '12',
      },
    })

    assert.deepEqual(await getTargets(client), [
      {
        name: 'rk3568',
        key: 'emulator',
        ohosVersion: '5.0.0.22',
        sdkVersion: '12',
      },
    ])
  })
})
