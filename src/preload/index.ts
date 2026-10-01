import { contextBridge, ipcRenderer } from 'electron'
import { UsageData } from '../core/models'
import { UsageState } from '../core/usageService'
import { SupportedLocale } from '../core/strings'

export interface IpcSnapshot {
  state: UsageState
  lastUpdated: string | null
  lastData: UsageData | null
  locale: SupportedLocale
}

export interface OpenCodeTrackerApi {
  platform: NodeJS.Platform
  getState(): Promise<IpcSnapshot>
  onState(callback: (snapshot: IpcSnapshot) => void): () => void
  setManualKey(key: string): Promise<void>
  refresh(): Promise<void>
  quit(): void
  setTrayImage(dataUrl: string): void
  setWindowHeight(height: number): void
  onTrayLabelRequest(callback: () => void): () => void
}

const api: OpenCodeTrackerApi = {
  platform: process.platform,

  getState: () => ipcRenderer.invoke('app:getState'),

  onState: (callback: (snapshot: IpcSnapshot) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: IpcSnapshot) => {
      callback(snapshot)
    }
    ipcRenderer.on('app:stateChanged', handler)
    return () => {
      ipcRenderer.removeListener('app:stateChanged', handler)
    }
  },

  setManualKey: (key: string) => ipcRenderer.invoke('app:setManualKey', key),

  refresh: () => ipcRenderer.invoke('app:refresh'),

  quit: () => {
    ipcRenderer.send('app:quit')
  },

  setTrayImage: (dataUrl: string) => {
    ipcRenderer.send('app:setTrayImage', dataUrl)
  },

  setWindowHeight: (height: number) => {
    ipcRenderer.send('app:setWindowHeight', height)
  },

  onTrayLabelRequest: (callback: () => void) => {
    const handler = () => {
      callback()
    }
    ipcRenderer.on('app:trayLabelRequest', handler)
    return () => {
      ipcRenderer.removeListener('app:trayLabelRequest', handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose api via contextBridge:', error)
}
