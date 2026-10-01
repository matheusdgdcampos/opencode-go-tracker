/// <reference types="vite/client" />
import type { OpenCodeTrackerApi } from '../preload/index'

declare global {
  interface Window {
    api: OpenCodeTrackerApi
  }
}
