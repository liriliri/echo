import { IpcCreateShell, IpcKillShell, IpcWriteShell } from 'common/types'
import { Client } from 'hdckit'
import Emitter from 'licia/Emitter'
import uniqId from 'licia/uniqId'
import types from 'licia/types'
import * as window from 'share/main/lib/window'
import { handleEvent } from 'share/main/lib/util'

let client: Client

class HdcPty extends Emitter {
  private connection: any
  constructor(connection: any) {
    super()

    this.connection = connection
  }
  async init() {
    const { connection } = this

    connection.send(Buffer.from('shell'))
    const { socket } = connection
    socket.on('readable', () => {
      const buf: Buffer = socket.read()
      if (buf) {
        const len = buf.readUInt32BE(0)
        const data = buf.subarray(4, len + 4)
        this.emit('data', data.toString('utf8'))
      }
    })
  }
  async write(data: string) {
    await this.connection.send(Buffer.from(data))
  }
  kill() {
    this.connection.end()
  }
}

const ptys: types.PlainObj<HdcPty> = {}

const createShell: IpcCreateShell = async (connectKey) => {
  const target = await client.getTarget(connectKey)

  const connection = await target.transport()
  const hdcPty = new HdcPty(connection)
  await hdcPty.init()
  const sessionId = uniqId('shell')
  hdcPty.on('data', (data) => {
    window.sendTo('main', 'shellData', sessionId, data)
  })
  ptys[sessionId] = hdcPty

  return sessionId
}

const writeShell: IpcWriteShell = async (sessionId, data) => {
  await ptys[sessionId].write(data)
}

const killShell: IpcKillShell = (sessionId) => {
  ptys[sessionId].kill()
  delete ptys[sessionId]
}

export async function init(c: Client) {
  client = c

  handleEvent('createShell', createShell)
  handleEvent('writeShell', writeShell)
  handleEvent('killShell', killShell)
}
