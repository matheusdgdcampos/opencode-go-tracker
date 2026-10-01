import { SupportedLocale, t } from './strings'

export type BarLevel = 'ok' | 'warning' | 'critical'

export function barLevel(percent: number): BarLevel {
  if (percent >= 80) {
    return 'critical'
  }
  if (percent >= 50) {
    return 'warning'
  }
  return 'ok'
}

export function timeRemaining(
  target: Date,
  now: Date,
  locale: SupportedLocale | string = 'pt-BR'
): string {
  const diffMs = target.getTime() - now.getTime()
  const s = Math.floor(diffMs / 1000)

  if (s <= 0) {
    return t(locale, 'resetDone')
  }

  if (s < 60) {
    return '<1min'
  }

  const totalMinutes = Math.floor(s / 60)
  if (totalMinutes < 60) {
    return `${totalMinutes}min`
  }

  const h = Math.floor(totalMinutes / 60)
  const rem = totalMinutes % 60
  return `${h}h ${String(rem).padStart(2, '0')}min`
}
