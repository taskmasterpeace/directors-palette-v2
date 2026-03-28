'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Music,
  Plus,
  X,
  GripHorizontal,
  Loader2,
  Zap,
  ListMusic,
} from 'lucide-react'
import type { SectionType } from '../../types/writing-studio.types'
import { EMOTIONS, DELIVERIES, ENERGY_ZONES, BAR_COUNT_RANGES } from '../../types/writing-studio.types'

// ─── Section styling ────────────────────────────────────────────────────────

const SECTION_CHIP_STYLES: Record<SectionType, { bg: string; border: string; text: string; glow: string }> = {
  intro:          { bg: 'bg-blue-500/15',    border: 'border-blue-500/40',    text: 'text-blue-400',    glow: 'shadow-blue-500/20' },
  verse:          { bg: 'bg-green-500/15',   border: 'border-green-500/40',   text: 'text-green-400',   glow: 'shadow-green-500/20' },
  'pre-chorus':   { bg: 'bg-purple-500/15',  border: 'border-purple-500/40',  text: 'text-purple-400',  glow: 'shadow-purple-500/20' },
  hook:           { bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   text: 'text-amber-400',   glow: 'shadow-amber-500/20' },
  chorus:         { bg: 'bg-yellow-500/15',  border: 'border-yellow-500/40',  text: 'text-yellow-400',  glow: 'shadow-yellow-500/20' },
  'post-chorus':  { bg: 'bg-orange-500/15',  border: 'border-orange-500/40',  text: 'text-orange-400',  glow: 'shadow-orange-500/20' },
  bridge:         { bg: 'bg-cyan-500/15',    border: 'border-cyan-500/40',    text: 'text-cyan-400',    glow: 'shadow-cyan-500/20' },
  interlude:      { bg: 'bg-indigo-500/15',  border: 'border-indigo-500/40',  text: 'text-indigo-400',  glow: 'shadow-indigo-500/20' },
  break:          { bg: 'bg-slate-500/15',   border: 'border-slate-500/40',   text: 'text-slate-400',   glow: 'shadow-slate-500/20' },
  drop:           { bg: 'bg-red-500/15',     border: 'border-red-500/40',     text: 'text-red-400',     glow: 'shadow-red-500/20' },
  build:          { bg: 'bg-teal-500/15',    border: 'border-teal-500/40',    text: 'text-teal-400',    glow: 'shadow-teal-500/20' },
  instrumental:   { bg: 'bg-violet-500/15',  border: 'border-violet-500/40',  text: 'text-violet-400',  glow: 'shadow-violet-500/20' },
  outro:          { bg: 'bg-rose-500/15',    border: 'border-rose-500/40',    text: 'text-rose-400',    glow: 'shadow-rose-500/20' },
}

const SECTION_LABELS: Record<SectionType, string> = {
  intro: 'Intro', verse: 'Verse', 'pre-chorus': 'Pre-Chorus', hook: 'Hook',
  chorus: 'Chorus', 'post-chorus': 'Post-Chorus', bridge: 'Bridge',
  interlude: 'Interlude', break: 'Break', drop: 'Drop', build: 'Build',
  instrumental: 'Instrumental', outro: 'Outro',
}

// ─── Presets ─────────────────────────────────────────────────────────────────

interface StructureEntry {
  id: string
  type: SectionType
  barCount: number
}

const PRESETS: { label: string; icon: string; sections: { type: SectionType; barCount: number }[] }[] = [
  {
    label: 'Standard',
    icon: '🎵',
    sections: [
      { type: 'intro', barCount: 4 },
      { type: 'verse', barCount: 20 },
      { type: 'hook', barCount: 8 },
      { type: 'verse', barCount: 20 },
      { type: 'hook', barCount: 8 },
      { type: 'bridge', barCount: 4 },
      { type: 'outro', barCount: 4 },
    ],
  },
  {
    label: 'Simple',
    icon: '🎤',
    sections: [
      { type: 'verse', barCount: 20 },
      { type: 'hook', barCount: 8 },
      { type: 'verse', barCount: 20 },
      { type: 'hook', barCount: 8 },
    ],
  },
  {
    label: 'Extended',
    icon: '🔥',
    sections: [
      { type: 'intro', barCount: 4 },
      { type: 'verse', barCount: 20 },
      { type: 'hook', barCount: 8 },
      { type: 'verse', barCount: 24 },
      { type: 'hook', barCount: 8 },
      { type: 'bridge', barCount: 4 },
      { type: 'hook', barCount: 8 },
      { type: 'outro', barCount: 4 },
    ],
  },
]

// ─── Sortable Chip ──────────────────────────────────────────────────────────

function SortableSectionChip({
  entry,
  onRemove,
  onBarCountChange,
  note,
  onNoteChange,
}: {
  entry: StructureEntry
  onRemove: () => void
  onBarCountChange: (count: number) => void
  note?: string
  onNoteChange?: (note: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  }

  const chip = SECTION_CHIP_STYLES[entry.type]
  const range = BAR_COUNT_RANGES[entry.type]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border
        ${chip.bg} ${chip.border} ${chip.text}
        ${isDragging ? `shadow-lg ${chip.glow}` : 'hover:shadow-md'}
        transition-shadow cursor-grab active:cursor-grabbing
        min-w-[90px]
      `}
      {...attributes}
      {...listeners}
    >
      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-muted border border-border
                   flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                   hover:bg-destructive hover:border-destructive hover:text-destructive-foreground"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <X className="w-2.5 h-2.5" />
      </button>

      {/* Drag handle + label */}
      <div className="flex items-center gap-1">
        <GripHorizontal className="w-3 h-3 opacity-40" />
        <span className="text-xs font-semibold tracking-wide uppercase">
          {SECTION_LABELS[entry.type]}
        </span>
      </div>

      {/* Bar count inline editor */}
      <div
        className="flex items-center gap-1"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onBarCountChange(Math.max(range.min, entry.barCount - 2))}
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold
                     bg-background/30 hover:bg-background/60 transition-colors"
        >
          −
        </button>
        <span className="text-[11px] font-mono w-8 text-center">{entry.barCount}b</span>
        <button
          onClick={() => onBarCountChange(Math.min(range.max, entry.barCount + 2))}
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold
                     bg-background/30 hover:bg-background/60 transition-colors"
        >
          +
        </button>
      </div>

      {/* Section note */}
      {onNoteChange && (
        <input
          type="text"
          value={note || ''}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Direction..."
          className="w-full mt-1 text-[10px] bg-background/30 border border-border/30 rounded px-1.5 py-0.5
                     placeholder:text-muted-foreground/40 focus:outline-none focus:border-amber-500/50"
          onPointerDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface FullSongBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (
    structure: { type: SectionType; barCount: number; direction?: string }[],
    tone: { emotion: string; energy: number; delivery: string }
  ) => void
  isGenerating: boolean
  concept: string
}

export function FullSongBuilder({ open, onOpenChange, onGenerate, isGenerating, concept }: FullSongBuilderProps) {
  const [structure, setStructure] = useState<StructureEntry[]>([])
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>({})
  const [emotion, setEmotion] = useState('Confident')
  const [energy, setEnergy] = useState(50)
  const [delivery, setDelivery] = useState('Raw')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setStructure(
      preset.sections.map((s) => ({
        id: crypto.randomUUID(),
        type: s.type,
        barCount: s.barCount,
      }))
    )
  }

  const addSection = (type: SectionType) => {
    const defaults = BAR_COUNT_RANGES[type]
    setStructure((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type, barCount: defaults.default },
    ])
  }

  const removeSection = (id: string) => {
    setStructure((prev) => prev.filter((s) => s.id !== id))
  }

  const updateBarCount = (id: string, count: number) => {
    setStructure((prev) =>
      prev.map((s) => (s.id === id ? { ...s, barCount: count } : s))
    )
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setStructure((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id)
      const newIndex = prev.findIndex((s) => s.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  const totalBars = structure.reduce((sum, s) => sum + s.barCount, 0)
  const energyZone = ENERGY_ZONES.find((z) => energy >= z.min && energy <= z.max)

  const handleGenerate = () => {
    if (structure.length === 0) return
    onGenerate(
      structure.map((s) => ({ type: s.type, barCount: s.barCount, direction: sectionNotes[s.id] || undefined })),
      { emotion, energy, delivery }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListMusic className="w-5 h-5 text-amber-400" />
            Write Full Song
            {concept && (
              <span className="text-xs text-muted-foreground font-normal ml-2 truncate max-w-[300px]">
                &mdash; {concept}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Presets ── */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Quick Presets</label>
            <div className="flex gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60
                             bg-muted/30 text-xs font-medium text-foreground/80
                             hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400
                             transition-all"
                >
                  <span>{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Timeline ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">
                Song Structure
                {structure.length > 0 && (
                  <span className="ml-2 text-foreground/60">
                    {structure.length} sections &middot; ~{totalBars} bars
                  </span>
                )}
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-amber-400 hover:text-amber-300">
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {(Object.keys(SECTION_LABELS) as SectionType[]).map((type) => (
                    <DropdownMenuItem key={type} onClick={() => addSection(type)}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${SECTION_CHIP_STYLES[type].bg} ${SECTION_CHIP_STYLES[type].border} border`} />
                      {SECTION_LABELS[type]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* DnD Timeline */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 min-h-[80px]">
              {structure.length === 0 ? (
                <div className="flex items-center justify-center h-16 text-xs text-muted-foreground gap-2">
                  <Music className="w-4 h-4 opacity-50" />
                  Choose a preset or add sections manually
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={structure.map((s) => s.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-2">
                      {structure.map((entry) => (
                        <SortableSectionChip
                          key={entry.id}
                          entry={entry}
                          onRemove={() => removeSection(entry.id)}
                          onBarCountChange={(count) => updateBarCount(entry.id, count)}
                          note={sectionNotes[entry.id] || ''}
                          onNoteChange={(note) => setSectionNotes(prev => ({ ...prev, [entry.id]: note }))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>

          {/* ── Global Tone ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Emotion */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Emotion</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmotion(e)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      emotion === e
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Delivery</label>
              <div className="flex flex-wrap gap-1.5">
                {DELIVERIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDelivery(d)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      delivery === d
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Energy slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Energy</label>
              <span className="text-xs text-amber-400">{energyZone?.label} ({energy})</span>
            </div>
            <Slider
              value={[energy]}
              onValueChange={([v]) => setEnergy(v)}
              min={0}
              max={100}
              step={1}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">Chill</span>
              <span className="text-[10px] text-muted-foreground">Explosive</span>
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground">
              {structure.length > 0
                ? `${structure.length} sections, ~${totalBars} bars total`
                : 'Build your song structure above'}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={structure.length === 0 || isGenerating}
              className="gap-2 bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Writing Song...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Write Full Song (10 pts)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
