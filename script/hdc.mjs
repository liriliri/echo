import path from 'path'
import os from 'os'
import normalizePath from 'licia/normalizePath.js'
import isWindows from 'licia/isWindows.js'

const hdcDir = resolve(__dirname, '../resources/hdc')
await fs.ensureDir(hdcDir)

let platform = 'mac'
if (isWindows) {
  platform = 'win'
}

const url = `https://raw.githubusercontent.com/liriliri/electron-resources/master/hdc/hdc-${platform}-${os.arch()}.zip`

const zipPath = resolve(hdcDir, 'hdc.zip')
await $`curl -Lk ${url} > ${zipPath}`
await $`unzip -o ${zipPath} -d ${hdcDir}`
await fs.remove(zipPath)

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
