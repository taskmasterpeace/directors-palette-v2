'use client'

import { useState, useCallback } from 'react'
import { Star, ChevronUp, ChevronDown, ArrowLeft, Save, User, Sparkles, X, Dna } from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useArtistDnaStore } from '../../../store/artist-dna.store'
import { RING_COLORS, RING_LABELS, RING_TAB_MAP } from './constants'
import { calculateRingFill } from './utils'
import { ConstellationScene } from './ConstellationScene'

export function ConstellationWidget() {
  const [expanded, setExpanded] = useState(true)
  const {
    draft, isDirty, saveArtist, closeEditor, artists,
    activeArtistId, loadArtistIntoDraft, startNewArtist,
    seededFrom, clearSeededFrom, setActiveTab,
  } = useArtistDnaStore()

  const fills = calculateRingFill(draft)
  const fillValues = [fills.sound, fills.influences, fills.persona, fills.lexicon, fills.profile]
  const totalFill = Object.values(fills).reduce((sum, v) => sum + v, 0) / 5

  const artistName = draft.identity.stageName || draft.identity.realName || 'New Artist'
  const otherArtists = artists.filter((a) => a.id !== activeArtistId)
  const portraitUrl = draft.look.portraitUrl

  const handleSave = useCallback(async () => {
    await saveArtist()
  }, [saveArtist])

  const handleLegendClick = useCallback((ringLabel: string) => {
    const tab = RING_TAB_MAP[ringLabel]
    if (tab) setActiveTab(tab)
  }, [setActiveTab])

  // Collapsed: compact inline bar
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background/80 hover:bg-muted/50 transition-colors"
      >
        <Star className="w-3.5 h-3.5 text-amber-400" />
        {RING_LABELS.map((_, i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: RING_COLORS[i],
              opacity: fillValues[i] > 0 ? 0.4 + fillValues[i] * 0.6 : 0.15,
            }}
          />
        ))}
        <span className="text-[10px] font-medium text-amber-400 ml-1">
          {Math.round(totalFill * 100)}%
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-border/40 overflow-hidden relative">
      <div className="flex h-[208px]">
        {/* 3D Canvas */}
        <div className="flex-1 min-w-0 relative">
          <Canvas camera={{ position: [0, 1.4, 2.5], fov: 60 }}>
            <ConstellationScene />
          </Canvas>

          {/* Portrait thumbnail overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center bg-black/30">
              {portraitUrl ? (
                <img src={portraitUrl} alt="Artist portrait" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-amber-400/40" />
              )}
            </div>
          </div>

          {/* Overlay: Bottom-left — Back + Seeded badge + Artist Name */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeEditor}
              className="bg-black/50 hover:bg-black/70 text-white/90 backdrop-blur-sm h-7 px-2 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>

            {seededFrom && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-300 font-medium whitespace-nowrap">
                  from {seededFrom}
                </span>
                <button
                  onClick={clearSeededFrom}
                  className="ml-0.5 text-amber-400/60 hover:text-amber-300 transition-colors"
                  title="Dismiss"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors">
                  <span className="text-sm font-semibold text-white/90">{artistName}</span>
                  {otherArtists.length > 0 && (
                    <ChevronDown className="w-3 h-3 text-white/50" />
                  )}
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />}
                </button>
              </DropdownMenuTrigger>
              {otherArtists.length > 0 && (
                <DropdownMenuContent align="start">
                  <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Switch Artist</p>
                  {otherArtists.map((a) => (
                    <DropdownMenuItem key={a.id} onClick={() => loadArtistIntoDraft(a.id)} className="text-sm">
                      {a.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={startNewArtist} className="text-sm">+ New Artist</DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          </div>

          {/* Overlay: Top-right — Save */}
          <div className="absolute top-3 right-3 z-10">
            <Button
              onClick={handleSave}
              disabled={!isDirty}
              size="sm"
              className="bg-black/50 hover:bg-black/70 backdrop-blur-sm h-7 px-3 text-xs disabled:opacity-30"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>
          </div>

          {/* Overlay: Top-left — Collapse */}
          <button
            className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-sm rounded-md p-1 text-white/60 hover:text-white/90 transition-colors"
            onClick={() => setExpanded(false)}
            title="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive legend sidebar */}
        <div className="w-[220px] shrink-0 px-4 py-3 flex flex-col justify-between border-l border-border/20 bg-gradient-to-b from-black/60 to-background/80">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span className="text-xs font-semibold text-muted-foreground">DNA Constellation</span>
          </div>

          <div className="space-y-1.5 flex-1">
            {RING_LABELS.map((label, i) => (
              <button
                key={label}
                className="flex items-center gap-2 w-full group hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors"
                onClick={() => handleLegendClick(label)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10 group-hover:ring-white/30 transition-all"
                  style={{ backgroundColor: RING_COLORS[i] }}
                />
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground/80 flex-1 text-left transition-colors">
                  {label}
                </span>
                <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(fillValues[i] * 100, 2)}%`,
                      backgroundColor: RING_COLORS[i],
                      boxShadow: fillValues[i] > 0 ? `0 0 6px ${RING_COLORS[i]}40` : 'none',
                    }}
                  />
                </div>
                <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right font-medium">
                  {Math.round(fillValues[i] * 100)}%
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-border/30 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">Overall</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                    style={{
                      width: `${Math.max(totalFill * 100, 2)}%`,
                      boxShadow: '0 0 8px #f59e0b40',
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-amber-400 tabular-nums">
                  {Math.round(totalFill * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Genome indicator */}
          {(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).length > 0 && (
            <button
              onClick={() => setActiveTab('catalog')}
              className="border-t border-border/30 pt-2 mt-2 flex items-center gap-1.5 w-full hover:opacity-80 transition-opacity"
            >
              <Dna className="w-3 h-3 text-purple-400" />
              <span className="text-[11px] text-muted-foreground flex-1 text-left">Genome</span>
              <span className="text-[11px] tabular-nums text-purple-400 font-medium">
                {(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).filter((e) => e.analysis).length} song{(Array.isArray(draft.catalog.entries) ? draft.catalog.entries : []).filter((e) => e.analysis).length !== 1 ? 's' : ''}
              </span>
              {draft.catalog.genome && (
                <span className="text-emerald-400 text-[11px]">&#10003;</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
