import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockIpcMain, mockApp } = vi.hoisted(() => ({
  mockIpcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeHandler: vi.fn(),
    removeListener: vi.fn()
  },
  mockApp: {
    quit: vi.fn()
  }
}))

vi.mock('electron', () => ({
  ipcMain: mockIpcMain,
  app: mockApp
}))

import { createIpcSnapshot, registerIpcHandlers, broadcastSnapshot, requestTrayLabel } from './ipc'
import { UsageSnapshot, UsageService } from '../core/usageService'
import { BrowserWindow } from 'electron'
import { IpcSnapshot } from '../preload/index'

describe('main ipc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createIpcSnapshot formats date to ISO string, attaches locale, and strips manualKey (C2)', () => {
    const usageSnapshot: UsageSnapshot = {
      state: { type: 'idle' },
      lastUpdated: new Date('2026-09-28T14:30:00.000Z'),
      lastData: null,
      manualKey: 'secret-123'
    }

    const ipcSnap = createIpcSnapshot(usageSnapshot, 'pt-BR')
    expect(ipcSnap.lastUpdated).toBe('2026-09-28T14:30:00.000Z')
    expect(ipcSnap.locale).toBe('pt-BR')
    expect((ipcSnap as unknown as Record<string, unknown>).manualKey).toBeUndefined()
  })

  it('createIpcSnapshot handles null lastUpdated correctly', () => {
    const usageSnapshot: UsageSnapshot = {
      state: { type: 'noKey' },
      lastUpdated: null,
      lastData: null,
      manualKey: null
    }

    const ipcSnap = createIpcSnapshot(usageSnapshot, 'en-US')
    expect(ipcSnap.lastUpdated).toBeNull()
    expect(ipcSnap.locale).toBe('en-US')
  })

  it('registerIpcHandlers registers all required handlers and cleans up on unregister', () => {
    const mockService = {} as UsageService
    const unregister = registerIpcHandlers({
      usageService: mockService,
      locale: 'pt-BR'
    })

    expect(mockIpcMain.handle).toHaveBeenCalledWith('app:getState', expect.any(Function))
    expect(mockIpcMain.handle).toHaveBeenCalledWith('app:setManualKey', expect.any(Function))
    expect(mockIpcMain.handle).toHaveBeenCalledWith('app:refresh', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('app:quit', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('app:setTrayImage', expect.any(Function))
    expect(mockIpcMain.on).toHaveBeenCalledWith('app:setWindowHeight', expect.any(Function))

    unregister()

    expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('app:getState')
    expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('app:setManualKey')
    expect(mockIpcMain.removeHandler).toHaveBeenCalledWith('app:refresh')
    expect(mockIpcMain.removeListener).toHaveBeenCalledWith('app:quit', expect.any(Function))
    expect(mockIpcMain.removeListener).toHaveBeenCalledWith('app:setTrayImage', expect.any(Function))
    expect(mockIpcMain.removeListener).toHaveBeenCalledWith('app:setWindowHeight', expect.any(Function))
  })

  it('broadcastSnapshot sends state update to alive window', () => {
    const mockSend = vi.fn()
    const mockWin = {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        send: mockSend
      }
    } as unknown as BrowserWindow

    const snap: IpcSnapshot = {
      state: { type: 'idle' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    }

    broadcastSnapshot(mockWin, snap)
    expect(mockSend).toHaveBeenCalledWith('app:stateChanged', snap)
  })

  it('broadcastSnapshot ignores destroyed window or webContents', () => {
    const mockSend = vi.fn()
    const destroyedWin = {
      isDestroyed: () => true,
      webContents: {
        isDestroyed: () => false,
        send: mockSend
      }
    } as unknown as BrowserWindow

    broadcastSnapshot(destroyedWin, {
      state: { type: 'idle' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    })

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('requestTrayLabel sends trayLabelRequest event to alive window', () => {
    const mockSend = vi.fn()
    const mockWin = {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        send: mockSend
      }
    } as unknown as BrowserWindow

    requestTrayLabel(mockWin)
    expect(mockSend).toHaveBeenCalledWith('app:trayLabelRequest')
  })

  it('executes registered IPC handlers appropriately', async () => {
    const mockService = {
      getSnapshot: vi.fn(() => ({
        state: { type: 'idle' as const },
        lastUpdated: null,
        lastData: null,
        manualKey: null
      })),
      setManualKey: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined)
    } as unknown as UsageService

    const onTrayImage = vi.fn()
    const onSetHeight = vi.fn()
    const onQuit = vi.fn()

    registerIpcHandlers({
      usageService: mockService,
      locale: 'pt-BR',
      onTrayImage,
      onSetHeight,
      onQuit
    })

    // 1. getState handler
    const getStateFn = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'app:getState')?.[1]
    const stateResult = await getStateFn()
    expect(stateResult.locale).toBe('pt-BR')

    // 2. setManualKey handler
    const setKeyFn = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'app:setManualKey')?.[1]
    await setKeyFn({}, 'my-key')
    expect(mockService.setManualKey).toHaveBeenCalledWith('my-key')

    // 3. refresh handler
    const refreshFn = mockIpcMain.handle.mock.calls.find((call) => call[0] === 'app:refresh')?.[1]
    await refreshFn()
    expect(mockService.refresh).toHaveBeenCalled()

    // 4. quit handler
    const quitFn = mockIpcMain.on.mock.calls.find((call) => call[0] === 'app:quit')?.[1]
    quitFn()
    expect(onQuit).toHaveBeenCalled()

    // 5. setTrayImage handler
    const trayImgFn = mockIpcMain.on.mock.calls.find((call) => call[0] === 'app:setTrayImage')?.[1]
    trayImgFn({}, 'data:image/png;base64,abc')
    expect(onTrayImage).toHaveBeenCalledWith('data:image/png;base64,abc')

    // 6. setWindowHeight handler
    const setHeightFn = mockIpcMain.on.mock.calls.find((call) => call[0] === 'app:setWindowHeight')?.[1]
    setHeightFn({}, 345.6)
    expect(onSetHeight).toHaveBeenCalledWith(346)
  })
})
