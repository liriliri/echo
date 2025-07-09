import isWindows from 'licia/isWindows.js'

const pkg = await fs.readJson('package.json')
const electron = pkg.devDependencies.electron
delete pkg.devDependencies
pkg.devDependencies = {
  electron,
}
delete pkg.scripts
pkg.scripts = {
  start: 'electron main/index.js',
}
pkg.main = 'main/index.js'

await $`npm run build:main`
await $`npm run build:preload`
await $`npm run build:renderer`

await fs.copy('build', 'dist/build')
if (isWindows) {
  await fs.copy('resources/hdc/win', 'dist/resources/hdc')
} else {
  if (process.arch === 'arm64') {
    await fs.copy('resources/hdc/mac/arm64', 'dist/resources/hdc')
  } else {
    await fs.copy('resources/hdc/mac/x64', 'dist/resources/hdc')
  }
}
await fs.copy('resources/uitestkit_sdk', 'dist/resources/uitestkit_sdk')
cd('dist')

await fs.writeJson('package.json', pkg, {
  spaces: 2,
})

await $`npm i --production`
