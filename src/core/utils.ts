/**
 * Pure reusable utility functions across the application.
 */

/**
 * Type guard to check if a value is a non-null, non-array object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard to check if a value is a string with non-whitespace characters.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Type guard to check if a value is a finite number (not NaN, not Infinity).
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Safely parses a JSON string, returning null if malformed.
 */
export function safeJsonParse<T = unknown>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

/**
 * Safely traverses nested properties in an object.
 */
export function getNestedValue(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj
  for (const key of keys) {
    if (!isRecord(current)) {
      return undefined
    }
    current = current[key]
  }
  return current
}

/**
 * Retrieves a non-empty trimmed string from a nested object path; returns null if missing/empty.
 */
export function getNonEmptyStringAt(obj: unknown, ...keys: string[]): string | null {
  const value = getNestedValue(obj, ...keys)
  return isNonEmptyString(value) ? value.trim() : null
}

/**
 * Asserts that a value is an object, throwing an Error with context if not.
 */
export function assertRecord(value: unknown, context: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${context} must be an object`)
  }
  return value
}

/**
 * Asserts that a record contains a valid string property.
 */
export function assertString(
  record: Record<string, unknown>,
  key: string,
  context: string
): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new Error(`${context} missing or invalid '${key}' field`)
  }
  return value
}

/**
 * Asserts that a record contains a finite number property.
 */
export function assertFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  context: string
): number {
  const value = record[key]
  if (!isFiniteNumber(value)) {
    throw new Error(`${context} missing or invalid '${key}' field`)
  }
  return value
}

/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
