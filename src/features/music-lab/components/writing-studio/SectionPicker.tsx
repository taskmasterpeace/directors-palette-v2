'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, GripVertical, Lock, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { SectionType, SongSection } from '../../types/writing-studio.types'
import { FeatureArtistPicker } from './FeatureArtistPicker'

const VOICE_OPTIONS: { value: SongSection['voice']; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'feature', label: 'Feat' },
  { value: 'both', label: 'Both' },
  { value: 'adlib', label: 'Ad-lib' },
]

const SECTION_LABELS: Record<SectionType, string> = {
  intro: 'Intro',
  verse: 'Verse',
  'pre-chorus': 'Pre-Chorus',
  hook: 'Hook',
  chorus: 'Chorus',
  'post-chorus': 'Post-Chorus',
  bridge: 'Bridge',
  interlude: 'Interlude',
  break: 'Break',
  drop: 'Drop',
  build: 'Build',
  instrumental: 'Instrumental',
  outro: 'Outro',
}

const SECTION_COLORS: Record<SectionType, string> = {
  intro: 'bg-blue-500/20 text-blue-400',
  verse: 'bg-green-500/20 text-green-400',
  'pre-chorus': 'bg-purple-500/20 text-purple-400',
  hook: 'bg-amber-500/20 text-amber-400',
  chorus: 'bg-yellow-500/20 text-yellow-400',
  'post-chorus': 'bg-orange-500/20 text-orange-400',
  bridge: 'bg-cyan-500/20 text-cyan-400',
  interlude: 'bg-indigo-500/20 text-indigo-400',
  break: 'bg-slate-500/20 text-slate-400',
  drop: 'bg-red-500/20 text-red-400',
  build: 'bg-teal-500/20 text-teal-400',
  instrumental: 'bg-violet-500/20 text-violet-400',
  outro: 'bg-rose-500/20 text-rose-400',
}

export function SectionPicker() {
  const {
    sections,
    activeSectionId,
    addSection,
    removeSection,
    setActiveSection,
    reorderSections,
    featureArtist,
    setSectionVoice,
  } = useWritingStudioStore()
  const genome = useArtistDnaStore((s) => s.draft.catalog.genome)

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sections.length) return
    reorderSections(index, newIndex)
  }

  return (
    <div className="space-y-2">
      <FeatureArtistPicker />
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Sections</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(SECTION_LABELS) as SectionType[]).map((type) => (
              <DropdownMenuItem key={type} onClick={() => addSection(type, genome?.dominantMood)}>
                {SECTION_LABELS[type]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sections.length === 0 && (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Add sections to build your song structure
        </p>
      )}

      <div className="space-y-1">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
              activeSectionId === section.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => setActiveSection(section.id)}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${SECTION_COLORS[section.type]}`}>
              {SECTION_LABELS[section.type]}
            </Badge>
            {section.isLocked && <Lock className="w-3 h-3 text-green-500 shrink-0" />}
            {section.selectedDraft && !section.isLocked && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
            {featureArtist && (
              <div className="flex items-center gap-0.5 ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {VOICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`px-1 py-0 text-[9px] rounded transition-colors ${
                      section.voice === opt.value
                        ? 'bg-cyan-500/25 text-cyan-400 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                    onClick={() => setSectionVoice(section.id, opt.value)}
                    title={opt.label}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1" />
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                className="p-0.5 rounded hover:bg-background/50"
                onClick={(e) => { e.stopPropagation(); moveSection(index, 'up') }}
                disabled={index === 0}
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-background/50"
                onClick={(e) => { e.stopPropagation(); moveSection(index, 'down') }}
                disabled={index === sections.length - 1}
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                onClick={(e) => { e.stopPropagation(); removeSection(section.id) }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
