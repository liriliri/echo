import { Client } from 'hdckit'
import {
  IpcForward,
  IpcListForwards,
  IpcListReverses,
  IpcRemoveForward,
  IpcReverse,
} from 'common/types'
import map from 'licia/map'
import { handleEvent } from 'share/main/lib/util'

let client: Client

const listForwards: IpcListForwards = async function (connectKey) {
  const target = await client.getTarget(connectKey)
  const forwards = await target.listForwards()
  return map(forwards, (forward) => {
    return {
      local: forward.local,
      remote: forward.remote,
    }
  })
}

const forward: IpcForward = async function (connectKey, local, remote) {
  const target = await client.getTarget(connectKey)
  await target.forward(local, remote)
}

const removeForward: IpcRemoveForward = async function (
  connectKey,
  local,
  remote
) {
  const target = await client.getTarget(connectKey)
  await target.removeForward(local, remote)
}

const listReverses: IpcListReverses = async function (connectKey) {
  const target = await client.getTarget(connectKey)
  const reverses = await target.listReverses()
  return map(reverses, (reverse) => {
    return {
      local: reverse.local,
      remote: reverse.remote,
    }
  })
}

const reverse: IpcReverse = async function (connectKey, remote, local) {
  const target = await client.getTarget(connectKey)
  await target.reverse(remote, local)
}

const removeReverse: IpcRemoveForward = async function (
  connectKey,
  remote,
  local
) {
  const target = await client.getTarget(connectKey)
  await target.removeReverse(remote, local)
}

export function init(c: Client) {
  client = c

  handleEvent('listForwards', listForwards)
  handleEvent('listReverses', listReverses)
  handleEvent('forward', forward)
  handleEvent('reverse', reverse)
  handleEvent('removeForward', removeForward)
  handleEvent('removeReverse', removeReverse)
}
