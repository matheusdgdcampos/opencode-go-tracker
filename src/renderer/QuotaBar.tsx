import React, { useState, useEffect } from 'react'
import { barLevel, timeRemaining } from '../core/formatter'
import { SupportedLocale, t } from '../core/strings'
import { clamp } from '../core/utils'

export interface QuotaBarProps {
  title: string
  percent: number
  resetsAt: Date | string
  locale: SupportedLocale
}

export const QuotaBar: React.FC<QuotaBarProps> = ({ title, percent, resetsAt, locale }) => {
  const [now, setNow] = useState(() => new Date())

  // Live countdown timeline: re-render every 60 seconds (§11.3)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60_000)
    return () => clearInterval(timer)
  }, [])

  const level = barLevel(percent)
  const targetDate = typeof resetsAt === 'string' ? new Date(resetsAt) : resetsAt
  const isValidDate = targetDate instanceof Date && !isNaN(targetDate.getTime())
  const remainingStr = isValidDate ? timeRemaining(targetDate, now, locale) : '—'
  const countdownLabel = isValidDate ? `${t(locale, 'resetsInPrefix')}${remainingStr}` : '—'

  const clampedPercent = clamp(percent, 0, 100)
  const accessibleLabel = t(locale, 'quotaAriaLabel', { title, percent })

  return (
    <div className="quota-bar-row" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={accessibleLabel}>
      <div className="quota-header">
        <span className="quota-title">{title}</span>
        <span className={`quota-percent color-${level}`}>{percent}%</span>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill bg-${level}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>

      <div className="quota-countdown">{countdownLabel}</div>
    </div>
  )
}
