import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockBrowserWindow, mockScreen, mockPrimaryDisplay, mockNearestDisplay } = vi.hoisted(() => {
  const mockPrimaryDisplay = {
    workArea: { x: 0, y: 25, width: 1440, height: 875 }
  }

  const mockNearestDisplay = {
    workArea: { x: 0, y: 25, width: 1440, height: 875 }
  }

  const mockScreen = {
    getPrimaryDisplay: vi.fn(() => mockPrimaryDisplay),
    getDisplayNearestPoint: vi.fn(() => mockNearestDisplay)
  }

  const mockBrowserWindow = vi.fn().mockImplementation((options) => {
    let visible = false
    let destroyed = false
    let width = options?.width ?? 290
    let height = options?.height ?? 420
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {}

    const instance = {
      options,
      getSize: vi.fn(() => [width, height]),
      setSize: vi.fn((w: number, h: number) => {
        width = w
        height = h
      }),
      setContentSize: vi.fn((w: number, h: number) => {
        width = w
        height = h
      }),
      setPosition: vi.fn(),
      show: vi.fn(() => {
        visible = true
      }),
      hide: vi.fn(() => {
        visible = false
      }),
      focus: vi.fn(),
      isVisible: vi.fn(() => visible),
      isDestroyed: vi.fn(() => destroyed),
      destroy: vi.fn(() => {
        destroyed = true
      }),
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = listeners[event] || []
        listeners[event].push(handler)
        return instance
      }),
      _trigger: (event: string, ...args: unknown[]) => {
        listeners[event]?.forEach((fn) => fn(...args))
      }
    }

    return instance
  })

  return {
    mockBrowserWindow,
    mockScreen,
    mockPrimaryDisplay,
    mockNearestDisplay
  }
})

vi.mock('electron', () => ({
  BrowserWindow: mockBrowserWindow,
  screen: mockScreen
}))

import {
  createPopupWindow,
  positionPopupWindow,
  setPopupWindowHeight,
  togglePopupWindow,
  POPUP_WIDTH,
  POPUP_HEIGHT,
  POPUP_BG_COLOR
} from './popupWindow'

describe('popupWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrimaryDisplay.workArea = { x: 0, y: 25, width: 1440, height: 875 }
    mockNearestDisplay.workArea = { x: 0, y: 25, width: 1440, height: 875 }
  })

  describe('createPopupWindow', () => {
    it('creates persistent frameless BrowserWindow with correct properties', () => {
      const win = createPopupWindow()

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: POPUP_WIDTH,
          height: POPUP_HEIGHT,
          show: false,
          frame: false,
          resizable: false,
          fullscreenable: false,
          transparent: false,
          backgroundColor: POPUP_BG_COLOR,
          skipTaskbar: true,
          alwaysOnTop: true,
          hasShadow: true,
          webPreferences: expect.objectContaining({
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            backgroundThrottling: false
          })
        })
      )
      expect(win.on).toHaveBeenCalledWith('blur', expect.any(Function))
    })

    it('accepts custom dimensions and preload path', () => {
      createPopupWindow({
        width: 320,
        height: 500,
        preloadPath: '/custom/preload.js'
      })

      expect(mockBrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 320,
          height: 500,
          webPreferences: expect.objectContaining({
            preload: '/custom/preload.js'
          })
        })
      )
    })

    it('hides window on blur when visible', () => {
      const win = createPopupWindow() as unknown as ReturnType<typeof mockBrowserWindow> & {
        _trigger: (event: string) => void
      }
      win.show()
      expect(win.isVisible()).toBe(true)

      win._trigger('blur')
      expect(win.hide).toHaveBeenCalled()
    })
  })

  describe('positionPopupWindow', () => {
    it('centers window at the top of workArea when trayBounds are missing', () => {
      const win = createPopupWindow()
      positionPopupWindow(win)

      // Primary workArea: x=0, y=25, w=1440, h=875. winWidth = 290.
      // x = 0 + (1440 - 290) / 2 = 575
      // y = 25 + 10 = 35
      expect(win.setPosition).toHaveBeenCalledWith(575, 35, false)
    })

    it('positions below tray on top menu bar (macOS / Linux)', () => {
      const win = createPopupWindow()
      const trayBounds = { x: 1000, y: 0, width: 22, height: 22 }

      positionPopupWindow(win, trayBounds)

      // Ideal X: 1000 + 11 - 145 = 866
      // Target Y: 0 + 22 + 4 = 26, clamped to workArea.y + 4 = 25 + 4 = 29
      expect(win.setPosition).toHaveBeenCalledWith(866, 29, false)
    })

    it('positions above tray on bottom taskbar (Windows)', () => {
      const win = createPopupWindow()
      mockNearestDisplay.workArea = { x: 0, y: 0, width: 1920, height: 1040 }
      // Tray at bottom taskbar: y = 1045
      const trayBounds = { x: 1800, y: 1045, width: 24, height: 24 }

      positionPopupWindow(win, trayBounds)

      // Ideal X: 1800 + 12 - 145 = 1667, clamped to 1920 - 290 - 8 = 1622
      // Target Y: 1045 - 420 - 4 = 621, clamped to workArea.height - winHeight - 4 = 1040 - 420 - 4 = 616
      expect(win.setPosition).toHaveBeenCalledWith(1622, 616, false)
    })

    it('clamps horizontal position when tray icon is at extreme edge', () => {
      const win = createPopupWindow()
      mockNearestDisplay.workArea = { x: 0, y: 25, width: 1440, height: 875 }
      const trayBounds = { x: 1430, y: 0, width: 20, height: 20 }

      positionPopupWindow(win, trayBounds)

      // Max clamped X: workArea.x + workArea.width - winWidth - 8 = 0 + 1440 - 290 - 8 = 1142
      expect(win.setPosition).toHaveBeenCalledWith(1142, expect.any(Number), false)
    })
  })

  describe('setPopupWindowHeight', () => {
    it('sets clamped content size and updates position when visible', () => {
      const win = createPopupWindow()
      win.show()

      setPopupWindowHeight(win, 350)
      expect(win.setContentSize).toHaveBeenCalledWith(POPUP_WIDTH, 350)
    })

    it('clamps height within min (80) and max (600)', () => {
      const win = createPopupWindow()

      setPopupWindowHeight(win, 50)
      expect(win.setContentSize).toHaveBeenCalledWith(POPUP_WIDTH, 80)

      setPopupWindowHeight(win, 800)
      expect(win.setContentSize).toHaveBeenCalledWith(POPUP_WIDTH, 600)
    })

    it('does nothing if window is destroyed', () => {
      const win = createPopupWindow()
      win.destroy()

      setPopupWindowHeight(win, 300)
      expect(win.setContentSize).not.toHaveBeenCalled()
    })
  })

  describe('togglePopupWindow', () => {
    it('shows and focuses window and calls onOpen callback when hidden', () => {
      const win = createPopupWindow()
      const onOpen = vi.fn()

      togglePopupWindow(win, undefined, onOpen)

      expect(win.show).toHaveBeenCalled()
      expect(win.focus).toHaveBeenCalled()
      expect(onOpen).toHaveBeenCalled()
    })

    it('hides window when already visible', () => {
      const win = createPopupWindow()
      win.show()

      togglePopupWindow(win)
      expect(win.hide).toHaveBeenCalled()
    })

    it('ignores toggle if blur occurred less than 250ms ago (C3 anti-flicker guard)', () => {
      const win = createPopupWindow() as unknown as ReturnType<typeof mockBrowserWindow> & {
        _trigger: (event: string) => void
      }
      win.show()
      win._trigger('blur')

      // Immediate toggle right after blur (user clicked tray while open)
      togglePopupWindow(win as unknown as import('electron').BrowserWindow)

      // Should not reopen
      expect(win.show).toHaveBeenCalledTimes(1) // Only initial show
    })
  })
})
