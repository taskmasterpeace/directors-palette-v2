'use client'

import { useState, useMemo } from 'react'
import { Search, X, Piano } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { INSTRUMENT_TAGS, INSTRUMENT_CATEGORIES } from '@/features/music-lab/data/instrument-tags.data'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'

export function InstrumentPalette() {
  const { settings, updateSetting } = useSoundStudioStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const selectedInstruments = settings.instruments

  const filteredTags = useMemo(() => {
    let tags = INSTRUMENT_TAGS
    if (activeCategory) {
      tags = tags.filter((t) => t.category === activeCategory)
    }
    if (search) {
      const lower = search.toLowerCase()
      tags = tags.filter((t) => t.label.toLowerCase().includes(lower))
    }
    return tags
  }, [search, activeCategory])

  const toggleInstrument = (label: string) => {
    if (selectedInstruments.includes(label)) {
      updateSetting('instruments', selectedInstruments.filter((i) => i !== label))
    } else {
      updateSetting('instruments', [...selectedInstruments, label])
    }
  }

  const removeInstrument = (label: string) => {
    updateSetting('instruments', selectedInstruments.filter((i) => i !== label))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Piano className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Instruments
        </h3>
        {selectedInstruments.length > 0 && (
          <span className="text-xs text-[oklch(0.50_0.04_55)] ml-auto">
            {selectedInstruments.length} selected
          </span>
        )}
      </div>

      {/* Selected instruments as amber pills */}
      {selectedInstruments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedInstruments.map((inst) => (
            <span
              key={inst}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30"
            >
              {inst}
              <button
                onClick={() => removeInstrument(inst)}
                className="p-0.5 rounded-full hover:bg-amber-500/30 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.45_0.03_55)]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search instruments..."
          className="pl-9 bg-[oklch(0.22_0.025_55)] border-[oklch(0.32_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.45_0.03_55)] rounded-[0.625rem]"
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            activeCategory === null
              ? 'bg-amber-500 text-[oklch(0.15_0.02_55)]'
              : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.60_0.04_55)] hover:bg-[oklch(0.28_0.03_55)]'
          }`}
        >
          All
        </button>
        {INSTRUMENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-amber-500 text-[oklch(0.15_0.02_55)]'
                : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.60_0.04_55)] hover:bg-[oklch(0.28_0.03_55)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Instrument grid */}
      <div className="flex flex-wrap gap-1.5">
        {filteredTags.map((tag) => {
          const isSelected = selectedInstruments.includes(tag.label)
          return (
            <button
              key={tag.id}
              onClick={() => toggleInstrument(tag.label)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_oklch(0.6_0.2_55/0.15)]'
                  : 'bg-[oklch(0.22_0.025_55)] text-[oklch(0.70_0.03_55)] border border-[oklch(0.30_0.03_55)] hover:border-[oklch(0.40_0.03_55)] hover:text-[oklch(0.82_0.02_55)]'
              }`}
            >
              {tag.label}
            </button>
          )
        })}

        {filteredTags.length === 0 && (
          <p className="text-xs text-[oklch(0.45_0.03_55)] py-2">No instruments match your search.</p>
        )}
      </div>
    </div>
  )
}
