import path from 'path'
import os from 'os'
import normalizePath from 'licia/normalizePath.js'
import isWindows from 'licia/isWindows.js'

// hdc
const hdcDir = resolve(__dirname, '../resources/hdc')
await fs.ensureDir(hdcDir)

let platform = 'mac'
if (isWindows) {
  platform = 'win'
}

const hdcUrl = `https://raw.githubusercontent.com/liriliri/electron-resources/master/hdc/hdc-${platform}-${os.arch()}.zip`

const hdcZipPath = resolve(hdcDir, 'hdc.zip')
await $`curl -Lk ${hdcUrl} > ${hdcZipPath}`
await $`unzip -o ${hdcZipPath} -d ${hdcDir}`
await fs.remove(hdcZipPath)

// uitestkit
const uitestkitUrl =
  'https://raw.githubusercontent.com/liriliri/electron-resources/master/echo/uitestkit_sdk-1.1.0.zip'

const uitestkitDir = resolve(__dirname, '../resources/uitestkit_sdk')
await fs.ensureDir(uitestkitDir)

const uitestkitZipPath = resolve(uitestkitDir, 'uitestkit_sdk.zip')
await $`curl -Lk ${uitestkitUrl} > ${uitestkitZipPath}`
await $`unzip -o ${uitestkitZipPath} -d ${uitestkitDir}`
await fs.remove(uitestkitZipPath)

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
