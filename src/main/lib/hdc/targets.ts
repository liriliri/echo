export interface HdcTargetInfo {
  name: string
  key: string
  ohosVersion: string
  sdkVersion: string
}

export interface HdcTargetClient {
  listTargets(): Promise<string[]>
  getTarget(connectKey: string): {
    getParameters(): Promise<Record<string, any>>
  }
}

export function parseOhosVersion(softwareVersion: unknown): string {
  if (typeof softwareVersion !== 'string') {
    return ''
  }

  const trimmed = softwareVersion.trim()
  if (!trimmed) {
    return ''
  }

  const tokens = trimmed.split(/\s+/)
  const versionToken = tokens.length > 1 ? tokens[1] : tokens[0]
  const parenIdx = versionToken.indexOf('(')
  const version =
    parenIdx === -1 ? versionToken : versionToken.slice(0, parenIdx)

  return version.trim()
}

export async function getTargets(
  client: HdcTargetClient
): Promise<HdcTargetInfo[]> {
  let connectKeys: string[]
  try {
    connectKeys = await client.listTargets()
  } catch {
    return []
  }

  const results = await Promise.all(
    connectKeys.map(async (connectKey) => {
      try {
        const parameters = await client.getTarget(connectKey).getParameters()
        return {
          name: parameters['const.product.name'],
          key: connectKey,
          ohosVersion: parseOhosVersion(
            parameters['const.product.software.version']
          ),
          sdkVersion: parameters['const.ohos.apiversion'],
        }
      } catch {
        return null
      }
    })
  )

  return results.filter((target): target is HdcTargetInfo => target !== null)
}
