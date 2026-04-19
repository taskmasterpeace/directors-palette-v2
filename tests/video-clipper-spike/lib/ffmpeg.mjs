// Thin wrapper around ffmpeg binary.
import { spawn } from 'node:child_process'
import { FFMPEG_BIN, FFPROBE_BIN } from './paths.mjs'

export async function ffmpeg(args, { onStderr } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, args, { windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', (d) => {
      stderr += d
      onStderr?.(d.toString())
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve({ stderr })
      else reject(new Error(`ffmpeg exited ${code}:\n${stderr.slice(-2000)}`))
    })
  })
}

export async function ffprobe(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFPROBE_BIN, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d) => (stdout += d))
    proc.stderr.on('data', (d) => (stderr += d))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`ffprobe exited ${code}: ${stderr}`))
    })
  })
}

export async function probeDuration(videoPath) {
  const { stdout } = await ffprobe([
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ])
  return Number.parseFloat(stdout.trim())
}

export async function extractAudio(videoPath, outPath) {
  await ffmpeg([
    '-y',
    '-i', videoPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-ab', '128k',
    outPath,
  ])
  return outPath
}

export async function extractFrame(videoPath, timeSec, outPath) {
  await ffmpeg([
    '-y',
    '-ss', String(timeSec),
    '-i', videoPath,
    '-frames:v', '1',
    '-q:v', '2',
    outPath,
  ])
  return outPath
}

export async function cutSegment(videoPath, startSec, endSec, outPath) {
  const duration = endSec - startSec
  await ffmpeg([
    '-y',
    '-ss', String(startSec),
    '-i', videoPath,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    '-crf', '20',
    outPath,
  ])
  return outPath
}
