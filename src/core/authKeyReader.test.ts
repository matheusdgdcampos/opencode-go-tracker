import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { AuthKeyReader } from './authKeyReader'

describe('AuthKeyReader', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'authkey-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('default path ends with /.local/share/opencode/auth.json under user home', () => {
    const reader = new AuthKeyReader()
    const defaultPath = reader.getDefaultPath()
    const expectedSuffix = path.join('.local', 'share', 'opencode', 'auth.json')
    expect(defaultPath.endsWith(expectedSuffix)).toBe(true)
    expect(defaultPath.startsWith(os.homedir())).toBe(true)
  })

  it('returns key from valid fixture with multiple providers', () => {
    const authPath = path.join(tempDir, 'auth.json')
    const content = {
      anthropic: { key: 'sk-ant-test' },
      'opencode-go': {
        type: 'api',
        key: 'sk-opencode-test-key-123'
      },
      openai: { key: 'sk-openai-test' }
    }
    fs.writeFileSync(authPath, JSON.stringify(content), 'utf-8')

    const reader = new AuthKeyReader(authPath)
    expect(reader.read()).toBe('sk-opencode-test-key-123')
  })

  it('returns null if file does not exist', () => {
    const nonExistent = path.join(tempDir, 'does-not-exist.json')
    const reader = new AuthKeyReader(nonExistent)
    expect(reader.read()).toBeNull()
  })

  it('returns null if JSON is malformed', () => {
    const authPath = path.join(tempDir, 'auth.json')
    fs.writeFileSync(authPath, '{ broken json ...', 'utf-8')

    const reader = new AuthKeyReader(authPath)
    expect(reader.read()).toBeNull()
  })

  it('returns null if opencode-go key is missing or not a string', () => {
    const authPath = path.join(tempDir, 'auth.json')
    fs.writeFileSync(authPath, JSON.stringify({ other: { key: '123' } }), 'utf-8')

    const reader = new AuthKeyReader(authPath)
    expect(reader.read()).toBeNull()

    fs.writeFileSync(authPath, JSON.stringify({ 'opencode-go': { key: 12345 } }), 'utf-8')
    expect(reader.read()).toBeNull()
  })

  it('returns null if key is empty or whitespace', () => {
    const authPath = path.join(tempDir, 'auth.json')
    fs.writeFileSync(authPath, JSON.stringify({ 'opencode-go': { key: '' } }), 'utf-8')

    const reader = new AuthKeyReader(authPath)
    expect(reader.read()).toBeNull()

    fs.writeFileSync(authPath, JSON.stringify({ 'opencode-go': { key: '   ' } }), 'utf-8')
    expect(reader.read()).toBeNull()
  })

  it('works with purely in-memory FileSystem abstraction without disk I/O', () => {
    const mockFs = {
      readTextFile: () => JSON.stringify({ 'opencode-go': { key: 'in-memory-key' } }),
      fileExists: () => true
    }
    const reader = new AuthKeyReader({ filePath: '/virtual/auth.json', fileSystem: mockFs })
    expect(reader.read()).toBe('in-memory-key')
  })
})
