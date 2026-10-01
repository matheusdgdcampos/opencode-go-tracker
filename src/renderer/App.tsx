import React, { useState, useEffect } from 'react'
import { IpcSnapshot } from '../preload/index'
import { QuotaBar } from './QuotaBar'
import { t } from '../core/strings'
import { generateTrayBadgeDataUrl } from './trayLabel'
import { isNonEmptyString } from '../core/utils'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<IpcSnapshot | null>(null)
  const [manualKeyInput, setManualKeyInput] = useState('')
  const [isSubmittingKey, setIsSubmittingKey] = useState(false)

  useEffect(() => {
    // 1. Fetch initial state
    window.api?.getState().then((snap) => {
      setSnapshot(snap)
    })

    // 2. Subscribe to live state updates from Main Process
    const unsubscribe = window.api?.onState((newSnapshot) => {
      setSnapshot(newSnapshot)
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  const sendTrayBadge = (currentSnapshot: IpcSnapshot | null) => {
    if (!currentSnapshot || window.api?.platform === 'darwin') return
    const isLoaded = currentSnapshot.state.type === 'loaded' || (currentSnapshot.lastData !== null && currentSnapshot.state.type === 'loading')
    const percent = isLoaded && currentSnapshot.lastData ? currentSnapshot.lastData.rolling.percent : null
    const dataUrl = generateTrayBadgeDataUrl(percent)
    if (dataUrl) {
      window.api?.setTrayImage(dataUrl)
    }
  }

  // Send badge updates to main process for Windows/Linux tray icon (L4)
  useEffect(() => {
    sendTrayBadge(snapshot)
  }, [snapshot])

  // Handle tray-label-request from main process on Windows/Linux (M7)
  useEffect(() => {
    if (window.api?.platform === 'darwin') return
    const unsubscribe = window.api?.onTrayLabelRequest(() => {
      sendTrayBadge(snapshot)
    })
    return () => {
      unsubscribe?.()
    }
  }, [snapshot])

  // Dynamically report content height to main process (§6.2, M6)
  useEffect(() => {
    const rootEl = document.getElementById('root') || document.body
    if (!rootEl || !window.api?.setWindowHeight) return

    const updateHeight = () => {
      const height = rootEl.getBoundingClientRect().height
      if (height > 0) {
        window.api.setWindowHeight(Math.ceil(height))
      }
    }

    updateHeight()
    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(rootEl)

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!snapshot) {
    return (
      <div className="panel-container">
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  const { state, lastData, lastUpdated, locale } = snapshot
  const isLoading = state.type === 'loading'

  // Stale-While-Revalidate: show data if available even during loading or idle
  const activeData = state.type === 'loaded' ? state.data : lastData
  const showDataView = activeData !== null && (state.type === 'loaded' || state.type === 'idle' || state.type === 'loading')

  const handleManualKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isNonEmptyString(manualKeyInput) || isSubmittingKey) return

    setIsSubmittingKey(true)
    try {
      await window.api?.setManualKey(manualKeyInput)
      setManualKeyInput('')
    } finally {
      setIsSubmittingKey(false)
    }
  }

  const handleRefresh = () => {
    if (!isLoading) {
      window.api?.refresh()
    }
  }

  const handleQuit = () => {
    window.api?.quit()
  }

  return (
    <div className="panel-container">
      {/* 1. Main View (Mutually Exclusive per §11.2) */}
      {showDataView && activeData ? (
        <div className="quotas-list">
          <QuotaBar
            title={t(locale, 'rollingTitle')}
            percent={activeData.rolling.percent}
            resetsAt={activeData.rolling.resetsAt}
            locale={locale}
          />
          <div className="hairline-divider" />
          <QuotaBar
            title={t(locale, 'weeklyTitle')}
            percent={activeData.weekly.percent}
            resetsAt={activeData.weekly.resetsAt}
            locale={locale}
          />
          <div className="hairline-divider" />
          <QuotaBar
            title={t(locale, 'monthlyTitle')}
            percent={activeData.monthly.percent}
            resetsAt={activeData.monthly.resetsAt}
            locale={locale}
          />
        </div>
      ) : isLoading ? (
        <div className="spinner-container">
          <div className="spinner" />
        </div>
      ) : state.type === 'noKey' ? (
        <div className="state-message-view">
          <div className="state-title">{t(locale, 'noKeyTitle')}</div>
          <div className="state-caption">{t(locale, 'noKeyCaption')}</div>
          <form className="key-input-form" onSubmit={handleManualKeySubmit}>
            <input
              type="password"
              className="key-input"
              placeholder={t(locale, 'keyPlaceholder')}
              value={manualKeyInput}
              onChange={(e) => setManualKeyInput(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="key-button"
              disabled={!isNonEmptyString(manualKeyInput) || isSubmittingKey}
            >
              {t(locale, 'keySubmitButton')}
            </button>
          </form>
        </div>
      ) : state.type === 'invalidKey' ? (
        <div className="state-message-view">
          <svg className="state-icon color-warning" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
          </svg>
          <div className="state-title">{t(locale, 'invalidKeyTitle')}</div>
          <div className="state-caption">{t(locale, 'invalidKeyCaption')}</div>
        </div>
      ) : state.type === 'networkError' ? (
        <div className="state-message-view">
          <svg className="state-icon color-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
          <div className="state-title">{t(locale, 'networkErrorTitle')}</div>
          <div className="state-caption">{t(locale, 'networkErrorCaption')}</div>
        </div>
      ) : (
        /* unexpectedResponse or other fallback */
        <div className="state-message-view">
          <svg className="state-icon color-critical" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <div className="state-title">{t(locale, 'unexpectedResponseTitle')}</div>
          <div className="state-caption">{t(locale, 'unexpectedResponseCaption')}</div>
        </div>
      )}

      {/* 2. Footer (Present in all states §11.2) */}
      <footer className="panel-footer">
        <div className="footer-updated">
          {lastUpdated ? `${t(locale, 'updatedAtPrefix')}${formatTime(lastUpdated)}` : ''}
        </div>

        <div className="footer-actions">
          <button
            className="icon-button"
            onClick={handleRefresh}
            disabled={isLoading}
            title={t(locale, 'refreshTooltip')}
            aria-label={t(locale, 'refreshTooltip')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>

          <button
            className="icon-button"
            onClick={handleQuit}
            title={t(locale, 'quitTooltip')}
            aria-label={t(locale, 'quitTooltip')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}
