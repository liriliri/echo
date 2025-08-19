import path from 'path'
import os from 'os'
import normalizePath from 'licia/normalizePath.js'
import isWindows from 'licia/isWindows.js'

const hdcDir = normalizePath(path.resolve(__dirname, '../resources/hdc'))
await fs.ensureDir(hdcDir)

let platform = 'mac'
if (isWindows) {
  platform = 'win'
}

const url = `https://release.liriliri.io/echo/hdc-${platform}-${os.arch()}.zip`

const zipPath = path.join(hdcDir, 'hdc.zip')
await $`curl -Lk ${url} > ${zipPath}`
await $`unzip -o ${zipPath} -d ${hdcDir}`
await fs.remove(zipPath)
