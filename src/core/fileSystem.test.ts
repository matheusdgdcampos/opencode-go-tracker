import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {
  defaultFileSystem,
  readTextFile,
  fileExists,
  getHomeDirectory,
  resolvePath,
  FileSystem
} from './fileSystem'

describe('fileSystem abstraction', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-abstraction-test-'))
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('reads existing file correctly via defaultFileSystem and helper', () => {
    const filePath = path.join(tempDir, 'sample.txt')
    fs.writeFileSync(filePath, 'Hello World', 'utf-8')

    expect(fileExists(filePath)).toBe(true)
    expect(defaultFileSystem.fileExists(filePath)).toBe(true)
    expect(readTextFile(filePath)).toBe('Hello World')
    expect(defaultFileSystem.readTextFile(filePath)).toBe('Hello World')
  })

  it('returns null / false for non-existent file without throwing', () => {
    const nonExistent = path.join(tempDir, 'ghost.txt')
    expect(fileExists(nonExistent)).toBe(false)
    expect(readTextFile(nonExistent)).toBeNull()
  })

  it('supports injecting mock FileSystem implementation', () => {
    const mockFs: FileSystem = {
      readTextFile: (p) => (p === '/virtual/test.json' ? '{"inMemory":true}' : null),
      fileExists: (p) => p === '/virtual/test.json'
    }

    expect(readTextFile('/virtual/test.json', mockFs)).toBe('{"inMemory":true}')
    expect(readTextFile('/virtual/other.json', mockFs)).toBeNull()
    expect(fileExists('/virtual/test.json', mockFs)).toBe(true)
  })

  it('getHomeDirectory returns a non-empty string', () => {
    expect(getHomeDirectory().length).toBeGreaterThan(0)
  })

  it('resolvePath joins paths platform-neutrally', () => {
    const joined = resolvePath('a', 'b', 'c.txt')
    expect(joined.endsWith('c.txt')).toBe(true)
  })
})
