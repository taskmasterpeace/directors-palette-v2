'use client'

/**
 * SegmentRow — compact row for a single segment.
 *
 * Status dot / inline rename / open-editor / download / delete.
 */

import { useState } from 'react'
import {
  Check,
  Download,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import type { SongSegment } from '../../hooks/useSegments'
import { deriveStatus } from '../../hooks/useSegments'

interface Props {
  segment: SongSegment
  overlaps: boolean
  isActive: boolean
  isExporting: boolean
  onSelect: () => void
  onRename: (label: string) => void
  onOpenEditor: () => void
  onExport: () => void
  onDelete: () => void
}

const STATUS_TEXT: Record<ReturnType<typeof deriveStatus>, string> = {
  draft: 'Draft — beats incomplete',
  ready: 'Ready to generate sheet',
  'sheet-generated': 'Sheet ready — export ZIP',
  exported: 'Exported',
}

const STATUS_DOT: Record<ReturnType<typeof deriveStatus>, string> = {
  draft: 'bg-muted-foreground/60',
  ready: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]',
  'sheet-generated': 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]',
  exported: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
}

export function SegmentRow({
  segment,
  overlaps,
  isActive,
  isExporting,
  onSelect,
  onRename,
  onOpenEditor,
  onExport,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(segment.label)
  const status = deriveStatus(segment)

  const commitRename = () => {
    const next = draft.trim() || segment.label || 'Segment'
    if (next !== segment.label) onRename(next)
    setEditing(false)
  }

  const canExport = status === 'ready' || status === 'sheet-generated' || status === 'exported'

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-all',
        isActive ? 'ring-1 ring-cyan-400/50 bg-card/80' : 'hover:bg-card/70'
      )}
    >
      {/* Status */}
      <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
        <div className={cn('w-2.5 h-2.5 rounded-full', STATUS_DOT[status])} />
        <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground text-center leading-tight">
          {status === 'sheet-generated' ? 'sheet' : status}
        </span>
      </div>

      {/* Label + timecode */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setDraft(segment.label)
                setEditing(false)
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent border-b border-cyan-400/50 text-sm font-medium focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{segment.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDraft(segment.label)
                setEditing(true)
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
              title="Rename"
            >
              <Pencil className="w-3 h-3" />
            </button>
            {overlaps && (
              <span
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300"
                title="Overlaps another segment"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                overlap
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {formatTime(segment.startS)} → {formatTime(segment.endS)}
          </span>
          <span>·</span>
          <span className="tabular-nums">{formatTime(segment.endS - segment.startS)}</span>
          <span>·</span>
          <span className="truncate max-w-[14rem]">{STATUS_TEXT[status]}</span>
          {segment.downloadCount && segment.downloadCount > 1 ? (
            <>
              <span>·</span>
              <span className="text-emerald-300">× {segment.downloadCount}</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenEditor()
          }}
          className="px-2.5 h-8 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted/80 text-foreground transition-colors"
        >
          Beats
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (canExport) onExport()
          }}
          disabled={!canExport || isExporting}
          className={cn(
            'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-colors',
            canExport && !isExporting
              ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
              : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
          )}
        >
          {isExporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : status === 'exported' ? (
            <Check className="w-3 h-3" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {isExporting ? 'Exporting' : status === 'exported' ? 'Re-export' : 'Export'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="w-8 h-8 rounded-md text-muted-foreground hover:text-rose-300 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
          title="Delete segment"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
