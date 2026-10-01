import { BrowserWindow, Rectangle, screen } from 'electron'
import { join } from 'path'
import { clamp } from '../core/utils'

export const POPUP_WIDTH = 290
export const POPUP_HEIGHT = 420
export const POPUP_BG_COLOR = '#1F1F24'

export interface PopupWindowOptions {
  preloadPath?: string
  width?: number
  height?: number
}

const windowBlurTimestamps = new WeakMap<BrowserWindow, number>()

/**
 * Creates the persistent popup window (NSPopover equivalent).
 * The window is hidden on blur and never destroyed during the session (§6.2).
 */
export function createPopupWindow(options: PopupWindowOptions = {}): BrowserWindow {
  const preload = options.preloadPath ?? join(__dirname, '../preload/index.js')
  const width = options.width ?? POPUP_WIDTH
  const height = options.height ?? POPUP_HEIGHT

  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    transparent: false,
    backgroundColor: POPUP_BG_COLOR,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    webPreferences: {
      preload,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // Transient behavior: closes on blur (§11.2)
  win.on('blur', () => {
    windowBlurTimestamps.set(win, Date.now())
    if (!win.isDestroyed() && win.isVisible()) {
      win.hide()
    }
  })

  return win
}

/**
 * Positions the popup window anchored to the system tray icon,
 * ensuring it stays within the current display work area.
 */
export function positionPopupWindow(win: BrowserWindow, trayBounds?: Rectangle): void {
  const [winWidth, winHeight] = win.getSize()

  if (!trayBounds || trayBounds.width === 0) {
    // Fallback: center on primary display work area top edge
    const primaryDisplay = screen.getPrimaryDisplay()
    const x = Math.round(primaryDisplay.workArea.x + (primaryDisplay.workArea.width - winWidth) / 2)
    const y = primaryDisplay.workArea.y + 10
    win.setPosition(x, y, false)
    return
  }

  const nearestDisplay = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y
  })
  const { workArea } = nearestDisplay

  // Center horizontally relative to tray icon
  const idealX = Math.round(trayBounds.x + trayBounds.width / 2 - winWidth / 2)
  const clampedX = clamp(idealX, workArea.x + 8, workArea.x + workArea.width - winWidth - 8)

  // Vertical positioning: decide whether to show below (macOS / top taskbars) or above (Windows bottom taskbar)
  const isBottomTray = trayBounds.y > workArea.y + workArea.height / 2
  let targetY: number

  if (isBottomTray) {
    // Show above the tray icon
    targetY = trayBounds.y - winHeight - 4
  } else {
    // Show below the tray icon
    targetY = trayBounds.y + trayBounds.height + 4
  }

  const clampedY = clamp(targetY, workArea.y + 4, workArea.y + workArea.height - winHeight - 4)

  win.setPosition(clampedX, clampedY, false)
}

/**
 * Dynamically adjusts popup height based on content size (§6.2).
 */
export function setPopupWindowHeight(
  win: BrowserWindow,
  contentHeight: number,
  trayBounds?: Rectangle
): void {
  if (win.isDestroyed()) return
  const clampedHeight = clamp(contentHeight, 80, 600)
  const [currentWidth, currentHeight] = win.getSize()
  if (currentHeight !== clampedHeight) {
    win.setContentSize(currentWidth, clampedHeight)
    if (win.isVisible()) {
      positionPopupWindow(win, trayBounds)
    }
  }
}

/**
 * Toggles popup visibility and triggers an optional onOpen callback (e.g. refresh on open §10).
 * Protects against race condition with hide-on-blur (Issue C3).
 */
export function togglePopupWindow(
  win: BrowserWindow,
  trayBounds?: Rectangle,
  onOpen?: () => void
): void {
  if (win.isDestroyed()) {
    return
  }

  const lastBlur = windowBlurTimestamps.get(win) ?? 0
  const timeSinceBlur = Date.now() - lastBlur

  // If blur just hid the window within 250ms (from clicking tray while open), don't reopen
  if (timeSinceBlur < 250) {
    return
  }

  if (win.isVisible()) {
    win.hide()
  } else {
    positionPopupWindow(win, trayBounds)
    win.show()
    win.focus()
    onOpen?.()
  }
}
