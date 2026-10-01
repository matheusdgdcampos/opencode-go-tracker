// @vitest-environment happy-dom
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { App } from './App'
import { IpcSnapshot, OpenCodeTrackerApi } from '../preload/index'
import { resetOffscreenCanvas } from './trayLabel'

describe('App', () => {
  let mockApi: OpenCodeTrackerApi
  let stateCallback: ((snap: IpcSnapshot) => void) | null = null
  let labelCallback: (() => void) | null = null

  const loadedSnapshot: IpcSnapshot = {
    state: {
      type: 'loaded',
      data: {
        rolling: { status: 'ok', percent: 45, resetsAt: new Date(Date.now() + 3600 * 1000) },
        weekly: { status: 'warning', percent: 60, resetsAt: new Date(Date.now() + 7200 * 1000) },
        monthly: { status: 'critical', percent: 85, resetsAt: new Date(Date.now() + 10800 * 1000) }
      }
    },
    lastUpdated: '2026-09-30T14:30:00.000Z',
    lastData: {
      rolling: { status: 'ok', percent: 45, resetsAt: new Date(Date.now() + 3600 * 1000) },
      weekly: { status: 'warning', percent: 60, resetsAt: new Date(Date.now() + 7200 * 1000) },
      monthly: { status: 'critical', percent: 85, resetsAt: new Date(Date.now() + 10800 * 1000) }
    },
    locale: 'pt-BR'
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    resetOffscreenCanvas()
    stateCallback = null
    labelCallback = null

    // Mock Canvas 2D methods for happy-dom
    const mockCtx = {
      font: '',
      textBaseline: '',
      fillStyle: '',
      clearRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 }))
    }
    // @ts-expect-error mock canvas methods
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mock')

    mockApi = {
      platform: 'darwin',
      getState: vi.fn().mockResolvedValue(loadedSnapshot),
      onState: vi.fn((cb) => {
        stateCallback = cb
        return () => {
          stateCallback = null
        }
      }),
      setManualKey: vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn(),
      setTrayImage: vi.fn(),
      setWindowHeight: vi.fn(),
      onTrayLabelRequest: vi.fn((cb) => {
        labelCallback = cb
        return () => {
          labelCallback = null
        }
      })
    }

    window.api = mockApi
  })

  it('renders loaded quota bars and footer info', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('5 horas')).toBeDefined()
    })

    expect(screen.getByText('45%')).toBeDefined()
    expect(screen.getByText('Semanal')).toBeDefined()
    expect(screen.getByText('60%')).toBeDefined()
    expect(screen.getByText('Mensal')).toBeDefined()
    expect(screen.getByText('85%')).toBeDefined()
    expect(screen.getByText(/Atualizado às/)).toBeDefined()
  })

  it('triggers refresh and quit from footer buttons', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('5 horas')).toBeDefined()
    })

    const refreshBtn = screen.getByTitle('Atualizar agora')
    fireEvent.click(refreshBtn)
    expect(mockApi.refresh).toHaveBeenCalled()

    const quitBtn = screen.getByTitle('Encerrar OpenCodeGoTracker')
    fireEvent.click(quitBtn)
    expect(mockApi.quit).toHaveBeenCalled()
  })

  it('renders noKey state and submits manual key', async () => {
    mockApi.getState = vi.fn().mockResolvedValue({
      state: { type: 'noKey' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Chave não encontrada')).toBeDefined()
    })

    const input = screen.getByPlaceholderText('Cole sua chave')
    const submitBtn = screen.getByText('OK')

    fireEvent.change(input, { target: { value: 'sk-manual-key-123' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockApi.setManualKey).toHaveBeenCalledWith('sk-manual-key-123')
    })
  })

  it('renders invalidKey, networkError, and unexpectedResponse states', async () => {
    mockApi.getState = vi.fn().mockResolvedValue({
      state: { type: 'invalidKey' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    })

    const { rerender } = render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Chave inválida')).toBeDefined()
    })

    // Update to networkError
    mockApi.getState = vi.fn().mockResolvedValue({
      state: { type: 'networkError' },
      lastUpdated: null,
      lastData: null,
      locale: 'pt-BR'
    })
    rerender(<App />)

    // Update via live subscription callback
    act(() => {
      stateCallback?.({
        state: { type: 'networkError' },
        lastUpdated: null,
        lastData: null,
        locale: 'pt-BR'
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Sem conexão')).toBeDefined()
    })

    // Update to unexpectedResponse
    act(() => {
      stateCallback?.({
        state: { type: 'unexpectedResponse' },
        lastUpdated: null,
        lastData: null,
        locale: 'pt-BR'
      })
    })

    await waitFor(() => {
      expect(screen.getByText('Resposta inesperada')).toBeDefined()
    })
  })

  it('handles tray-label-request on non-darwin platforms', async () => {
    mockApi.platform = 'win32'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('5 horas')).toBeDefined()
    })

    expect(mockApi.onTrayLabelRequest).toHaveBeenCalled()

    // Trigger tray label request inside act
    act(() => {
      labelCallback?.()
    })
    expect(mockApi.setTrayImage).toHaveBeenCalled()
  })
})
