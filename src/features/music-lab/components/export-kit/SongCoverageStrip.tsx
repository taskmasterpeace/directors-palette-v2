'use client'

/**
 * SongCoverageStrip — thin horizontal bar showing which parts of the
 * song have been covered by at least one segment. Exported ranges get
 * a brighter tint than merely-planned ones.
 */

import type { SongSegment } from '../../hooks/useSegments'

interface Props {
  durationS: number
  segments: SongSegment[]
}

export function SongCoverageStrip({ durationS, segments }: Props) {
  if (!durationS || durationS <= 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Song coverage
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {segments.length} segment{segments.length === 1 ? '' : 's'} ·{' '}
          {formatDuration(
            segments.reduce((acc, s) => acc + (s.endS - s.startS), 0)
          )}{' '}
          / {formatDuration(durationS)}
        </span>
      </div>
      <div
        className="relative w-full h-2 rounded-full bg-muted/40 overflow-hidden"
        aria-label="Song coverage"
      >
        {segments.map((seg) => {
          const left = (Math.max(0, seg.startS) / durationS) * 100
          const width = ((seg.endS - seg.startS) / durationS) * 100
          const isExported = !!seg.lastExportedAt
          return (
            <div
              key={seg.id}
              className={
                isExported
                  ? 'absolute top-0 bottom-0 bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                  : 'absolute top-0 bottom-0 bg-cyan-400/60'
              }
              style={{ left: `${left}%`, width: `${Math.max(0.5, width)}%` }}
              title={`${seg.label || seg.id}: ${formatDuration(seg.startS)}–${formatDuration(seg.endS)}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function formatDuration(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
