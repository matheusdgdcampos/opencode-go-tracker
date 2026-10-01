export type SupportedLocale = 'pt-BR' | 'en-US'

export const translations = {
  'pt-BR': {
    rollingTitle: '5 horas',
    weeklyTitle: 'Semanal',
    monthlyTitle: 'Mensal',
    resetsInPrefix: 'Reseta em ',
    resetDone: 'resetou',
    updatedAtPrefix: 'Atualizado às ',
    noKeyTitle: 'Chave não encontrada',
    noKeyCaption: 'Abra o OpenCode e rode /connect, ou cole sua chave da API abaixo (fica só em memória).',
    keyPlaceholder: 'Cole sua chave',
    keySubmitButton: 'OK',
    invalidKeyTitle: 'Chave inválida',
    invalidKeyCaption: 'Verifique sua assinatura OpenCode Go e tente novamente.',
    networkErrorTitle: 'Sem conexão',
    networkErrorCaption: 'Tentando novamente automaticamente em 60s.',
    unexpectedResponseTitle: 'Resposta inesperada',
    unexpectedResponseCaption: 'A API do OpenCode respondeu algo inesperado.',
    quitMenu: 'Encerrar OpenCodeGoTracker',
    openPanelMenu: 'Abrir painel',
    refreshTooltip: 'Atualizar agora',
    quitTooltip: 'Encerrar OpenCodeGoTracker',
    quotaAriaLabel: '{title}: {percent}% da cota usada'
  },
  'en-US': {
    rollingTitle: '5 hours',
    weeklyTitle: 'Weekly',
    monthlyTitle: 'Monthly',
    resetsInPrefix: 'Resets in ',
    resetDone: 'reset',
    updatedAtPrefix: 'Updated at ',
    noKeyTitle: 'Key not found',
    noKeyCaption: 'Open OpenCode and run /connect, or paste your API key below (kept in memory only).',
    keyPlaceholder: 'Paste your key',
    keySubmitButton: 'OK',
    invalidKeyTitle: 'Invalid key',
    invalidKeyCaption: 'Check your OpenCode Go subscription and try again.',
    networkErrorTitle: 'No connection',
    networkErrorCaption: 'Retrying automatically in 60s.',
    unexpectedResponseTitle: 'Unexpected response',
    unexpectedResponseCaption: 'The OpenCode API returned an unexpected response.',
    quitMenu: 'Quit OpenCodeGoTracker',
    openPanelMenu: 'Open panel',
    refreshTooltip: 'Refresh now',
    quitTooltip: 'Quit OpenCodeGoTracker',
    quotaAriaLabel: '{title}: {percent}% quota used'
  }
} as const

export type TranslationKey = keyof (typeof translations)['pt-BR']

export function resolveLocale(rawLocale?: string): SupportedLocale {
  if (!rawLocale) {
    return 'en-US'
  }
  const normalized = rawLocale.toLowerCase()
  if (normalized.startsWith('pt')) {
    return 'pt-BR'
  }
  return 'en-US'
}

export function t(
  locale: SupportedLocale | string,
  key: TranslationKey,
  params?: Record<string, string | number>
): string {
  const resolved = resolveLocale(locale)
  let text: string = translations[resolved][key] || translations['en-US'][key] || key

  if (params) {
    for (const [paramKey, value] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(value))
    }
  }

  return text
}
