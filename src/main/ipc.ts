import { ipcMain, BrowserWindow, app } from 'electron'
import { UsageService, UsageSnapshot } from '../core/usageService'
import { SupportedLocale } from '../core/strings'
import { IpcSnapshot } from '../preload/index'
import { isNonEmptyString } from '../core/utils'

export function createIpcSnapshot(
  snapshot: UsageSnapshot,
  locale: SupportedLocale
): IpcSnapshot {
  return {
    state: snapshot.state,
    lastUpdated: snapshot.lastUpdated ? snapshot.lastUpdated.toISOString() : null,
    lastData: snapshot.lastData,
    locale
  }
}

export interface IpcRegistrationOptions {
  usageService: UsageService
  locale: SupportedLocale
  onTrayImage?: (dataUrl: string) => void
  onSetHeight?: (height: number) => void
  onQuit?: () => void
}

/**
 * Registers secure IPC handlers for the main process.
 */
export function registerIpcHandlers(options: IpcRegistrationOptions): () => void {
  const { usageService, locale, onTrayImage, onSetHeight, onQuit } = options

  const getStateHandler = async (): Promise<IpcSnapshot> => {
    return createIpcSnapshot(usageService.getSnapshot(), locale)
  }

  const setManualKeyHandler = async (_event: Electron.IpcMainInvokeEvent, key: unknown): Promise<void> => {
    const keyStr = typeof key === 'string' ? key : null
    await usageService.setManualKey(keyStr)
  }

  const refreshHandler = async (): Promise<void> => {
    await usageService.refresh()
  }

  const quitHandler = (): void => {
    if (onQuit) {
      onQuit()
    } else {
      app.quit()
    }
  }

  const setTrayImageHandler = (_event: Electron.IpcMainEvent, dataUrl: unknown): void => {
    if (isNonEmptyString(dataUrl) && onTrayImage) {
      onTrayImage(dataUrl)
    }
  }

  const setWindowHeightHandler = (_event: Electron.IpcMainEvent, height: unknown): void => {
    if (typeof height === 'number' && Number.isFinite(height) && height > 0 && onSetHeight) {
      onSetHeight(Math.round(height))
    }
  }

  ipcMain.handle('app:getState', getStateHandler)
  ipcMain.handle('app:setManualKey', setManualKeyHandler)
  ipcMain.handle('app:refresh', refreshHandler)
  ipcMain.on('app:quit', quitHandler)
  ipcMain.on('app:setTrayImage', setTrayImageHandler)
  ipcMain.on('app:setWindowHeight', setWindowHeightHandler)

  return () => {
    ipcMain.removeHandler('app:getState')
    ipcMain.removeHandler('app:setManualKey')
    ipcMain.removeHandler('app:refresh')
    ipcMain.removeListener('app:quit', quitHandler)
    ipcMain.removeListener('app:setTrayImage', setTrayImageHandler)
    ipcMain.removeListener('app:setWindowHeight', setWindowHeightHandler)
  }
}

/**
 * Safely broadcasts snapshot updates to the renderer window.
 */
export function broadcastSnapshot(win: BrowserWindow, snapshot: IpcSnapshot): void {
  if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send('app:stateChanged', snapshot)
  }
}

/**
 * Requests the renderer to generate and send the initial tray badge (Win/Linux §6.4).
 */
export function requestTrayLabel(win: BrowserWindow): void {
  if (!win.isDestroyed() && !win.webContents.isDestroyed()) {
    win.webContents.send('app:trayLabelRequest')
  }
}
