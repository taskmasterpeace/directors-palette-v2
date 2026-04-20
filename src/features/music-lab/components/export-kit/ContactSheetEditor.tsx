'use client'

/**
 * ContactSheetEditor — modal for editing a segment's scene brief + 6 beats.
 * "Auto-draft from DNA" calls /api/music-lab/auto-draft-beats and fills
 * all 6 captions in one shot. User can still edit anything before export.
 */

import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/utils'
import type { ContactSheetBeat } from '@/features/recipes/contact-sheet'
import type { SongSegment } from '../../hooks/useSegments'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: SongSegment
  artistId: string | null
  onSave: (scene: string, beats: ContactSheetBeat[]) => void
}

export function ContactSheetEditor({ open, onOpenChange, segment, artistId, onSave }: Props) {
  const [scene, setScene] = useState(segment.scene)
  const [beats, setBeats] = useState<ContactSheetBeat[]>(segment.beats)
  const [drafting, setDrafting] = useState(false)

  // Refresh local state when the modal opens with a new segment.
  useEffect(() => {
    if (open) {
      setScene(segment.scene)
      setBeats(
        segment.beats.length === 6
          ? segment.beats
          : Array.from({ length: 6 }, (_, i) => segment.beats[i] ?? { caption: '' })
      )
    }
  }, [open, segment])

  const updateBeat = (idx: number, caption: string) => {
    setBeats((prev) => prev.map((b, i) => (i === idx ? { ...b, caption } : b)))
  }

  const filled = beats.every((b) => b.caption.trim().length > 0) && scene.trim().length > 0

  const autoDraft = async () => {
    if (!artistId) {
      toast.error('Pick an artist first')
      return
    }
    if (!scene.trim()) {
      toast.error('Add a one-line scene brief first, then auto-draft beats')
      return
    }
    setDrafting(true)
    try {
      const res = await fetch('/api/music-lab/auto-draft-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          scene: scene.trim(),
          segmentLabel: segment.label,
          startS: segment.startS,
          endS: segment.endS,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Draft failed (${res.status})`)
      }
      const data = (await res.json()) as { beats: ContactSheetBeat[] }
      if (!Array.isArray(data.beats) || data.beats.length !== 6) {
        throw new Error('Bad auto-draft response')
      }
      setBeats(data.beats)
      toast.success('Drafted 6 beats from DNA')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Draft failed'
      toast.error(msg)
    } finally {
      setDrafting(false)
    }
  }

  const save = () => {
    onSave(scene.trim(), beats.map((b) => ({ caption: b.caption.trim() })))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            Beats — {segment.label}
          </DialogTitle>
          <DialogDescription>
            {formatTime(segment.startS)} → {formatTime(segment.endS)} · {formatTime(segment.endS - segment.startS)}.
            One imperative line per beat. Think in shots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Scene brief
            </label>
            <Textarea
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="e.g. Neon-lit diner booth at 3am, rain on the window, artist writing in a notebook…"
              className="min-h-[80px] bg-card/30"
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Used both to guide the auto-drafter and to seed the contact sheet.
              </p>
              <button
                onClick={autoDraft}
                disabled={drafting || !artistId}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium transition-all',
                  drafting || !artistId
                    ? 'bg-muted/40 text-muted-foreground cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 hover:from-cyan-500/30 hover:to-fuchsia-500/30 text-cyan-200 border border-cyan-400/40'
                )}
              >
                {drafting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                Auto-draft from DNA
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              6 Beats
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {beats.map((beat, i) => (
                <BeatInput
                  key={i}
                  index={i}
                  caption={beat.caption}
                  onChange={(v) => updateBeat(i, v)}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Beats 1 &amp; 6 are bookends (open / close). 2–5 escalate or pivot.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            {filled ? (
              <span className="text-emerald-300">Ready to export</span>
            ) : (
              'Fill scene brief + all 6 beats to enable export'
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 h-9 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="px-3 h-9 rounded-md text-sm font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 transition-colors"
            >
              Save beats
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BeatInput({
  index,
  caption,
  onChange,
}: {
  index: number
  caption: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/30 p-2">
      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-muted/50 text-muted-foreground text-xs font-semibold tabular-nums flex-shrink-0">
        {index + 1}
      </span>
      <Textarea
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        placeholder={HINTS[index]}
        className="min-h-[48px] text-sm bg-transparent border-transparent focus-visible:border-cyan-400/30 focus-visible:ring-0 p-1.5 resize-none"
        rows={2}
      />
    </div>
  )
}

const HINTS = [
  'Open: low dolly-in on the setting…',
  'Reveal: subject enters, keys in hand…',
  'Build: camera rises, tension grows…',
  'Pivot: cut to detail — gold chain, breath…',
  'Escalate: performance moment, full body…',
  'Close: pullback, neon, final stare…',
]

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
