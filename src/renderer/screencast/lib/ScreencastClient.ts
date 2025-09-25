import types from 'licia/types'
import noop from 'licia/noop'
import Readiness from 'licia/Readiness'
import { loadImage } from './util'
import clamp from 'licia/clamp'
import store from '../store'

export default class ScreencastClient {
  canvas = document.createElement('canvas')
  ctx = this.canvas.getContext('2d')!
  ready: Promise<void>
  private connectKey: string
  private offCaptureScreen: types.AnyFn = noop
  private readiness = new Readiness()
  private isTouching = false
  constructor(connectKey: string) {
    this.connectKey = connectKey
    this.ready = this.readiness.ready('captureScreen')

    this.start()
    this.bindEvent()
  }
  async start() {
    const { connectKey } = this
    await main.stopCaptureScreen(connectKey)
    await main.startCaptureScreen(connectKey, store.scale)
    setTimeout(() => {
      if (!this.readiness.isReady('captureScreen')) {
        this.start()
      }
    }, 5000)
  }
  destroy() {
    main.stopCaptureScreen(this.connectKey)
    this.offCaptureScreen()
  }
  private async draw(image: Uint8Array) {
    const { canvas, ctx } = this
    const blob = new Blob([image], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)
    const img = await loadImage(url)
    URL.revokeObjectURL(url)
    const width = img.naturalWidth
    const height = img.naturalHeight
    if (canvas.width !== width) {
      canvas.width = width
    }
    if (canvas.height !== height) {
      canvas.height = height
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
  }
  private getPointer(e: PointerEvent) {
    const { canvas } = this
    const { clientX, clientY } = e

    const screenWidth = canvas.width
    const screenHeight = canvas.height

    const rect = canvas.getBoundingClientRect()

    const canvasRect = {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    }
    if (screenWidth / screenHeight < rect.width / rect.height) {
      canvasRect.height = rect.height
      canvasRect.width = canvasRect.height * (screenWidth / screenHeight)
      canvasRect.x = rect.x + (rect.width - canvasRect.width) / 2
      canvasRect.y = rect.y
    } else {
      canvasRect.width = rect.width
      canvasRect.height = canvasRect.width * (screenHeight / screenWidth)
      canvasRect.x = rect.x
      canvasRect.y = rect.y + (rect.height - canvasRect.height) / 2
    }

    const percentageX = clamp((clientX - canvasRect.x) / canvasRect.width, 0, 1)
    const percentageY = clamp(
      (clientY - canvasRect.y) / canvasRect.height,
      0,
      1
    )

    const pointerX = Math.round((percentageX * screenWidth) / store.scale)
    const pointerY = Math.round((percentageY * screenHeight) / store.scale)

    return { pointerX, pointerY }
  }
  private bindEvent() {
    const { canvas } = this

    this.offCaptureScreen = main.on('captureScreen', (connectKey, image) => {
      if (connectKey === this.connectKey) {
        this.readiness.signal('captureScreen')
        this.draw(image)
      }
    })

    canvas.addEventListener('pointerdown', (e) => {
      canvas.focus()
      const { pointerX, pointerY } = this.getPointer(e)
      main.touchDown(this.connectKey, pointerX, pointerY)
      this.isTouching = true
    })
    canvas.addEventListener('pointermove', (e) => {
      if (!this.isTouching) {
        return
      }
      const { pointerX, pointerY } = this.getPointer(e)
      main.touchMove(this.connectKey, pointerX, pointerY)
    })
    const onTouchEnd = (e: PointerEvent) => {
      const { pointerX, pointerY } = this.getPointer(e)
      main.touchUp(this.connectKey, pointerX, pointerY)
      this.isTouching = false
    }
    canvas.addEventListener('pointerup', onTouchEnd)
    canvas.addEventListener('pointerleave', onTouchEnd)
  }
}
