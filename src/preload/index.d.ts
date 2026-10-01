import { OpenCodeTrackerApi, IpcSnapshot } from './index'

declare global {
  interface Window {
    api: OpenCodeTrackerApi
  }
}

export type { OpenCodeTrackerApi, IpcSnapshot }
