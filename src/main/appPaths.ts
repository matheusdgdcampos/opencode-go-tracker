import { app } from 'electron'
import * as os from 'os'
import * as path from 'path'

export const DEFAULT_USER_DATA_DIR = 'OpenCodeGoTracker-electron'

/**
 * Redirects Electron's userData to a temporary directory to adhere to the
 * zero-persistence / zero-residue privacy model (§13).
 */
export function configureUserDataPath(tempSubdir: string = DEFAULT_USER_DATA_DIR): string {
  const targetPath = path.join(os.tmpdir(), tempSubdir)
  app.setPath('userData', targetPath)
  return targetPath
}
