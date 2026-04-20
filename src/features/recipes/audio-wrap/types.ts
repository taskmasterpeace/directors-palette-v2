/**
 * Audio-to-MP4 Wrap — types
 *
 * Wraps a ~15s audio clip into a black-screen MP4 so it uploads cleanly to
 * external video generators (Kling, Runway, Sora, Seedance). The video
 * track is a 1280x720 black canvas at 24fps; the audio is re-encoded to
 * AAC @ 192kbps and the container is MP4 with faststart.
 */

export interface AudioWrapInput {
  /**
   * Source audio URL (Supabase public URL, R2 public URL, or any http(s)
   * URL that ffmpeg can read). Local file paths are not accepted.
   */
  audioUrl: string
  /** Trim start in seconds (0 for beginning of source) */
  startS: number
  /** Trim end in seconds (must be > startS and (endS - startS) <= 15) */
  endS: number
  /** Free-form identifier used in the storage path, e.g. `${songId}_${segmentId}` */
  label: string
}

export interface AudioWrapResult {
  /** Deterministic hash-based id for this wrap run */
  id: string
  /** Public URL of the resulting MP4 */
  audioClipUrl: string
  /** Supabase storage path */
  storagePath: string
  /** Wrapped clip duration in seconds */
  durationS: number
  /** File size of the output MP4 in bytes */
  fileSize: number
  /** Whether the file already existed (served from cache) */
  cached: boolean
  /** ISO timestamp */
  createdAt: string
}
