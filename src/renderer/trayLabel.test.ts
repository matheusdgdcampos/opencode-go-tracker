import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateTrayBadgeDataUrl, resetOffscreenCanvas } from './trayLabel'

describe('trayLabel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetOffscreenCanvas()
  })

  it('returns empty string when document is undefined (SSR / pure Node)', () => {
    const originalDocument = globalThis.document
    try {
      // @ts-expect-error test node environment without document
      delete globalThis.document
      expect(generateTrayBadgeDataUrl(42)).toBe('')
    } finally {
      globalThis.document = originalDocument
    }
  })

  it('draws badge with prefix and colored percentage on mock canvas', () => {
    const mockCtx = {
      font: '',
      textBaseline: '',
      fillStyle: '',
      clearRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 }))
    }

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => 'data:image/png;base64,mockPngData')
    }

    globalThis.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas
        return {}
      })
    } as unknown as Document

    // 1. Test percent < 50 (ok / #30D158)
    const resultOk = generateTrayBadgeDataUrl(35)
    expect(resultOk).toBe('data:image/png;base64,mockPngData')
    expect(mockCtx.fillText).toHaveBeenCalledWith('>_', expect.any(Number), expect.any(Number))
    expect(mockCtx.fillText).toHaveBeenCalledWith(' 35%', expect.any(Number), expect.any(Number))
    expect(mockCtx.fillStyle).toBe('#30D158')

    // 2. Test percent in warning range (50 <= p < 80 / #FFD60A)
    generateTrayBadgeDataUrl(65)
    expect(mockCtx.fillStyle).toBe('#FFD60A')

    // 3. Test percent in critical range (>= 80 / #FF453A)
    generateTrayBadgeDataUrl(92)
    expect(mockCtx.fillStyle).toBe('#FF453A')

    // 4. Test percent null (only prefix, no percentage text)
    mockCtx.fillText.mockClear()
    generateTrayBadgeDataUrl(null)
    expect(mockCtx.fillText).toHaveBeenCalledWith('>_', expect.any(Number), expect.any(Number))
    expect(mockCtx.fillText).not.toHaveBeenCalledWith(expect.stringContaining('%'), expect.any(Number), expect.any(Number))
  })

  it('returns empty string if canvas.getContext returns null', () => {
    const mockCanvas = {
      getContext: vi.fn(() => null)
    }

    globalThis.document = {
      createElement: vi.fn(() => mockCanvas)
    } as unknown as Document

    expect(generateTrayBadgeDataUrl(50)).toBe('')
  })
})
