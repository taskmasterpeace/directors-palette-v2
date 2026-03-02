'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Disc3,
  RotateCcw,
  ChevronDown,
  Plus,
  X,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'
import { useArtistDnaStore } from '@/features/music-lab/store/artist-dna.store'
import { GenrePicker } from './GenrePicker'
import { BpmSlider } from './BpmSlider'
import { EnergySlider } from './EnergySlider'
import { MoodSelector } from './MoodSelector'
import { InstrumentPalette } from './InstrumentPalette'
import { SunoPromptPreview } from './SunoPromptPreview'
import { SoundAssistant } from './SoundAssistant'
import { DrumDesignPanel } from './DrumDesignPanel'
import { GrooveFeelPanel } from './GrooveFeelPanel'
import { BassStylePanel } from './BassStylePanel'
import { SynthTexturePanel } from './SynthTexturePanel'
import { HarmonyPanel } from './HarmonyPanel'
import { SpaceFxPanel } from './SpaceFxPanel'
import { EarCandyPanel } from './EarCandyPanel'
import { StructurePanel } from './StructurePanel'
import { PRODUCTION_STYLE_TAGS } from '@/features/music-lab/data/production-tags.data'
import { MultiSelectPills } from './MultiSelectPills'

// ─── Production Tags Input ────────────────────────────────────────────────────

function ProductionTagsSection() {
  const { settings, updateSetting } = useSoundStudioStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Production Style
        </h3>
        {settings.productionTags.length > 0 && (
          <span className="text-xs text-[oklch(0.50_0.04_55)] ml-auto">{settings.productionTags.length}</span>
        )}
      </div>
      <MultiSelectPills
        items={PRODUCTION_STYLE_TAGS}
        selected={settings.productionTags}
        onChange={(v) => updateSetting('productionTags', v)}
        color="amber"
        compact
      />
    </div>
  )
}

// ─── Negative Tags Input ──────────────────────────────────────────────────────

function NegativeTagsInput() {
  const { settings, updateSetting } = useSoundStudioStore()
  const [inputValue, setInputValue] = useState('')

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || settings.negativeTags.includes(trimmed)) return
    updateSetting('negativeTags', [...settings.negativeTags, trimmed])
    setInputValue('')
  }

  const removeTag = (tag: string) => {
    updateSetting('negativeTags', settings.negativeTags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[oklch(0.50_0.04_55)]">
        Negative Tags (exclude from prompt)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {settings.negativeTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-300/80 border border-red-500/20"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="p-0.5 rounded-full hover:bg-red-500/20 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add negative tag..."
          className="flex-1 bg-[oklch(0.22_0.025_55)] border-[oklch(0.32_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.45_0.03_55)] rounded-[0.625rem] text-sm"
        />
        <Button
          onClick={() => addTag(inputValue)}
          disabled={!inputValue.trim()}
          size="sm"
          variant="outline"
          className="border-[oklch(0.32_0.03_55)] text-[oklch(0.65_0.04_55)] hover:bg-[oklch(0.25_0.03_55)] rounded-[0.625rem]"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Section Card Wrapper ────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`p-4 rounded-[0.625rem] border border-[oklch(0.28_0.03_55)] bg-[oklch(0.20_0.02_55)] ${className}`}>
      {children}
    </section>
  )
}

// ─── Main Sound Studio Page ───────────────────────────────────────────────────

interface SoundStudioPageProps {
  userId: string
}

export function SoundStudioPage({ userId }: SoundStudioPageProps) {
  const { loadFromArtist, resetToDefaults, rebuildPrompt } =
    useSoundStudioStore()
  const {
    artists,
    activeArtistId,
    isInitialized,
    initialize,
    loadArtistIntoDraft,
  } = useArtistDnaStore()

  // Initialize artist store
  useEffect(() => {
    initialize(userId)
  }, [userId, initialize])

  // Rebuild prompt on mount
  useEffect(() => {
    rebuildPrompt()
  }, [rebuildPrompt])

  const activeArtist = artists.find((a) => a.id === activeArtistId)
  const artistDna = activeArtist ? activeArtist.dna : undefined

  const handleArtistSelect = useCallback(
    (id: string) => {
      loadArtistIntoDraft(id)
      const artist = artists.find((a) => a.id === id)
      if (artist) {
        loadFromArtist(id, artist.dna)
      }
    },
    [loadArtistIntoDraft, artists, loadFromArtist],
  )

  const handleLoadFromActive = useCallback(() => {
    if (activeArtistId && activeArtist) {
      loadFromArtist(activeArtistId, activeArtist.dna)
    }
  }, [activeArtistId, activeArtist, loadFromArtist])

  return (
    <div className="flex flex-col h-full bg-[oklch(0.18_0.02_55)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[oklch(0.32_0.03_55)] bg-[oklch(0.20_0.025_55)]">
        <Disc3 className="w-5 h-5 text-amber-400" />
        <div className="flex-1">
          <h2 className="font-semibold text-[oklch(0.92_0.02_55)] tracking-[-0.025em]">
            Sound Studio
          </h2>
          <p className="text-xs text-[oklch(0.50_0.04_55)]">
            Build instrumental prompts for Suno
          </p>
        </div>

        {/* Artist dropdown */}
        {isInitialized && artists.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-[oklch(0.32_0.03_55)] text-[oklch(0.75_0.04_55)] hover:bg-[oklch(0.25_0.03_55)] rounded-[0.625rem]"
              >
                {activeArtist ? (
                  <span className="truncate max-w-[100px]">{activeArtist.name}</span>
                ) : (
                  <span className="text-[oklch(0.50_0.04_55)]">Standalone</span>
                )}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  resetToDefaults()
                }}
                className="text-[oklch(0.65_0.04_55)]"
              >
                Standalone Mode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {artists.map((a) => (
                <DropdownMenuItem
                  key={a.id}
                  onClick={() => handleArtistSelect(a.id)}
                  className={a.id === activeArtistId ? 'bg-accent' : ''}
                >
                  {a.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Reset button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={activeArtist ? handleLoadFromActive : resetToDefaults}
          className="text-[oklch(0.55_0.04_55)] hover:text-[oklch(0.75_0.04_55)] hover:bg-[oklch(0.25_0.03_55)]"
          title={activeArtist ? 'Reset to artist defaults' : 'Reset to defaults'}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Full-screen 2-column layout */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full xl:grid xl:grid-cols-[1fr_380px]">
          {/* LEFT COLUMN — scrollable controls */}
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {/* Genre */}
            <Card>
              <GenrePicker />
            </Card>

            {/* BPM + Energy row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <BpmSlider />
              </Card>
              <Card>
                <EnergySlider />
              </Card>
            </div>

            {/* Mood */}
            <Card>
              <MoodSelector />
            </Card>

            {/* Drum Design + Groove Feel row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <DrumDesignPanel />
              </Card>
              <Card>
                <GrooveFeelPanel />
              </Card>
            </div>

            {/* Bass + Synth row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <BassStylePanel />
              </Card>
              <Card>
                <SynthTexturePanel />
              </Card>
            </div>

            {/* Harmony + Space/FX row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <HarmonyPanel />
              </Card>
              <Card>
                <SpaceFxPanel />
              </Card>
            </div>

            {/* Instruments */}
            <Card>
              <InstrumentPalette />
            </Card>

            {/* Ear Candy + Structure row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <EarCandyPanel />
              </Card>
              <Card>
                <StructurePanel />
              </Card>
            </div>

            {/* Production Tags */}
            <Card>
              <ProductionTagsSection />
            </Card>

            {/* Negative Tags */}
            <Card>
              <NegativeTagsInput />
            </Card>

            {/* Below xl: prompt preview + assistant inline */}
            <div className="xl:hidden space-y-4">
              <Card>
                <SunoPromptPreview />
              </Card>
              <Card>
                <SoundAssistant artistDna={artistDna} />
              </Card>
            </div>

            {/* Bottom spacer */}
            <div className="h-4" />
          </div>

          {/* RIGHT COLUMN — sticky prompt preview + assistant */}
          <div className="hidden xl:flex xl:flex-col xl:h-full border-l border-[oklch(0.28_0.03_55)] bg-[oklch(0.19_0.02_55)]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <SunoPromptPreview />
              <SoundAssistant artistDna={artistDna} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
