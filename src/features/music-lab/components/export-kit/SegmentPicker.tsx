'use client'

/**
 * SegmentPicker — audio scrubber + draggable segment bands.
 *
 * Renders a compact pseudo-waveform (procedural bars, no wavesurfer dep),
 * HTML5 audio element with play/pause, a ruler in 5s ticks, and coloured
 * bands for each segment. Bands are draggable (move / resize left+right
 * edges). New segments are created by Shift-click-drag on empty space.
 *
 * Segment constraints: min 3s, max 15s. Overlap permitted but flagged
 * via the SegmentRow badge (handled by parent).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { SongSegment } from '../../hooks/useSegments'
import { deriveStatus } from '../../hooks/useSegments'

interface Props {
  audioUrl: string
  durationS: number
  segments: SongSegment[]
  activeSegmentId: string | null
  onSelect: (id: string | null) => void
  onCreate: (startS: number, endS: number) => void
  onResize: (id: string, startS: number, endS: number) => void
  onDelete: (id: string) => void
}

const MIN_DUR = 3
const MAX_DUR = 15
const BAR_COUNT = 140

type DragMode = 'move' | 'resize-left' | 'resize-right' | 'create' | null

export function SegmentPicker({
  audioUrl,
  durationS,
  segments,
  activeSegmentId,
  onSelect,
  onCreate,
  onResize,
  onDelete,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playheadS, setPlayheadS] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>(null)
  const [dragSegmentId, setDragSegmentId] = useState<string | null>(null)
  const [dragAnchorS, setDragAnchorS] = useState(0)
  const [dragInitial, setDragInitial] = useState<{ start: number; end: number } | null>(null)
  const [ghost, setGhost] = useState<{ start: number; end: number } | null>(null)

  // Procedural pseudo-waveform bars — deterministic from the URL.
  const bars = useMemo(() => {
    const seed = hashString(audioUrl || 'empty')
    const out: number[] = []
    let s = seed
    for (let i = 0; i < BAR_COUNT; i++) {
      s = (s * 9301 + 49297) % 233280
      const noise = s / 233280
      const env = Math.sin((i / BAR_COUNT) * Math.PI * 2.5) * 0.4 + 0.5
      out.push(Math.max(0.15, Math.min(1, env * (0.55 + noise * 0.7))))
    }
    return out
  }, [audioUrl])

  // Audio time sync.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setPlayheadS(el.currentTime)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onPause)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onPause)
    }
  }, [])

  const pxToSeconds = useCallback(
    (clientX: number): number => {
      const track = trackRef.current
      if (!track) return 0
      const rect = track.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return pct * durationS
    },
    [durationS]
  )

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) el.play().catch(() => undefined)
    else el.pause()
  }, [])

  const seekTo = useCallback((s: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(s, el.duration || s))
  }, [])

  // Global mouse handlers during drag.
  useEffect(() => {
    if (!dragMode) return

    const handleMove = (e: MouseEvent) => {
      if (!dragInitial) return
      const cur = pxToSeconds(e.clientX)

      if (dragMode === 'create') {
        const a = dragAnchorS
        const b = cur
        const start = Math.max(0, Math.min(a, b))
        const end = Math.min(durationS, Math.max(a, b))
        setGhost({ start, end })
        return
      }

      if (!dragSegmentId) return
      const { start, end } = dragInitial
      const span = end - start

      if (dragMode === 'move') {
        const delta = cur - dragAnchorS
        let ns = start + delta
        let ne = end + delta
        if (ns < 0) {
          ne += 0 - ns
          ns = 0
        }
        if (ne > durationS) {
          ns -= ne - durationS
          ne = durationS
        }
        onResize(dragSegmentId, ns, ne)
      } else if (dragMode === 'resize-left') {
        const ns = Math.min(end - MIN_DUR, Math.max(0, Math.min(cur, end - MIN_DUR)))
        const clamped = Math.max(end - MAX_DUR, ns)
        onResize(dragSegmentId, clamped, end)
      } else if (dragMode === 'resize-right') {
        const ne = Math.max(start + MIN_DUR, Math.min(durationS, cur))
        const clamped = Math.min(start + MAX_DUR, ne)
        onResize(dragSegmentId, start, clamped)
      }
      // Suppress unused eslint warning for span in non-move modes.
      void span
    }

    const handleUp = () => {
      if (dragMode === 'create' && ghost) {
        const span = ghost.end - ghost.start
        if (span >= MIN_DUR) {
          const clippedEnd = Math.min(ghost.end, ghost.start + MAX_DUR)
          onCreate(ghost.start, clippedEnd)
        }
      }
      setDragMode(null)
      setDragSegmentId(null)
      setDragInitial(null)
      setGhost(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [
    dragMode,
    dragSegmentId,
    dragInitial,
    dragAnchorS,
    durationS,
    pxToSeconds,
    onCreate,
    onResize,
    ghost,
  ])

  // Mouse-down on empty track → seek (or begin "create" with shift).
  const handleTrackMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-segment="true"]')) return
      const at = pxToSeconds(e.clientX)
      if (e.shiftKey) {
        setDragMode('create')
        setDragAnchorS(at)
        setDragInitial({ start: at, end: at })
        setGhost({ start: at, end: at + MIN_DUR })
      } else {
        seekTo(at)
        onSelect(null)
      }
    },
    [pxToSeconds, seekTo, onSelect]
  )

  // Creates a segment at the current playhead.
  const createAtPlayhead = useCallback(() => {
    const start = Math.max(0, Math.min(playheadS, durationS - MIN_DUR))
    const end = Math.min(durationS, start + Math.min(MAX_DUR, 10))
    onCreate(start, end)
  }, [playheadS, durationS, onCreate])

  const ticks = useMemo(() => {
    if (!durationS) return []
    const step = durationS > 180 ? 30 : durationS > 60 ? 10 : 5
    const out: number[] = []
    for (let t = 0; t <= durationS; t += step) out.push(t)
    return out
  }, [durationS])

  return (
    <div className="space-y-2 select-none">
      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

      {/* Transport row */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 transition-all"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs tabular-nums text-muted-foreground w-12">
            {formatTime(playheadS)}
          </span>
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
            {formatTime(durationS)}
          </span>
        </div>
        <button
          onClick={createAtPlayhead}
          className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-medium transition-all"
          title="Create a new segment at the current playhead"
        >
          <Plus className="w-3.5 h-3.5" />
          Segment
        </button>
      </div>

      {/* Waveform track + segments */}
      <div
        ref={trackRef}
        onMouseDown={handleTrackMouseDown}
        className={cn(
          'relative w-full h-24 rounded-xl border border-border/60 bg-gradient-to-b from-background/40 to-muted/20 overflow-hidden',
          dragMode === 'create' && 'cursor-ew-resize'
        )}
      >
        {/* Pseudo-waveform bars */}
        <div className="absolute inset-0 flex items-center gap-[1px] px-1">
          {bars.map((h, i) => {
            const pct = i / BAR_COUNT
            const played = pct * durationS < playheadS
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-sm transition-colors',
                  played ? 'bg-cyan-400/60' : 'bg-foreground/20'
                )}
                style={{ height: `${h * 70}%` }}
              />
            )
          })}
        </div>

        {/* Segment bands */}
        {segments.map((seg) => {
          const left = (seg.startS / durationS) * 100
          const width = Math.max(1, ((seg.endS - seg.startS) / durationS) * 100)
          const isActive = activeSegmentId === seg.id
          const status = deriveStatus(seg)
          const ring =
            status === 'exported'
              ? 'ring-emerald-400/70 bg-emerald-400/20'
              : status === 'sheet-generated'
              ? 'ring-cyan-400/70 bg-cyan-400/20'
              : status === 'ready'
              ? 'ring-amber-400/70 bg-amber-400/20'
              : 'ring-muted-foreground/50 bg-muted/30'
          return (
            <div
              key={seg.id}
              data-segment="true"
              className={cn(
                'absolute top-1 bottom-1 rounded-md ring-1 backdrop-blur-[1px] cursor-grab',
                ring,
                isActive && 'ring-2 shadow-[0_0_0_2px_rgba(6,182,212,0.35)]'
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onSelect(seg.id)
                setDragSegmentId(seg.id)
                setDragInitial({ start: seg.startS, end: seg.endS })
                setDragAnchorS(pxToSeconds(e.clientX))
                setDragMode('move')
              }}
            >
              {/* Left handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-foreground/20 hover:bg-foreground/40"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onSelect(seg.id)
                  setDragSegmentId(seg.id)
                  setDragInitial({ start: seg.startS, end: seg.endS })
                  setDragMode('resize-left')
                }}
              />
              {/* Right handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-foreground/20 hover:bg-foreground/40"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  onSelect(seg.id)
                  setDragSegmentId(seg.id)
                  setDragInitial({ start: seg.startS, end: seg.endS })
                  setDragMode('resize-right')
                }}
              />
              {/* Label */}
              <div className="absolute top-0.5 left-2 right-2 flex items-center justify-between gap-1 text-[10px] font-medium truncate pointer-events-none">
                <span className="truncate text-foreground/90">
                  {seg.label || 'Segment'}
                </span>
                <span className="tabular-nums text-foreground/60">
                  {formatTime(seg.endS - seg.startS)}
                </span>
              </div>
              {isActive && (
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-md pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(seg.id)
                  }}
                  title="Delete segment"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Ghost (create-drag) */}
        {ghost && dragMode === 'create' && (
          <div
            className="absolute top-1 bottom-1 rounded-md ring-2 ring-dashed ring-cyan-300/70 bg-cyan-400/10 pointer-events-none"
            style={{
              left: `${(ghost.start / durationS) * 100}%`,
              width: `${Math.max(1, ((ghost.end - ghost.start) / durationS) * 100)}%`,
            }}
          />
        )}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-cyan-300 shadow-[0_0_6px_rgba(6,182,212,0.9)] pointer-events-none"
          style={{ left: `${(playheadS / (durationS || 1)) * 100}%` }}
        />
      </div>

      {/* Ruler */}
      <div className="relative w-full h-4 text-[10px] text-muted-foreground tabular-nums">
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${(t / durationS) * 100}%` }}
          >
            <div className="w-px h-1.5 bg-border/70" />
            <span>{formatTime(t)}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px]">Shift</kbd> + drag to
        carve a new segment · drag band edges to resize · 3s min, 15s max
      </p>
    </div>
  )
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h || 1
}
