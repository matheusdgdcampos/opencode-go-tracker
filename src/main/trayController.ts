import { Tray, Menu, nativeImage, app, Rectangle, NativeImage } from 'electron'
import { IpcSnapshot } from '../preload/index'
import { SupportedLocale, t } from '../core/strings'
import { barLevel, timeRemaining } from '../core/formatter'
import { isNonEmptyString } from '../core/utils'
import { fileExists, resolvePath } from '../core/fileSystem'

const BAR_LEVEL_COLORS: Record<'ok' | 'warning' | 'critical', string | undefined> = {
  ok: undefined,
  warning: '#FFD60A',
  critical: '#FF453A'
}

export interface TrayControllerOptions {
  locale: SupportedLocale
  onToggle: (bounds: Rectangle) => void
  onQuit: () => void
}

export function getAssetPath(filename: string): string {
  const candidates = [
    resolvePath(__dirname, '../../assets', filename),
    resolvePath(__dirname, '../assets', filename),
    resolvePath(app.getAppPath(), 'assets', filename),
    resolvePath(process.cwd(), 'assets', filename)
  ]

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate
    }
  }

  return resolvePath(app.getAppPath(), 'assets', filename)
}

export class TrayController {
  private tray: Tray | null = null
  private readonly options: TrayControllerOptions
  private baseIcon: NativeImage

  constructor(options: TrayControllerOptions) {
    this.options = options

    const iconFileName = process.platform === 'darwin'
      ? 'trayIconTemplate.png'
      : 'trayIcon.png'

    const iconPath = getAssetPath(iconFileName)
    this.baseIcon = nativeImage.createFromPath(iconPath)

    if (process.platform === 'darwin') {
      this.baseIcon.setTemplateImage(true)
    }

    this.tray = new Tray(this.baseIcon)
    this.tray.setToolTip('OpenCode Go Tracker')
    this.setupInteractions()
  }

  getBounds(): Rectangle | undefined {
    return this.tray?.getBounds()
  }

  private setupInteractions(): void {
    if (!this.tray) return

    const { locale, onToggle, onQuit } = this.options

    // Context menu: Quit for macOS/Windows, Open + Quit for Linux (§6.1)
    const menuTemplate: Electron.MenuItemConstructorOptions[] = []

    if (process.platform === 'linux') {
      menuTemplate.push({
        label: t(locale, 'openPanelMenu'),
        click: () => {
          if (this.tray) {
            onToggle(this.tray.getBounds())
          }
        }
      })
      menuTemplate.push({ type: 'separator' })
    }

    menuTemplate.push({
      label: t(locale, 'quitMenu'),
      click: () => {
        onQuit()
      }
    })

    const contextMenu = Menu.buildFromTemplate(menuTemplate)

    if (process.platform === 'linux') {
      // Linux requires explicit context menu for AppIndicator / StatusNotifierItem
      this.tray.setContextMenu(contextMenu)
      this.tray.on('click', () => {
        if (this.tray) {
          onToggle(this.tray.getBounds())
        }
      })
    } else {
      // macOS and Windows: left-click toggles popup
      this.tray.on('click', () => {
        if (this.tray) {
          onToggle(this.tray.getBounds())
        }
      })

      // Right-click opens context menu via popUpContextMenu (does NOT intercept left-clicks)
      this.tray.on('right-click', () => {
        this.tray?.popUpContextMenu(contextMenu)
      })
    }
  }

  update(snapshot: IpcSnapshot): void {
    if (!this.tray) return

    const { locale } = this.options
    const hasData =
      snapshot.state.type === 'loaded' ||
      (snapshot.lastData !== null && snapshot.state.type === 'loading')

    const percent = hasData && snapshot.lastData ? snapshot.lastData.rolling.percent : null

    // 1. Tooltip (§11.1, §6.1)
    let tooltip = 'OpenCode Go Tracker'
    if (percent !== null && snapshot.lastData) {
      const resetDate = snapshot.lastData.rolling.resetsAt instanceof Date
        ? snapshot.lastData.rolling.resetsAt
        : new Date(snapshot.lastData.rolling.resetsAt)
      const remaining = !isNaN(resetDate.getTime())
        ? timeRemaining(resetDate, new Date(), locale)
        : ''
      const resetPart = remaining ? ` · ${t(locale, 'resetsInPrefix')}${remaining}` : ''
      tooltip = `OpenCode Go: ${percent}% (${t(locale, 'rollingTitle')})${resetPart}`
    }
    this.tray.setToolTip(tooltip)

    // 2. macOS native monospaced label with BarLevel color (§11.1, §6.1)
    if (process.platform === 'darwin') {
      if (percent !== null) {
        const level = barLevel(percent)
        const color = BAR_LEVEL_COLORS[level]
        const titleOptions: { fontType: 'monospaced'; color?: string } = {
          fontType: 'monospaced'
        }
        if (color) {
          titleOptions.color = color
        }
        this.tray.setTitle(` ${percent}%`, titleOptions as any)
      } else {
        this.tray.setTitle('')
      }
    } else if (percent === null) {
      // Revert to base icon if no percent on Windows/Linux
      this.tray.setImage(this.baseIcon)
    }
  }

  /**
   * Sets canvas-generated badge image for Windows / Linux tray (§6.1).
   */
  setImageFromDataUrl(dataUrl: string): void {
    if (!this.tray || process.platform === 'darwin') {
      return
    }

    if (isNonEmptyString(dataUrl)) {
      const img = nativeImage.createFromDataURL(dataUrl)
      if (!img.isEmpty()) {
        this.tray.setImage(img)
      }
    }
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
