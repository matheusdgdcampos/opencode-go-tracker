import { describe, it, expect } from 'vitest'
import {
  isRecord,
  isNonEmptyString,
  isFiniteNumber,
  safeJsonParse,
  getNestedValue,
  getNonEmptyStringAt,
  assertRecord,
  assertString,
  assertFiniteNumber,
  clamp
} from './utils'

describe('utils', () => {
  describe('type guards', () => {
    it('isRecord correctly distinguishes plain objects', () => {
      expect(isRecord({})).toBe(true)
      expect(isRecord({ a: 1 })).toBe(true)
      expect(isRecord(null)).toBe(false)
      expect(isRecord(undefined)).toBe(false)
      expect(isRecord([])).toBe(false)
      expect(isRecord('string')).toBe(false)
      expect(isRecord(123)).toBe(false)
    })

    it('isNonEmptyString validates non-empty and non-whitespace strings', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString('   hi  ')).toBe(true)
      expect(isNonEmptyString('')).toBe(false)
      expect(isNonEmptyString('   ')).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(123)).toBe(false)
    })

    it('isFiniteNumber validates finite numbers', () => {
      expect(isFiniteNumber(0)).toBe(true)
      expect(isFiniteNumber(42.5)).toBe(true)
      expect(isFiniteNumber(-10)).toBe(true)
      expect(isFiniteNumber(NaN)).toBe(false)
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber('42')).toBe(false)
    })
  })

  describe('safeJsonParse', () => {
    it('parses valid json', () => {
      expect(safeJsonParse('{"ok":true}')).toEqual({ ok: true })
    })

    it('returns null on invalid json', () => {
      expect(safeJsonParse('{ broken')).toBeNull()
    })
  })

  describe('nested extraction', () => {
    const data = {
      user: {
        profile: {
          name: 'OpenCode',
          empty: '   '
        }
      }
    }

    it('getNestedValue traverses objects safely', () => {
      expect(getNestedValue(data, 'user', 'profile', 'name')).toBe('OpenCode')
      expect(getNestedValue(data, 'user', 'missing', 'key')).toBeUndefined()
      expect(getNestedValue(null, 'user')).toBeUndefined()
    })

    it('getNonEmptyStringAt extracts trimmed strings or null', () => {
      expect(getNonEmptyStringAt(data, 'user', 'profile', 'name')).toBe('OpenCode')
      expect(getNonEmptyStringAt(data, 'user', 'profile', 'empty')).toBeNull()
      expect(getNonEmptyStringAt(data, 'user', 'nonExistent')).toBeNull()
    })
  })

  describe('assertions', () => {
    it('assertRecord returns object or throws', () => {
      expect(assertRecord({ a: 1 }, 'Ctx')).toEqual({ a: 1 })
      expect(() => assertRecord(null, 'Ctx')).toThrow('Ctx must be an object')
      expect(() => assertRecord([], 'Ctx')).toThrow('Ctx must be an object')
    })

    it('assertString returns string or throws', () => {
      const rec = { title: 'Hello', num: 10 }
      expect(assertString(rec, 'title', 'Ctx')).toBe('Hello')
      expect(() => assertString(rec, 'num', 'Ctx')).toThrow("Ctx missing or invalid 'num' field")
      expect(() => assertString(rec, 'missing', 'Ctx')).toThrow("Ctx missing or invalid 'missing' field")
    })

    it('assertFiniteNumber returns number or throws', () => {
      const rec = { valid: 34, nan: NaN, str: '34' }
      expect(assertFiniteNumber(rec, 'valid', 'Ctx')).toBe(34)
      expect(() => assertFiniteNumber(rec, 'nan', 'Ctx')).toThrow("Ctx missing or invalid 'nan' field")
      expect(() => assertFiniteNumber(rec, 'str', 'Ctx')).toThrow("Ctx missing or invalid 'str' field")
    })
  })

  describe('clamp', () => {
    it('clamps values within min and max', () => {
      expect(clamp(50, 0, 100)).toBe(50)
      expect(clamp(-10, 0, 100)).toBe(0)
      expect(clamp(150, 0, 100)).toBe(100)
    })
  })
})
