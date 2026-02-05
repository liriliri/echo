import path from 'path'
import normalizePath from 'licia/normalizePath.js'

const url =
  'https://raw.githubusercontent.com/liriliri/electron-resources/master/echo/uitestkit_sdk-1.1.0.zip'

const uitestkitDir = resolve(__dirname, '../resources/uitestkit_sdk')
await fs.ensureDir(uitestkitDir)

const zipPath = resolve(uitestkitDir, 'uitestkit_sdk.zip')
await $`curl -Lk ${url} > ${zipPath}`
await $`unzip -o ${zipPath} -d ${uitestkitDir}`
await fs.remove(zipPath)

function resolve(...args) {
  return normalizePath(path.resolve(...args))
}
