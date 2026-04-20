'use client'

/**
 * ExportKitTab — "Pre-production kit exporter" for Music Lab.
 *
 * The strategic pivot: stop fighting Seedance's E005 face filter. Instead
 * let the user assemble per-segment export ZIPs (character-sheet.jpg +
 * contact-sheet.jpg + audio-15s.mp4 + kit-notes.txt) that they can take
 * to any external video tool (Kling, Runway, Sora, Seedance) without
 * fighting face-ref filters.
 *
 * Flow: pick artist → pick song (already uploaded in Music Lab) → drop
 * segments on the waveform → fill beats (auto-draft from DNA) → Export
 * kit ZIP per segment.
 */

import { useEffect, useMemo, useState } from 'react'
import { Disc3, Music2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { useMusicLabStore } from '../../store/music-lab.store'
import {
  useSegments,
  type SongSegment,
  emptyBeats,
  deriveStatus,
} from '../../hooks/useSegments'
import { useExportKit } from '../../hooks/useExportKit'
import type { ContactSheetBeat } from '@/features/recipes/contact-sheet'
import { SegmentPicker } from './SegmentPicker'
import { SegmentRow } from './SegmentRow'
import { SongCoverageStrip } from './SongCoverageStrip'
import { ContactSheetEditor } from './ContactSheetEditor'

interface Props {
  userId: string
}

export function ExportKitTab({ userId }: Props) {
  void userId // currently only used by child components that pull from stores
  const artists = useArtistDnaStore((s) => s.artists)
  const activeArtistId = useArtistDnaStore((s) => s.activeArtistId)
  const project = useMusicLabStore((s) => s.project)

  const audioUrl = project.audioUrl ?? ''
  const audioFileName = project.audioFileName ?? ''

  // Stable per-song key (derived from URL) so segments persist per song.
  const songId = useMemo(() => deriveSongId(audioUrl, audioFileName), [audioUrl, audioFileName])

  const [durationS, setDurationS] = useState<number>(0)
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null)
  const [editorOpenFor, setEditorOpenFor] = useState<string | null>(null)

  const { segments, upsert, remove } = useSegments(activeArtistId, songId)
  const { exportKit, isRunning, phase } = useExportKit()
  const [exportingId, setExportingId] = useState<string | null>(null)

  // Probe audio duration.
  useEffect(() => {
    if (!audioUrl) {
      setDurationS(0)
      return
    }
    const a = new Audio()
    a.preload = 'metadata'
    a.src = audioUrl
    const onMeta = () => setDurationS(a.duration || 0)
    a.addEventListener('loadedmetadata', onMeta)
    return () => a.removeEventListener('loadedmetadata', onMeta)
  }, [audioUrl])

  const activeArtist = artists.find((a) => a.id === activeArtistId) || null

  const createSegment = (startS: number, endS: number) => {
    if (!activeArtistId || !songId) return
    const nextLabel = `Segment ${segments.length + 1}`
    const seg: SongSegment = {
      id: crypto.randomUUID(),
      label: nextLabel,
      startS,
      endS,
      scene: '',
      beats: emptyBeats(),
      createdAt: new Date().toISOString(),
    }
    upsert(seg)
    setActiveSegmentId(seg.id)
  }

  const resizeSegment = (id: string, startS: number, endS: number) => {
    const seg = segments.find((s) => s.id === id)
    if (!seg) return
    upsert({ ...seg, startS, endS })
  }

  const deleteSegment = (id: string) => {
    remove(id)
    if (activeSegmentId === id) setActiveSegmentId(null)
  }

  const renameSegment = (id: string, label: string) => {
    const seg = segments.find((s) => s.id === id)
    if (!seg) return
    upsert({ ...seg, label })
  }

  const saveBeats = (id: string, scene: string, beats: ContactSheetBeat[]) => {
    const seg = segments.find((s) => s.id === id)
    if (!seg) return
    upsert({ ...seg, scene, beats })
  }

  const runExport = async (id: string) => {
    const seg = segments.find((s) => s.id === id)
    if (!seg) return
    if (!activeArtistId) {
      toast.error('Pick an artist first')
      return
    }
    if (!audioUrl) {
      toast.error('Upload a song in the Music Video tab first')
      return
    }
    setExportingId(id)
    const result = await exportKit({
      artistId: activeArtistId,
      songId,
      audioUrl,
      segment: seg,
    })
    setExportingId(null)
    if (!result) return
    upsert({
      ...seg,
      contactSheetUrl: result.contactSheetUrl,
      lastExportUrl: result.zipUrl,
      lastExportedAt: result.createdAt,
      downloadCount: result.downloadCount,
    })
    // Trigger download.
    window.open(result.zipUrl, '_blank', 'noopener,noreferrer')
  }

  const overlaps = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 1; j < segments.length; j++) {
        const a = segments[i]
        const b = segments[j]
        if (a.startS < b.endS && b.startS < a.endS) {
          set.add(a.id)
          set.add(b.id)
        }
      }
    }
    return set
  }, [segments])

  const editorSegment = segments.find((s) => s.id === editorOpenFor) || null

  const readyCount = segments.filter((s) => {
    const st = deriveStatus(s)
    return st === 'ready' || st === 'sheet-generated' || st === 'exported'
  }).length

  // ── Empty states ─────────────────────────────────────────────
  if (!activeArtistId) {
    return (
      <EmptyState
        icon={<Disc3 className="w-10 h-10 text-cyan-300" />}
        title="Pick an artist first"
        body="Head to the Artist Lab tab, create or select an artist, then come back here."
      />
    )
  }
  if (!audioUrl) {
    return (
      <EmptyState
        icon={<Music2 className="w-10 h-10 text-amber-300" />}
        title="No song loaded"
        body="Upload a song in the Music Video tab, then return here to carve it into export-ready segments."
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Export Kit
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Pre-production bundles for any video tool. Each segment exports a
              ZIP with a character sheet, a 6-frame contact sheet, the 15s
              audio clip, and kit notes.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-end text-xs">
              <span className="text-muted-foreground">Artist</span>
              <span className="font-medium truncate max-w-[10rem]">
                {activeArtist?.name || '—'}
              </span>
            </div>
            <div className="w-px h-8 bg-border/60" />
            <div className="flex flex-col items-end text-xs">
              <span className="text-muted-foreground">Song</span>
              <span className="font-medium truncate max-w-[14rem]">
                {audioFileName || 'Unnamed song'}
              </span>
            </div>
          </div>
        </div>

        {/* Waveform */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 space-y-4">
          <SegmentPicker
            audioUrl={audioUrl}
            durationS={durationS}
            segments={segments}
            activeSegmentId={activeSegmentId}
            onSelect={setActiveSegmentId}
            onCreate={createSegment}
            onResize={resizeSegment}
            onDelete={deleteSegment}
          />
          <SongCoverageStrip durationS={durationS} segments={segments} />
        </div>

        {/* Segment list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Segments
            </h2>
            <span className="text-xs text-muted-foreground">
              {readyCount} of {segments.length} ready
            </span>
          </div>

          {segments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/20 p-8 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No segments yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Shift+drag on the waveform or click the{' '}
                <span className="text-amber-300">Segment</span> button to carve
                a 3–15s chunk. Fill beats, hit export, take the ZIP to any
                video tool.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {segments.map((seg) => (
                <SegmentRow
                  key={seg.id}
                  segment={seg}
                  overlaps={overlaps.has(seg.id)}
                  isActive={activeSegmentId === seg.id}
                  isExporting={exportingId === seg.id && isRunning}
                  onSelect={() => setActiveSegmentId(seg.id)}
                  onRename={(label) => renameSegment(seg.id, label)}
                  onOpenEditor={() => setEditorOpenFor(seg.id)}
                  onExport={() => runExport(seg.id)}
                  onDelete={() => deleteSegment(seg.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Phase banner */}
        {isRunning && exportingId && (
          <PhaseBanner phase={phase} label={segments.find((s) => s.id === exportingId)?.label} />
        )}
      </div>

      {/* Beats editor */}
      {editorSegment && (
        <ContactSheetEditor
          open={!!editorOpenFor}
          onOpenChange={(v) => !v && setEditorOpenFor(null)}
          segment={editorSegment}
          artistId={activeArtistId}
          onSave={(scene, beats) => saveBeats(editorSegment.id, scene, beats)}
        />
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function PhaseBanner({
  phase,
  label,
}: {
  phase: string
  label: string | undefined
}) {
  const text =
    phase === 'preparing'
      ? 'Preparing export…'
      : phase === 'generating-sheet'
      ? 'Generating 6-frame contact sheet (this takes ~30s)…'
      : phase === 'wrapping-audio'
      ? 'Wrapping audio to MP4…'
      : phase === 'bundling'
      ? 'Bundling ZIP…'
      : 'Working…'
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-sm">
        <span className="font-medium text-cyan-200">{label || 'Segment'}</span>
        <span className="text-muted-foreground"> — {text}</span>
      </span>
    </div>
  )
}

/** Derive a stable id for a song from its URL, falling back to the filename. */
function deriveSongId(audioUrl: string, fileName: string): string {
  const key = audioUrl || fileName || ''
  if (!key) return ''
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return `song_${h.toString(16)}`
}
