import { app, nativeImage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const assetsDir = path.join(rootDir, 'assets')

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

app.whenReady().then(() => {
  // SVG for >_ in 16x16
  const svg16 = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path d="M2.5 3.5 L7.5 8 L2.5 12.5" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M8.5 12.5 L14 12.5" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" />
    </svg>
  `.trim()

  // SVG for >_ in 32x32 (@2x)
  const svg32 = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <path d="M5 7 L15 16 L5 25" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M17 25 L28 25" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" />
    </svg>
  `.trim()

  const dataUrl16 = `data:image/svg+xml;base64,${Buffer.from(svg16).toString('base64')}`
  const dataUrl32 = `data:image/svg+xml;base64,${Buffer.from(svg32).toString('base64')}`

  const img16 = nativeImage.createFromDataURL(dataUrl16)
  const img32 = nativeImage.createFromDataURL(dataUrl32)

  // Save 16px and 32px versions
  fs.writeFileSync(path.join(assetsDir, 'trayIcon.png'), img16.toPNG())
  fs.writeFileSync(path.join(assetsDir, 'trayIcon@2x.png'), img32.toPNG())
  fs.writeFileSync(path.join(assetsDir, 'trayIconTemplate.png'), img16.toPNG())
  fs.writeFileSync(path.join(assetsDir, 'trayIconTemplate@2x.png'), img32.toPNG())

  console.log('Tray icons generated successfully in assets/')
  app.quit()
})
