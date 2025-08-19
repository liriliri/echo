import path from 'path'
import normalizePath from 'licia/normalizePath.js'

const url = 'https://release.liriliri.io/echo/uitestkit_sdk-1.1.0.zip'

const uitestkitDir = normalizePath(
  path.resolve(__dirname, '../resources/uitestkit_sdk')
)
await fs.ensureDir(uitestkitDir)

const zipPath = path.join(uitestkitDir, 'uitestkit_sdk.zip')
await $`curl -Lk ${url} > ${zipPath}`
await $`unzip -o ${zipPath} -d ${uitestkitDir}`
await fs.remove(zipPath)
