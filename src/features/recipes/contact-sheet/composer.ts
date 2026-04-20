/**
 * Contact Sheet — composer
 *
 * Takes 6 frame image buffers + metadata and returns a single JPG buffer
 * laid out as a 3x2 grid (landscape frames) with a header strip and
 * per-frame captions underneath.
 */

import sharp from 'sharp'

const COLS = 3
const ROWS = 2
const FRAME_W = 640
const FRAME_H = 360 // 16:9
const GAP = 12
const PAD = 12
const HEADER_H = 84
const CAPTION_H = 48

const BG = { r: 17, g: 24, b: 39 } // slate-900
const FRAME_FALLBACK = { r: 30, g: 41, b: 59 } // slate-800
const TEXT_COLOR = '#f8fafc'
const MUTED_COLOR = '#94a3b8'
const ACCENT_COLOR = '#22d3ee' // cyan-400 — matches app palette

export interface ComposeInput {
  /** Header title, e.g. "Country Fat — Dusty Exit 9 — Verse 1" */
  title: string
  /** Header subtitle, e.g. "0:60.00 → 1:15.00  ·  15.00s  ·  6-frame brief" */
  subtitle: string
  /** 6 frames in reading order (top-left → bottom-right). Pass `null` to leave a slot blank. */
  frames: Array<{
    buffer: ArrayBuffer | Buffer | null
    caption: string
  }>
}

export interface ComposeResult {
  buffer: Buffer
  width: number
  height: number
}

const CANVAS_W = PAD + COLS * FRAME_W + (COLS - 1) * GAP + PAD
const CANVAS_H =
  HEADER_H +
  PAD +
  ROWS * (FRAME_H + CAPTION_H) +
  (ROWS - 1) * GAP +
  PAD

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildHeaderSvg(title: string, subtitle: string): Buffer {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${HEADER_H}">
      <rect width="100%" height="100%" fill="rgb(${BG.r},${BG.g},${BG.b})"/>
      <text x="${PAD}" y="36" fill="${TEXT_COLOR}"
        font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="700">${escapeXml(title)}</text>
      <text x="${PAD}" y="66" fill="${MUTED_COLOR}"
        font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500">${escapeXml(subtitle)}</text>
      <rect x="0" y="${HEADER_H - 2}" width="100%" height="2" fill="${ACCENT_COLOR}"/>
    </svg>
  `
  return Buffer.from(svg)
}

function buildCaptionSvg(index: number, caption: string): Buffer {
  const label = `Frame ${index + 1}`
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${FRAME_W}" height="${CAPTION_H}">
      <rect width="100%" height="100%" fill="rgb(${BG.r},${BG.g},${BG.b})"/>
      <text x="10" y="20" fill="${ACCENT_COLOR}"
        font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="700" letter-spacing="1">${label}</text>
      <text x="10" y="40" fill="${TEXT_COLOR}"
        font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="500">${escapeXml(truncate(caption, 90))}</text>
    </svg>
  `
  return Buffer.from(svg)
}

function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

async function resizeFrame(
  buf: ArrayBuffer | Buffer | null
): Promise<Buffer> {
  if (!buf) {
    // blank slate-800 placeholder
    return sharp({
      create: {
        width: FRAME_W,
        height: FRAME_H,
        channels: 3,
        background: FRAME_FALLBACK,
      },
    })
      .jpeg({ quality: 85 })
      .toBuffer()
  }
  const input = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
  return sharp(input)
    .resize(FRAME_W, FRAME_H, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 85 })
    .toBuffer()
}

/**
 * Compose the final contact sheet JPG.
 */
export async function composeContactSheet(
  input: ComposeInput
): Promise<ComposeResult> {
  if (input.frames.length !== 6) {
    throw new Error(
      `composeContactSheet expects 6 frames (got ${input.frames.length})`
    )
  }

  // 1. Resize all frames (in parallel)
  const resized = await Promise.all(
    input.frames.map((f) => resizeFrame(f.buffer))
  )

  // 2. Build composite overlay list
  const overlays: sharp.OverlayOptions[] = []

  // Header
  overlays.push({ input: buildHeaderSvg(input.title, input.subtitle), top: 0, left: 0 })

  // Frames + captions
  const gridTop = HEADER_H + PAD
  for (let i = 0; i < 6; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = PAD + col * (FRAME_W + GAP)
    const yFrame = gridTop + row * (FRAME_H + CAPTION_H + GAP)
    const yCaption = yFrame + FRAME_H

    overlays.push({ input: resized[i], top: yFrame, left: x })
    overlays.push({
      input: buildCaptionSvg(i, input.frames[i].caption),
      top: yCaption,
      left: x,
    })
  }

  // 3. Base canvas + composite → JPG
  const jpg = await sharp({
    create: {
      width: CANVAS_W,
      height: CANVAS_H,
      channels: 3,
      background: BG,
    },
  })
    .composite(overlays)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()

  return { buffer: jpg, width: CANVAS_W, height: CANVAS_H }
}

export const CONTACT_SHEET_DIMENSIONS = { width: CANVAS_W, height: CANVAS_H }
