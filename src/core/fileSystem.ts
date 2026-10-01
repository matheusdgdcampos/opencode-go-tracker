import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * FileSystem abstraction layer to decouple business logic from native Node.js 'fs'.
 */
export interface FileSystem {
  readTextFile(filePath: string): string | null
  fileExists(filePath: string): boolean
}

export const defaultFileSystem: FileSystem = {
  readTextFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) {
        return null
      }
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  },

  fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }
}

/**
 * Helper to read text file contents safely without throwing exceptions.
 */
export function readTextFile(
  filePath: string,
  fileSystem: FileSystem = defaultFileSystem
): string | null {
  return fileSystem.readTextFile(filePath)
}

/**
 * Helper to check if a file exists safely.
 */
export function fileExists(
  filePath: string,
  fileSystem: FileSystem = defaultFileSystem
): boolean {
  return fileSystem.fileExists(filePath)
}

/**
 * Abstraction to retrieve the current user's home directory.
 */
export function getHomeDirectory(): string {
  try {
    return os.homedir()
  } catch {
    return ''
  }
}

/**
 * Abstraction to safely join path segments across operating systems.
 */
export function resolvePath(...segments: string[]): string {
  return path.join(...segments)
}
