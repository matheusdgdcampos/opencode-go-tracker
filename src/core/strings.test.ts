import { describe, it, expect } from 'vitest'
import { resolveLocale, t } from './strings'

describe('strings and i18n', () => {
  it('resolves pt locale variants to pt-BR', () => {
    expect(resolveLocale('pt-BR')).toBe('pt-BR')
    expect(resolveLocale('pt-PT')).toBe('pt-BR')
    expect(resolveLocale('pt')).toBe('pt-BR')
  })

  it('resolves non-pt or undefined to en-US', () => {
    expect(resolveLocale('en-US')).toBe('en-US')
    expect(resolveLocale('es-ES')).toBe('en-US')
    expect(resolveLocale(undefined)).toBe('en-US')
  })

  it('returns pt-BR strings by default or when pt-BR specified', () => {
    expect(t('pt-BR', 'rollingTitle')).toBe('5 horas')
    expect(t('pt-BR', 'quitMenu')).toBe('Encerrar OpenCodeGoTracker')
    expect(t('pt-BR', 'resetDone')).toBe('resetou')
  })

  it('returns en-US strings when en-US specified', () => {
    expect(t('en-US', 'rollingTitle')).toBe('5 hours')
    expect(t('en-US', 'quitMenu')).toBe('Quit OpenCodeGoTracker')
    expect(t('en-US', 'resetDone')).toBe('reset')
  })

  it('interpolates parameters correctly', () => {
    const text = t('pt-BR', 'quotaAriaLabel', { title: '5 horas', percent: 45 })
    expect(text).toBe('5 horas: 45% da cota usada')

    const textEn = t('en-US', 'quotaAriaLabel', { title: '5 hours', percent: 45 })
    expect(textEn).toBe('5 hours: 45% quota used')
  })
})
