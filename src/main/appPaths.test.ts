import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as os from 'os'
import * as path from 'path'

const { mockApp } = vi.hoisted(() => ({
  mockApp: {
    setPath: vi.fn(),
    getPath: vi.fn()
  }
}))

vi.mock('electron', () => ({
  app: mockApp
}))

import { configureUserDataPath, DEFAULT_USER_DATA_DIR } from './appPaths'

describe('appPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('configures userData path using os.tmpdir and default directory', () => {
    const result = configureUserDataPath()
    const expected = path.join(os.tmpdir(), DEFAULT_USER_DATA_DIR)

    expect(result).toBe(expected)
    expect(mockApp.setPath).toHaveBeenCalledWith('userData', expected)
  })

  it('accepts custom temporary subdirectory', () => {
    const customDir = 'custom-test-dir'
    const result = configureUserDataPath(customDir)
    const expected = path.join(os.tmpdir(), customDir)

    expect(result).toBe(expected)
    expect(mockApp.setPath).toHaveBeenCalledWith('userData', expected)
  })
})
