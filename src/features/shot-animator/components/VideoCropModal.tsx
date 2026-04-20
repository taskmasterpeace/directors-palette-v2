'use client'

/**
 * VideoCropModal — scrub-and-trim UI for reference videos.
 *
 * Users pick a clip from local disk, set start/end with a dual-handle slider,
 * and we POST the raw file + timestamps to /api/video/crop. The server trims
 * with ffmpeg and uploads the result to R2. We never send base64-encoded
 * videos through the app state — uploads stream directly.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { Loader2, Scissors, X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import { toast } from 'sonner'
import type { ShotReferenceVideo } from '../types'

const MAX_CLIP_SECONDS = 14.5
const MIN_CLIP_SECONDS = 0.5

interface VideoCropModalProps {
  /** Controls dialog open state. */
  isOpen: boolean
  onClose: () => void
  /** The chosen File (kept in memory by the parent until the dialog closes). */
  file: File | null
  /** Called with the uploaded R2 clip after a successful crop. */
  onConfirm: (video: ShotReferenceVideo) => void
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const whole = Math.floor(sec)
  const ms = Math.floor((sec - whole) * 10)
  const mm = Math.floor(whole / 60)
  const ss = whole % 60
  return `${mm}:${ss.toString().padStart(2, '0')}.${ms}`
}

export function VideoCropModal({ isOpen, onClose, file, onConfirm }: VideoCropModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const [range, setRange] = useState<[number, number]>([0, 0])
  const [uploading, setUploading] = useState(false)

  // Create/revoke the object URL as `file` changes.
  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      setDuration(0)
      setRange([0, 0])
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleLoadedMetadata = () => {
    const vid = videoRef.current
    if (!vid) return
    const d = vid.duration
    if (!Number.isFinite(d) || d <= 0) return
    setDuration(d)
    // Preselect the first MAX_CLIP_SECONDS (or the whole clip if shorter)
    const initialEnd = Math.min(d, MAX_CLIP_SECONDS)
    setRange([0, initialEnd])
    vid.currentTime = 0
  }

  const clampRange = useCallback(
    (next: [number, number]): [number, number] => {
      let [start, end] = next
      start = Math.max(0, Math.min(start, duration))
      end = Math.max(0, Math.min(end, duration))
      if (end <= start) end = Math.min(start + MIN_CLIP_SECONDS, duration)
      // Enforce 14.5s cap by pulling whichever handle moved
      if (end - start > MAX_CLIP_SECONDS) {
        // If the start handle moved, pull end down; else push start up
        if (start !== range[0]) end = Math.min(start + MAX_CLIP_SECONDS, duration)
        else start = Math.max(end - MAX_CLIP_SECONDS, 0)
      }
      return [start, end]
    },
    [duration, range]
  )

  const handleSliderChange = (values: number[]) => {
    if (values.length !== 2) return
    const [next, prev] = [values as [number, number], range]
    const clamped = clampRange(next)
    setRange(clamped)
    // Seek the preview to whichever handle the user moved
    const vid = videoRef.current
    if (!vid) return
    if (clamped[0] !== prev[0]) vid.currentTime = clamped[0]
    else if (clamped[1] !== prev[1]) vid.currentTime = clamped[1]
  }

  // Auto-loop preview within the selected range
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || duration === 0) return
    const handleTimeUpdate = () => {
      if (vid.currentTime >= range[1] - 0.05) {
        vid.currentTime = range[0]
      }
    }
    vid.addEventListener('timeupdate', handleTimeUpdate)
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate)
  }, [range, duration])

  const clipLength = range[1] - range[0]
  const canConfirm = !uploading && clipLength >= MIN_CLIP_SECONDS && clipLength <= MAX_CLIP_SECONDS && !!file

  const handleConfirm = async () => {
    if (!file || !canConfirm) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('startSec', range[0].toFixed(3))
      form.append('endSec', range[1].toFixed(3))

      const res = await fetch('/api/video/crop', { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || `Crop failed (${res.status})`)
      }
      const data = (await res.json()) as { url: string; duration: number }
      onConfirm({
        url: data.url,
        duration: data.duration,
        filename: file.name,
      })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      toast.error('Could not process video', { description: msg })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !uploading) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            Trim reference video
          </DialogTitle>
          <DialogDescription>
            Seedance accepts clips up to 15 seconds. Drag the handles to pick up to
            {' '}{MAX_CLIP_SECONDS}s of your video.
          </DialogDescription>
        </DialogHeader>

        {objectUrl ? (
          <div className="space-y-4">
            <video
              ref={videoRef}
              src={objectUrl}
              className="w-full rounded-md bg-black aspect-video"
              controls
              muted
              autoPlay
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
            />

            {duration > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>Start <span className="text-white ml-1">{formatTime(range[0])}</span></span>
                  <span className={cn(
                    'font-medium',
                    clipLength > MAX_CLIP_SECONDS ? 'text-destructive' : 'text-primary'
                  )}>
                    {clipLength.toFixed(1)}s / {MAX_CLIP_SECONDS}s
                  </span>
                  <span>End <span className="text-white ml-1">{formatTime(range[1])}</span></span>
                </div>

                <SliderPrimitive.Root
                  className="relative flex w-full touch-none select-none items-center"
                  value={range}
                  onValueChange={handleSliderChange}
                  min={0}
                  max={duration}
                  step={0.1}
                  minStepsBetweenThumbs={1}
                >
                  <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
                    <SliderPrimitive.Range className="absolute h-full bg-primary" />
                  </SliderPrimitive.Track>
                  <SliderPrimitive.Thumb
                    className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Trim start"
                  />
                  <SliderPrimitive.Thumb
                    className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label="Trim end"
                  />
                </SliderPrimitive.Root>

                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0:00</span>
                  <span>Source: {formatTime(duration)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No video selected
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Scissors className="w-4 h-4 mr-1" />
                Use this clip ({clipLength.toFixed(1)}s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
