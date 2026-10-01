import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTrayInstance, mockMenu, mockNativeImage, mockApp } = vi.hoisted(() => {
  const mockTrayInstance = {
    getBounds: vi.fn(() => ({ x: 100, y: 0, width: 22, height: 22 })),
    setToolTip: vi.fn(),
    setTitle: vi.fn(),
    setImage: vi.fn(),
    setContextMenu: vi.fn(),
    popUpContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn()
  }

  const mockNativeImageInstance = {
    setTemplateImage: vi.fn(),
    isEmpty: vi.fn(() => false)
  }

  return {
    mockTrayInstance,
    mockMenu: {
      buildFromTemplate: vi.fn(() => ({}))
    },
    mockNativeImage: {
      createFromPath: vi.fn(() => mockNativeImageInstance),
      createFromDataURL: vi.fn(() => mockNativeImageInstance)
    },
    mockApp: {
      getAppPath: vi.fn(() => '/mock/app/path')
    }
  }
})

vi.mock('electron', () => ({
  Tray: vi.fn(() => mockTrayInstance),
  Menu: mockMenu,
  nativeImage: mockNativeImage,
  app: mockApp
}))

import { TrayController } from './trayController'
import { IpcSnapshot } from '../preload/index'

describe('TrayController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes Tray with interactions and template image on macOS', () => {
    const onToggle = vi.fn()
    const onQuit = vi.fn()

    const controller = new TrayController({
      locale: 'pt-BR',
      onToggle,
      onQuit
    })

    expect(controller.getBounds()).toEqual({ x: 100, y: 0, width: 22, height: 22 })
    expect(mockTrayInstance.on).toHaveBeenCalledWith('click', expect.any(Function))
    expect(mockTrayInstance.on).toHaveBeenCalledWith('right-click', expect.any(Function))
  })

  it('updates tooltip with resets countdown and sets title with fontType on macOS (C1, M3)', () => {
    const controller = new TrayController({
      locale: 'pt-BR',
      onToggle: vi.fn(),
      onQuit: vi.fn()
    })

    const resetDate = new Date(Date.now() + 3600 * 1000)
    const snapshot: IpcSnapshot = {
      state: {
        type: 'loaded',
        data: {
          rolling: { status: 'ok', percent: 42, resetsAt: resetDate },
          weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
          monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
        }
      },
      lastUpdated: '2026-09-28T12:00:00.000Z',
      lastData: {
        rolling: { status: 'ok', percent: 42, resetsAt: resetDate },
        weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
        monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
      },
      locale: 'pt-BR'
    }

    controller.update(snapshot)

    expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('OpenCode Go: 42% (5 horas) · Reseta em 1h 00min')
    if (process.platform === 'darwin') {
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith(' 42%', { fontType: 'monospaced' })
    }
  })

  it('sets warning and critical colors on macOS title according to BarLevel (C1)', () => {
    const controller = new TrayController({
      locale: 'pt-BR',
      onToggle: vi.fn(),
      onQuit: vi.fn()
    })

    const resetDate = new Date(Date.now() + 3600 * 1000)

    // Warning level (>= 50%)
    controller.update({
      state: {
        type: 'loaded',
        data: {
          rolling: { status: 'warning', percent: 65, resetsAt: resetDate },
          weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
          monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
        }
      },
      lastUpdated: '2026-09-28T12:00:00.000Z',
      lastData: {
        rolling: { status: 'warning', percent: 65, resetsAt: resetDate },
        weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
        monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
      },
      locale: 'pt-BR'
    })

    if (process.platform === 'darwin') {
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith(' 65%', {
        fontType: 'monospaced',
        color: '#FFD60A'
      })
    }

    // Critical level (>= 80%)
    controller.update({
      state: {
        type: 'loaded',
        data: {
          rolling: { status: 'critical', percent: 85, resetsAt: resetDate },
          weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
          monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
        }
      },
      lastUpdated: '2026-09-28T12:00:00.000Z',
      lastData: {
        rolling: { status: 'critical', percent: 85, resetsAt: resetDate },
        weekly: { status: 'ok', percent: 10, resetsAt: resetDate },
        monthly: { status: 'ok', percent: 5, resetsAt: resetDate }
      },
      locale: 'pt-BR'
    })

    if (process.platform === 'darwin') {
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith(' 85%', {
        fontType: 'monospaced',
        color: '#FF453A'
      })
    }
  })

  it('resets title to empty string when no data is loaded', () => {
    const controller = new TrayController({
      locale: 'pt-BR',
      onToggle: vi.fn(),
      onQuit: vi.fn()
    })

    const snapshot: IpcSnapshot = {
      state: { type: 'networkError' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    }

    controller.update(snapshot)

    expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('OpenCode Go Tracker')
    if (process.platform === 'darwin') {
      expect(mockTrayInstance.setTitle).toHaveBeenCalledWith('')
    }
  })

  it('cleans up Tray instance on destroy', () => {
    const controller = new TrayController({
      locale: 'pt-BR',
      onToggle: vi.fn(),
      onQuit: vi.fn()
    })

    controller.destroy()
    expect(mockTrayInstance.destroy).toHaveBeenCalled()
  })
})
