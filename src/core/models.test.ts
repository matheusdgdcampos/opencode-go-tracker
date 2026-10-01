import { describe, it, expect } from 'vitest'
import { parseUsageResponse, parseIsoDate } from './models'

describe('models and ISO parser', () => {
  const realFixture = {
    usage: {
      rolling: { status: 'ok', percent: 0, resetsAt: '2026-09-21T03:37:55.914Z' },
      weekly: { status: 'ok', percent: 0, resetsAt: '2026-09-28T00:00:00.000Z' },
      monthly: { status: 'ok', percent: 34, resetsAt: '2026-09-24T22:59:41.000Z' }
    }
  }

  it('parses real fixture with fractional seconds correctly', () => {
    const result = parseUsageResponse(realFixture)
    expect(result.usage.rolling.percent).toBe(0)
    expect(result.usage.rolling.status).toBe('ok')
    expect(result.usage.rolling.resetsAt.toISOString()).toBe('2026-09-21T03:37:55.914Z')

    expect(result.usage.weekly.percent).toBe(0)
    expect(result.usage.weekly.resetsAt.toISOString()).toBe('2026-09-28T00:00:00.000Z')

    expect(result.usage.monthly.percent).toBe(34)
    expect(result.usage.monthly.resetsAt.toISOString()).toBe('2026-09-24T22:59:41.000Z')
  })

  it('parses dates without fractional seconds correctly', () => {
    const fixtureWithoutFractions = {
      usage: {
        rolling: { status: 'ok', percent: 12, resetsAt: '2026-09-21T03:37:55Z' },
        weekly: { status: 'ok', percent: 25, resetsAt: '2026-09-28T00:00:00Z' },
        monthly: { status: 'ok', percent: 50, resetsAt: '2026-09-24T22:59:41Z' }
      }
    }
    const result = parseUsageResponse(fixtureWithoutFractions)
    expect(result.usage.rolling.resetsAt.toISOString()).toBe('2026-09-21T03:37:55.000Z')
    expect(result.usage.weekly.resetsAt.toISOString()).toBe('2026-09-28T00:00:00.000Z')
    expect(result.usage.monthly.resetsAt.toISOString()).toBe('2026-09-24T22:59:41.000Z')
  })

  it('parses raw JSON string input', () => {
    const jsonStr = JSON.stringify(realFixture)
    const result = parseUsageResponse(jsonStr)
    expect(result.usage.monthly.percent).toBe(34)
  })

  it('fails if resetsAt is missing on any window', () => {
    const invalid = {
      usage: {
        rolling: { status: 'ok', percent: 0 },
        weekly: { status: 'ok', percent: 0, resetsAt: '2026-09-28T00:00:00.000Z' },
        monthly: { status: 'ok', percent: 34, resetsAt: '2026-09-24T22:59:41.000Z' }
      }
    }
    expect(() => parseUsageResponse(invalid)).toThrow("Window rolling missing 'resetsAt' field")
  })

  it('fails if status or percent is missing on any window', () => {
    const missingStatus = {
      usage: {
        rolling: { percent: 0, resetsAt: '2026-09-21T03:37:55.914Z' },
        weekly: { status: 'ok', percent: 0, resetsAt: '2026-09-28T00:00:00.000Z' },
        monthly: { status: 'ok', percent: 34, resetsAt: '2026-09-24T22:59:41.000Z' }
      }
    }
    expect(() => parseUsageResponse(missingStatus)).toThrow("Window rolling missing or invalid 'status' field")

    const missingPercent = {
      usage: {
        rolling: { status: 'ok', percent: 0, resetsAt: '2026-09-21T03:37:55.914Z' },
        weekly: { status: 'ok', resetsAt: '2026-09-28T00:00:00.000Z' },
        monthly: { status: 'ok', percent: 34, resetsAt: '2026-09-24T22:59:41.000Z' }
      }
    }
    expect(() => parseUsageResponse(missingPercent)).toThrow("Window weekly missing or invalid 'percent' field")
  })

  it('fails if any window is missing', () => {
    const missingMonthly = {
      usage: {
        rolling: { status: 'ok', percent: 0, resetsAt: '2026-09-21T03:37:55.914Z' },
        weekly: { status: 'ok', percent: 0, resetsAt: '2026-09-28T00:00:00.000Z' }
      }
    }
    expect(() => parseUsageResponse(missingMonthly)).toThrow("Usage missing 'monthly' window")
  })

  it('fails on invalid date string format', () => {
    expect(() => parseIsoDate('not-a-date')).toThrow('Invalid ISO-8601 date string')
    expect(() => parseIsoDate(12345)).toThrow('Invalid date format: expected string')
  })
})
