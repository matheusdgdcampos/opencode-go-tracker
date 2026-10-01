import { safeJsonParse, getNonEmptyStringAt } from './utils'
import { FileSystem, defaultFileSystem, getHomeDirectory, resolvePath } from './fileSystem'

export interface KeyReader {
  read(): string | null
}

export interface AuthKeyReaderOptions {
  filePath?: string
  fileSystem?: FileSystem
}

export class AuthKeyReader implements KeyReader {
  private readonly customPath?: string
  private readonly fileSystem: FileSystem

  constructor(options?: string | AuthKeyReaderOptions, fileSystem?: FileSystem) {
    if (typeof options === 'string') {
      this.customPath = options
      this.fileSystem = fileSystem ?? defaultFileSystem
    } else {
      this.customPath = options?.filePath
      this.fileSystem = options?.fileSystem ?? defaultFileSystem
    }
  }

  getDefaultPath(): string {
    return resolvePath(getHomeDirectory(), '.local', 'share', 'opencode', 'auth.json')
  }

  getFilePath(): string {
    return this.customPath ?? this.getDefaultPath()
  }

  read(): string | null {
    const filePath = this.getFilePath()
    const content = this.fileSystem.readTextFile(filePath)
    if (!content) {
      return null
    }

    const parsed = safeJsonParse(content)
    return getNonEmptyStringAt(parsed, 'opencode-go', 'key')
  }
}
