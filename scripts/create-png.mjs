import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const assetsDir = path.join(rootDir, 'assets')

function crc32(buf) {
  if (typeof zlib.crc32 === 'function') {
    return zlib.crc32(buf)
  }
  // Standard CRC32 fallback
  let crc = 0 ^ (-1)
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  }
  return (crc ^ (-1)) >>> 0
}

const table = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
  }
  table[i] = c
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)

  const crcData = Buffer.concat([typeBuf, data])
  const crcVal = crc32(crcData)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crcVal >>> 0, 0)

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function createPng(width, height, getPixel) {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

  // IHDR: width(4), height(4), bitDepth(1), colorType(1), comp(1), filter(1), interlace(1)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8)     // 8 bits per channel
  ihdr.writeUInt8(6, 9)     // RGBA
  ihdr.writeUInt8(0, 10)
  ihdr.writeUInt8(0, 11)
  ihdr.writeUInt8(0, 12)

  const ihdrChunk = makeChunk('IHDR', ihdr)

  // Uncompressed scanlines
  const rowSize = 1 + width * 4
  const rawData = Buffer.alloc(height * rowSize)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize
    rawData.writeUInt8(0, rowOffset) // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4
      const [r, g, b, a] = getPixel(x, y)
      rawData.writeUInt8(r, pixelOffset)
      rawData.writeUInt8(g, pixelOffset + 1)
      rawData.writeUInt8(b, pixelOffset + 2)
      rawData.writeUInt8(a, pixelOffset + 3)
    }
  }

  const compressed = zlib.deflateSync(rawData)
  const idatChunk = makeChunk('IDAT', compressed)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk])
}

// 16x16 >_ glyph
function getPixel16(x, y) {
  // `>` lines:
  // (3,3)-(7,7) and (7,7)-(3,11)
  let isChar = false

  // Diagonal down-right
  if ((x === 3 && y === 3) || (x === 4 && y === 3) ||
      (x === 4 && y === 4) || (x === 5 && y === 4) ||
      (x === 5 && y === 5) || (x === 6 && y === 5) ||
      (x === 6 && y === 6) || (x === 7 && y === 6) ||
      (x === 7 && y === 7) || (x === 8 && y === 7)) {
    isChar = true
  }

  // Diagonal down-left
  if ((x === 6 && y === 8) || (x === 7 && y === 8) ||
      (x === 5 && y === 9) || (x === 6 && y === 9) ||
      (x === 4 && y === 10) || (x === 5 && y === 10) ||
      (x === 3 && y === 11) || (x === 4 && y === 11)) {
    isChar = true
  }

  // `_` underscore at bottom right: x: 9..14, y: 11..12
  if (x >= 9 && x <= 14 && (y === 11 || y === 12)) {
    isChar = true
  }

  if (isChar) {
    return [0, 0, 0, 255]
  }
  return [0, 0, 0, 0]
}

// 32x32 @2x >_ glyph
function getPixel32(x, y) {
  const scaledX = Math.floor(x / 2)
  const scaledY = Math.floor(y / 2)
  return getPixel16(scaledX, scaledY)
}

const png16 = createPng(16, 16, getPixel16)
const png32 = createPng(32, 32, getPixel32)

fs.writeFileSync(path.join(assetsDir, 'trayIcon.png'), png16)
fs.writeFileSync(path.join(assetsDir, 'trayIcon@2x.png'), png32)
fs.writeFileSync(path.join(assetsDir, 'trayIconTemplate.png'), png16)
fs.writeFileSync(path.join(assetsDir, 'trayIconTemplate@2x.png'), png32)

console.log(`Generated valid PNGs: 16px (${png16.length} bytes), 32px (${png32.length} bytes)`)
