import { barLevel } from '../core/formatter'

const LEVEL_COLORS = {
  ok: '#30D158',
  warning: '#FFD60A',
  critical: '#FF453A'
}

let offscreenCanvas: HTMLCanvasElement | null = null

export function resetOffscreenCanvas(): void {
  offscreenCanvas = null
}

/**
 * Draws the `>_ N%` badge on an offscreen canvas at 2x DPI and returns a PNG DataURL
 * for Windows and Linux tray icons.
 */
export function generateTrayBadgeDataUrl(percent: number | null): string {
  if (typeof document === 'undefined') {
    return ''
  }

  if (!offscreenCanvas) {
    offscreenCanvas = document.createElement('canvas')
  }

  const scale = 2
  const textPrefix = '>_'
  const textPercent = percent !== null ? ` ${percent}%` : ''

  const fontSize = 12 * scale
  const font = `bold ${fontSize}px "SF Mono", Menlo, Monaco, Consolas, "Courier New", monospace`

  const ctx = offscreenCanvas.getContext('2d')
  if (!ctx) {
    return ''
  }

  ctx.font = font
  const prefixWidth = ctx.measureText(textPrefix).width
  const percentWidth = textPercent ? ctx.measureText(textPercent).width : 0

  const paddingX = 4 * scale
  const totalWidth = Math.ceil(prefixWidth + percentWidth + paddingX * 2)
  const totalHeight = 18 * scale

  offscreenCanvas.width = totalWidth
  offscreenCanvas.height = totalHeight

  // Re-apply font after resizing canvas
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.clearRect(0, 0, totalWidth, totalHeight)

  const centerY = totalHeight / 2

  // Draw prefix `>_`
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(textPrefix, paddingX, centerY)

  // Draw percent ` N%` in semantic level color
  if (percent !== null) {
    const level = barLevel(percent)
    ctx.fillStyle = LEVEL_COLORS[level]
    ctx.fillText(textPercent, paddingX + prefixWidth, centerY)
  }

  return offscreenCanvas.toDataURL('image/png')
}
