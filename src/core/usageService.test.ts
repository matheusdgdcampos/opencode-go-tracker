import { describe, it, expect, vi } from 'vitest'
import { UsageService, HttpGet, Clock } from './usageService'
import { KeyReader } from './authKeyReader'

describe('UsageService', () => {
  const validFixtureBody = JSON.stringify({
    usage: {
      rolling: { status: 'ok', percent: 42, resetsAt: '2026-09-21T03:37:55.914Z' },
      weekly: { status: 'ok', percent: 10, resetsAt: '2026-09-28T00:00:00.000Z' },
      monthly: { status: 'ok', percent: 80, resetsAt: '2026-09-24T22:59:41.000Z' }
    }
  })

  class MockClock implements Clock {
    currentTime = new Date('2026-09-28T10:00:00.000Z')
    now(): Date {
      return this.currentTime
    }
  }

  class MockKeyReader implements KeyReader {
    currentKey: string | null = null
    read(): string | null {
      return this.currentKey
    }
  }

  it('transitions to noKey if keyReader returns null and no manual key', async () => {
    const keyReader = new MockKeyReader()
    const httpGet = vi.fn<HttpGet>()

    const service = new UsageService({ keyReader, httpGet })
    await service.refresh()

    expect(service.getState()).toEqual({ type: 'noKey' })
    expect(httpGet).not.toHaveBeenCalled()
  })

  it('loads data successfully with 200 response and exact Bearer token header', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'test-token-123'

    const clock = new MockClock()
    let recordedAuthHeader = ''

    const httpGet: HttpGet = async (url, options) => {
      recordedAuthHeader = options.headers['Authorization']
      return {
        status: 200,
        body: validFixtureBody
      }
    }

    const service = new UsageService({ keyReader, httpGet, clock })
    await service.refresh()

    expect(recordedAuthHeader).toBe('Bearer test-token-123')
    expect(service.getState().type).toBe('loaded')
    if (service.getState().type === 'loaded') {
      const data = service.getLastData()!
      expect(data.rolling.percent).toBe(42)
      expect(data.weekly.percent).toBe(10)
      expect(data.monthly.percent).toBe(80)
    }
    expect(service.getLastUpdated()?.toISOString()).toBe(clock.currentTime.toISOString())
  })

  it('transitions to invalidKey on 401 or 403', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'bad-key'

    const httpGet401: HttpGet = async () => ({ status: 401, body: 'Unauthorized' })
    const service1 = new UsageService({ keyReader, httpGet: httpGet401 })
    await service1.refresh()
    expect(service1.getState()).toEqual({ type: 'invalidKey' })

    const httpGet403: HttpGet = async () => ({ status: 403, body: 'Forbidden' })
    const service2 = new UsageService({ keyReader, httpGet: httpGet403 })
    await service2.refresh()
    expect(service2.getState()).toEqual({ type: 'invalidKey' })
  })

  it('transitions to unexpectedResponse on non-200/401/403 or corrupted json', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'test-key'

    const httpGet500: HttpGet = async () => ({ status: 500, body: 'Internal Error' })
    const service500 = new UsageService({ keyReader, httpGet: httpGet500 })
    await service500.refresh()
    expect(service500.getState()).toEqual({ type: 'unexpectedResponse' })

    const httpGetGarbage: HttpGet = async () => ({ status: 200, body: 'not-json-or-missing-fields' })
    const serviceGarbage = new UsageService({ keyReader, httpGet: httpGetGarbage })
    await serviceGarbage.refresh()
    expect(serviceGarbage.getState()).toEqual({ type: 'unexpectedResponse' })
  })

  it('transitions to networkError on transport failure / exception', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'test-key'

    const httpGetFail: HttpGet = async () => {
      throw new Error('Network timeout or DNS resolution failure')
    }

    const service = new UsageService({ keyReader, httpGet: httpGetFail })
    await service.refresh()
    expect(service.getState()).toEqual({ type: 'networkError' })
  })

  it('re-reads key on each refresh cycle and handles key rotation', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'initial-key'

    const capturedHeaders: string[] = []
    const httpGet: HttpGet = async (_, options) => {
      capturedHeaders.push(options.headers['Authorization'])
      return { status: 200, body: validFixtureBody }
    }

    const service = new UsageService({ keyReader, httpGet })

    await service.refresh()
    expect(capturedHeaders[0]).toBe('Bearer initial-key')

    // Key rotated on disk
    keyReader.currentKey = 'rotated-key-456'
    await service.refresh()
    expect(capturedHeaders[1]).toBe('Bearer rotated-key-456')
  })

  it('manual key takes precedence over disk key and persists across refreshes until cleared', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'disk-key'

    const capturedHeaders: string[] = []
    const httpGet: HttpGet = async (_, options) => {
      capturedHeaders.push(options.headers['Authorization'])
      return { status: 200, body: validFixtureBody }
    }

    const service = new UsageService({ keyReader, httpGet })

    await service.setManualKey('manual-pasted-key')
    expect(capturedHeaders[0]).toBe('Bearer manual-pasted-key')

    // Next refresh still uses manual key
    await service.refresh()
    expect(capturedHeaders[1]).toBe('Bearer manual-pasted-key')

    // Clearing manual key falls back to disk key
    await service.setManualKey(null)
    expect(capturedHeaders[2]).toBe('Bearer disk-key')
  })

  it('preserves lastData for stale-while-revalidate even when network fails', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'good-key'

    let fail = false
    const httpGet: HttpGet = async () => {
      if (fail) throw new Error('Offline')
      return { status: 200, body: validFixtureBody }
    }

    const service = new UsageService({ keyReader, httpGet })
    await service.refresh()

    expect(service.getState().type).toBe('loaded')
    expect(service.getLastData()?.rolling.percent).toBe(42)

    // Second refresh fails
    fail = true
    await service.refresh()

    expect(service.getState().type).toBe('networkError')
    // lastData remains accessible for UI
    expect(service.getLastData()?.rolling.percent).toBe(42)
  })

  it('uses injected TimerScheduler for polling and cleans up on stopPolling', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'test-key'
    const httpGet: HttpGet = async () => ({ status: 200, body: validFixtureBody })

    let scheduledCallback: (() => void) | null = null
    let cleared = false
    const mockScheduler = {
      setInterval: (cb: () => void) => {
        scheduledCallback = cb
        return () => {
          cleared = true
        }
      }
    }

    const service = new UsageService({ keyReader, httpGet, scheduler: mockScheduler })
    service.startPolling()

    expect(scheduledCallback).not.toBeNull()
    expect(cleared).toBe(false)

    // Trigger scheduled tick
    scheduledCallback!()
    await Promise.resolve()
    expect(service.getState().type).toBe('loaded')

    service.stopPolling()
    expect(cleared).toBe(true)
  })

  it('coalesces concurrent refresh calls to avoid racing requests', async () => {
    const keyReader = new MockKeyReader()
    keyReader.currentKey = 'test-key'

    let callCount = 0
    const httpGet: HttpGet = async () => {
      callCount++
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { status: 200, body: validFixtureBody }
    }

    const service = new UsageService({ keyReader, httpGet })

    // Fire 3 simultaneous refreshes
    const [p1, p2, p3] = [service.refresh(), service.refresh(), service.refresh()]
    await Promise.all([p1, p2, p3])

    // Should only have called httpGet once
    expect(callCount).toBe(1)
    expect(service.getState().type).toBe('loaded')
  })
})
