import { assertRecord, assertString, assertFiniteNumber } from './utils'

export interface UsageWindow {
  readonly status: string
  readonly percent: number
  readonly resetsAt: Date
}

export interface UsageData {
  readonly rolling: UsageWindow
  readonly weekly: UsageWindow
  readonly monthly: UsageWindow
}

export interface UsageResponse {
  readonly usage: UsageData
}

const ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

export function parseIsoDate(dateStr: unknown): Date {
  if (typeof dateStr !== 'string') {
    throw new Error(`Invalid date format: expected string, got ${typeof dateStr}`)
  }

  if (!ISO8601_REGEX.test(dateStr)) {
    throw new Error(`Invalid ISO-8601 date string: ${dateStr}`)
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${dateStr}`)
  }

  return date
}

function parseUsageWindow(data: unknown, windowName: string): UsageWindow {
  const record = assertRecord(data, `Window ${windowName}`)
  const status = assertString(record, 'status', `Window ${windowName}`)
  const percent = assertFiniteNumber(record, 'percent', `Window ${windowName}`)

  if (!('resetsAt' in record)) {
    throw new Error(`Window ${windowName} missing 'resetsAt' field`)
  }

  const resetsAt = parseIsoDate(record.resetsAt)

  return {
    status,
    percent,
    resetsAt
  }
}

export function parseUsageResponse(json: unknown): UsageResponse {
  let parsed: unknown = json
  if (typeof json === 'string') {
    try {
      parsed = JSON.parse(json)
    } catch (e) {
      throw new Error(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const root = assertRecord(parsed, 'Response body')
  if (!('usage' in root) || typeof root.usage !== 'object' || root.usage === null) {
    throw new Error("Response body missing 'usage' object")
  }
  const usageRecord = assertRecord(root.usage, 'Usage')

  for (const win of ['rolling', 'weekly', 'monthly'] as const) {
    if (!(win in usageRecord)) {
      throw new Error(`Usage missing '${win}' window`)
    }
  }

  return {
    usage: {
      rolling: parseUsageWindow(usageRecord.rolling, 'rolling'),
      weekly: parseUsageWindow(usageRecord.weekly, 'weekly'),
      monthly: parseUsageWindow(usageRecord.monthly, 'monthly')
    }
  }
}
