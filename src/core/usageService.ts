import { UsageData, parseUsageResponse } from './models'
import { AuthKeyReader, KeyReader } from './authKeyReader'
import { isNonEmptyString } from './utils'

export const USAGE_ENDPOINT = 'https://opencode.ai/zen/go/v1/usage'
export const DEFAULT_TIMEOUT_MS = 15_000
export const DEFAULT_POLLING_INTERVAL_MS = 60_000

export type UsageState =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded'; data: UsageData }
  | { type: 'noKey' }
  | { type: 'invalidKey' }
  | { type: 'networkError' }
  | { type: 'unexpectedResponse' }

export interface UsageSnapshot {
  state: UsageState
  lastUpdated: Date | null
  lastData: UsageData | null
  manualKey: string | null
}

export interface Clock {
  now(): Date
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export interface HttpResponse {
  status: number
  body: string
}

export interface HttpGetOptions {
  headers: Record<string, string>
  timeoutMs: number
}

export type HttpGet = (url: string, options: HttpGetOptions) => Promise<HttpResponse>

export const defaultHttpGet: HttpGet = async (url, options) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: controller.signal
    })
    const body = await response.text()
    return {
      status: response.status,
      body
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export interface TimerScheduler {
  setInterval(callback: () => void, intervalMs: number): () => void
}

export class SystemTimerScheduler implements TimerScheduler {
  setInterval(callback: () => void, intervalMs: number): () => void {
    const timer = setInterval(callback, intervalMs)
    return () => clearInterval(timer)
  }
}

export interface UsageServiceOptions {
  clock?: Clock
  httpGet?: HttpGet
  keyReader?: KeyReader
  scheduler?: TimerScheduler
  pollingIntervalMs?: number
  autoStartPolling?: boolean
}

export class UsageService {
  private readonly clock: Clock
  private readonly httpGet: HttpGet
  private readonly keyReader: KeyReader
  private readonly scheduler: TimerScheduler
  private readonly pollingIntervalMs: number

  private state: UsageState = { type: 'idle' }
  private lastUpdated: Date | null = null
  private lastData: UsageData | null = null
  private manualKey: string | null = null

  private cancelPolling: (() => void) | null = null
  private listeners: Set<(snapshot: UsageSnapshot) => void> = new Set()

  constructor(options: UsageServiceOptions = {}) {
    this.clock = options.clock ?? new SystemClock()
    this.httpGet = options.httpGet ?? defaultHttpGet
    this.keyReader = options.keyReader ?? new AuthKeyReader()
    this.scheduler = options.scheduler ?? new SystemTimerScheduler()
    this.pollingIntervalMs = options.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS

    if (options.autoStartPolling) {
      this.startPolling()
    }
  }

  getSnapshot(): UsageSnapshot {
    return {
      state: this.state,
      lastUpdated: this.lastUpdated,
      lastData: this.lastData,
      manualKey: this.manualKey
    }
  }

  getState(): UsageState {
    return this.state
  }

  getLastUpdated(): Date | null {
    return this.lastUpdated
  }

  getLastData(): UsageData | null {
    return this.lastData
  }

  getManualKey(): string | null {
    return this.manualKey
  }

  subscribe(listener: (snapshot: UsageSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch (err) {
        console.error('Error notifying UsageService listener:', err)
      }
    }
  }

  private inFlightRefresh: Promise<void> | null = null

  async setManualKey(key: string | null): Promise<void> {
    this.manualKey = isNonEmptyString(key) ? key.trim() : null
    if (this.inFlightRefresh) {
      await this.inFlightRefresh
    }
    await this.refresh()
  }

  async refresh(): Promise<void> {
    if (this.inFlightRefresh) {
      return this.inFlightRefresh
    }

    this.inFlightRefresh = this.executeRefresh().finally(() => {
      this.inFlightRefresh = null
    })

    return this.inFlightRefresh
  }

  private async executeRefresh(): Promise<void> {
    const key = this.manualKey ?? this.keyReader.read()

    if (!key) {
      this.state = { type: 'noKey' }
      this.notify()
      return
    }

    this.state = { type: 'loading' }
    this.notify()

    try {
      const response = await this.httpGet(USAGE_ENDPOINT, {
        headers: {
          Authorization: `Bearer ${key}`
        },
        timeoutMs: DEFAULT_TIMEOUT_MS
      })

      if (response.status === 200) {
        try {
          const decoded = parseUsageResponse(response.body)
          this.state = { type: 'loaded', data: decoded.usage }
          this.lastUpdated = this.clock.now()
          this.lastData = decoded.usage
        } catch {
          this.state = { type: 'unexpectedResponse' }
        }
      } else if (response.status === 401 || response.status === 403) {
        this.state = { type: 'invalidKey' }
      } else {
        this.state = { type: 'unexpectedResponse' }
      }
    } catch {
      this.state = { type: 'networkError' }
    }

    this.notify()
  }

  startPolling(): void {
    this.stopPolling()
    // Fire immediately
    void this.refresh()

    this.cancelPolling = this.scheduler.setInterval(() => {
      void this.refresh()
    }, this.pollingIntervalMs)
  }

  stopPolling(): void {
    if (this.cancelPolling) {
      this.cancelPolling()
      this.cancelPolling = null
    }
  }
}
