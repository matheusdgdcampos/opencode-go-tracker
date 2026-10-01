import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockContextBridge, mockIpcRenderer } = vi.hoisted(() => {
  const mockContextBridge = {
    exposeInMainWorld: vi.fn()
  }

  const mockIpcRenderer = {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }

  return { mockContextBridge, mockIpcRenderer }
})

vi.mock('electron', () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer
}))

describe('preload index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes api in main world with all RPC methods', async () => {
    await import('./index')

    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'api',
      expect.objectContaining({
        platform: process.platform,
        getState: expect.any(Function),
        onState: expect.any(Function),
        setManualKey: expect.any(Function),
        refresh: expect.any(Function),
        quit: expect.any(Function),
        setTrayImage: expect.any(Function),
        setWindowHeight: expect.any(Function),
        onTrayLabelRequest: expect.any(Function)
      })
    )

    const exposedApi = mockContextBridge.exposeInMainWorld.mock.calls[0][1]

    // 1. getState
    exposedApi.getState()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:getState')

    // 2. setManualKey
    exposedApi.setManualKey('test-key')
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:setManualKey', 'test-key')

    // 3. refresh
    exposedApi.refresh()
    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('app:refresh')

    // 4. quit
    exposedApi.quit()
    expect(mockIpcRenderer.send).toHaveBeenCalledWith('app:quit')

    // 5. setTrayImage
    exposedApi.setTrayImage('data:image/png;base64,123')
    expect(mockIpcRenderer.send).toHaveBeenCalledWith('app:setTrayImage', 'data:image/png;base64,123')

    // 6. setWindowHeight
    exposedApi.setWindowHeight(350)
    expect(mockIpcRenderer.send).toHaveBeenCalledWith('app:setWindowHeight', 350)

    // 7. onState
    const stateCallback = vi.fn()
    const unsubscribeState = exposedApi.onState(stateCallback)
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('app:stateChanged', expect.any(Function))

    // trigger the internal handler
    const stateHandler = mockIpcRenderer.on.mock.calls.find((call) => call[0] === 'app:stateChanged')?.[1]
    const dummySnapshot = { state: { type: 'idle' }, lastUpdated: null, lastData: null, locale: 'pt-BR' }
    stateHandler({}, dummySnapshot)
    expect(stateCallback).toHaveBeenCalledWith(dummySnapshot)

    unsubscribeState()
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('app:stateChanged', expect.any(Function))

    // 8. onTrayLabelRequest
    const labelCallback = vi.fn()
    const unsubscribeLabel = exposedApi.onTrayLabelRequest(labelCallback)
    expect(mockIpcRenderer.on).toHaveBeenCalledWith('app:trayLabelRequest', expect.any(Function))

    const labelHandler = mockIpcRenderer.on.mock.calls.find((call) => call[0] === 'app:trayLabelRequest')?.[1]
    labelHandler()
    expect(labelCallback).toHaveBeenCalled()

    unsubscribeLabel()
    expect(mockIpcRenderer.removeListener).toHaveBeenCalledWith('app:trayLabelRequest', expect.any(Function))
  })
})
