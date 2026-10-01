import { describe, it, expect } from 'vitest'
import { barLevel, timeRemaining } from './formatter'

describe('formatter tests', () => {
  describe('barLevel', () => {
    it('returns ok for values below 50', () => {
      expect(barLevel(0)).toBe('ok')
      expect(barLevel(49)).toBe('ok')
    })

    it('returns warning for values 50 to 79', () => {
      expect(barLevel(50)).toBe('warning')
      expect(barLevel(78)).toBe('warning')
      expect(barLevel(79)).toBe('warning')
    })

    it('returns critical for values 80 and above', () => {
      expect(barLevel(80)).toBe('critical')
      expect(barLevel(85)).toBe('critical')
      expect(barLevel(100)).toBe('critical')
    })
  })

  describe('timeRemaining', () => {
    const baseNow = new Date('2026-09-28T12:00:00.000Z')

    it('returns "resetou" when date is now or in the past', () => {
      const past = new Date('2026-09-28T11:59:50.000Z')
      expect(timeRemaining(past, baseNow)).toBe('resetou')
      expect(timeRemaining(baseNow, baseNow)).toBe('resetou')
      expect(timeRemaining(past, baseNow, 'en-US')).toBe('reset')
    })

    it('returns "<1min" when under 60 seconds', () => {
      const in30s = new Date(baseNow.getTime() + 30 * 1000)
      expect(timeRemaining(in30s, baseNow)).toBe('<1min')

      const in59s = new Date(baseNow.getTime() + 59 * 1000)
      expect(timeRemaining(in59s, baseNow)).toBe('<1min')
    })

    it('returns unpadded minutes when under 60 minutes', () => {
      const in1min = new Date(baseNow.getTime() + 60 * 1000)
      expect(timeRemaining(in1min, baseNow)).toBe('1min')

      const in45min = new Date(baseNow.getTime() + 45 * 60 * 1000)
      expect(timeRemaining(in45min, baseNow)).toBe('45min')

      const in59min = new Date(baseNow.getTime() + 59 * 60 * 1000 + 40 * 1000)
      expect(timeRemaining(in59min, baseNow)).toBe('59min')
    })

    it('returns hours and zero-padded minutes when 60 minutes or more', () => {
      const in1h05m = new Date(baseNow.getTime() + (60 + 5) * 60 * 1000)
      expect(timeRemaining(in1h05m, baseNow)).toBe('1h 05min')

      const in2h13m = new Date(baseNow.getTime() + (2 * 60 + 13) * 60 * 1000)
      expect(timeRemaining(in2h13m, baseNow)).toBe('2h 13min')

      const in3h00m = new Date(baseNow.getTime() + 3 * 60 * 60 * 1000)
      expect(timeRemaining(in3h00m, baseNow)).toBe('3h 00min')
    })
  })
})
