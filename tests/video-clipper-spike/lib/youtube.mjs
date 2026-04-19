// yt-dlp wrapper via youtube-dl-exec (auto-downloads the binary).
import ytdl from 'youtube-dl-exec'
import { dirname } from 'node:path'
import { FFMPEG_BIN } from './paths.mjs'
import { log } from './log.mjs'

/**
 * Download a YouTube video (or a slice of it) to outPath.
 * Slice via "start-end" like "0:00-5:00".
 */
export async function downloadYouTube(url, outPath, { slice } = {}) {
  const opts = {
    output: outPath,
    format: 'best[height<=720][ext=mp4]/best[ext=mp4]/best',
    mergeOutputFormat: 'mp4',
    noWarnings: true,
    noPlaylist: true,
    // yt-dlp needs ffmpeg on PATH for partial downloads + muxing.
    // Point it at our local ffmpeg directory (CLAUDE.md path).
    ffmpegLocation: dirname(FFMPEG_BIN),
  }
  if (slice) {
    // yt-dlp supports --download-sections "*0:00-5:00"
    opts.downloadSections = `*${slice}`
    opts.forceKeyframesAtCuts = true
  }
  log.dim(`yt-dlp: ${url}${slice ? ` [${slice}]` : ''} → ${outPath}`)
  await ytdl(url, opts)
  return outPath
}
