// @vitest-environment happy-dom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { QuotaBar } from './QuotaBar'

describe('QuotaBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders title, clamped percent, and resets countdown', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000)

    render(
      <QuotaBar
        title="5 horas"
        percent={42}
        resetsAt={futureDate}
        locale="pt-BR"
      />
    )

    expect(screen.getByText('5 horas')).toBeDefined()
    expect(screen.getByText('42%')).toBeDefined()
    expect(screen.getByText(/Reseta em 1h 00min/)).toBeDefined()
  })

  it('renders semantic color classes for ok, warning and critical levels', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000)

    const { rerender } = render(
      <QuotaBar title="Semanal" percent={30} resetsAt={futureDate} locale="pt-BR" />
    )
    expect(screen.getByText('30%').className).toContain('color-ok')

    rerender(
      <QuotaBar title="Semanal" percent={65} resetsAt={futureDate} locale="pt-BR" />
    )
    expect(screen.getByText('65%').className).toContain('color-warning')

    rerender(
      <QuotaBar title="Semanal" percent={90} resetsAt={futureDate} locale="pt-BR" />
    )
    expect(screen.getByText('90%').className).toContain('color-critical')
  })

  it('handles string resetsAt and invalid date gracefully', () => {
    render(
      <QuotaBar
        title="Mensal"
        percent={50}
        resetsAt="invalid-date-string"
        locale="pt-BR"
      />
    )

    expect(screen.getByText('50%')).toBeDefined()
    expect(screen.getByText('—')).toBeDefined()
  })

  it('advances timer every 60 seconds', () => {
    const now = Date.now()
    const futureDate = new Date(now + 120 * 1000)

    render(
      <QuotaBar
        title="5 horas"
        percent={20}
        resetsAt={futureDate}
        locale="pt-BR"
      />
    )

    expect(screen.getByText(/Reseta em 2min/)).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByText(/Reseta em 1min/)).toBeDefined()
  })
})
