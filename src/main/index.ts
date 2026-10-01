import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { configureUserDataPath } from './appPaths'
import { createPopupWindow, togglePopupWindow, setPopupWindowHeight } from './popupWindow'
import { registerIpcHandlers, broadcastSnapshot, createIpcSnapshot, requestTrayLabel } from './ipc'
import { TrayController } from './trayController'
import { UsageService } from '../core/usageService'
import { SupportedLocale, resolveLocale } from '../core/strings'

// 1. Direct userData to temporary storage before app ready (§13)
configureUserDataPath()

// 2. Enforce single instance lock (L1)
const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  // 3. Hide from macOS Dock (Agent app / LSUIElement)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  let mainWindow: BrowserWindow | null = null
  let usageService: UsageService | null = null
  let trayController: TrayController | null = null
  let isQuitting = false

  const initializeApp = async (locale: SupportedLocale): Promise<void> => {
    usageService = new UsageService()

    mainWindow = createPopupWindow()

    // Initialize TrayController with cross-platform interactions (§6.1)
    trayController = new TrayController({
      locale,
      onToggle: (bounds) => {
        if (mainWindow) {
          togglePopupWindow(mainWindow, bounds, () => {
            // Immediate refresh on popover open (§10)
            void usageService?.refresh()
          })
        }
      },
      onQuit: () => {
        isQuitting = true
        app.quit()
      }
    })

    // Prevent app from quitting when window is closed; keep hidden
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })

    // Register secure IPC handlers with dynamic height support (M6)
    registerIpcHandlers({
      usageService,
      locale,
      onTrayImage: (dataUrl) => {
        trayController?.setImageFromDataUrl(dataUrl)
      },
      onSetHeight: (height) => {
        if (mainWindow) {
          setPopupWindowHeight(mainWindow, height, trayController?.getBounds())
        }
      },
      onQuit: () => {
        isQuitting = true
        app.quit()
      }
    })

    // Broadcast state changes from service to tray and renderer
    usageService.subscribe((snapshot) => {
      const ipcSnapshot = createIpcSnapshot(snapshot, locale)
      trayController?.update(ipcSnapshot)
      if (mainWindow) {
        broadcastSnapshot(mainWindow, ipcSnapshot)
      }
    })

    // Windows/Linux initial tray badge request when renderer is ready (M7)
    mainWindow.webContents.on('did-finish-load', () => {
      if (process.platform !== 'darwin' && mainWindow) {
        requestTrayLabel(mainWindow)
      }
    })

    // Load renderer content
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl) {
      await mainWindow.loadURL(devUrl)
    } else {
      await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Start polling loop (§10)
    usageService.startPolling()
  }

  // Locale resolved after app.whenReady() (C4)
  app.whenReady().then(async () => {
    const rawLocale = app.getLocale()
    const locale = resolveLocale(rawLocale)
    await initializeApp(locale)
  })

  // Keep tray-only app running when all windows are closed (§1.1)
  app.on('window-all-closed', () => {
    // Do nothing: tray-only app stays resident in background
  })

  app.on('before-quit', () => {
    isQuitting = true
    trayController?.destroy()
    usageService?.stopPolling()
  })

  // Second instance is a no-op (§6.3, M5)
  app.on('second-instance', () => {
    // Secondary instance exits silently per spec §6.3
  })
}
