// Common paths for the spike.
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const SPIKE_ROOT = resolve(dirname(__filename), '..')

export const SPIKE = {
  root: SPIKE_ROOT,
  videos: resolve(SPIKE_ROOT, 'videos'),
  outputs: resolve(SPIKE_ROOT, 'outputs'),
  findings: resolve(SPIKE_ROOT, 'findings.md'),
}

// Windows ffmpeg binary (per CLAUDE.md)
export const FFMPEG_BIN = 'C:/Users/taskm/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffmpeg.exe'
export const FFPROBE_BIN = 'C:/Users/taskm/ffmpeg/ffmpeg-8.0.1-essentials_build/bin/ffprobe.exe'

export function ensureDir(p) {
  mkdirSync(p, { recursive: true })
  return p
}

// Ensure videos/ and outputs/ exist on import.
ensureDir(SPIKE.videos)
ensureDir(SPIKE.outputs)
