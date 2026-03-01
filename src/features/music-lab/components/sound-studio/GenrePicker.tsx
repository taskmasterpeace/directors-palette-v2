'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronDown, X, Music2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { GENRE_TAXONOMY, getSubgenres, getMicrogenres } from '@/features/music-lab/data/genre-taxonomy.data'
import { useSoundStudioStore } from '@/features/music-lab/store/sound-studio.store'

// ─── Searchable Dropdown ──────────────────────────────────────────────────────

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange,
  onClear,
  disabled,
}: {
  label: string
  value: string | null
  options: string[]
  placeholder: string
  onChange: (val: string) => void
  onClear: () => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter((o) => o.toLowerCase().includes(lower))
  }, [options, search])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[oklch(0.60_0.04_55)] uppercase tracking-wider">
        {label}
      </label>

      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full flex items-center justify-between px-3 py-2 rounded-[0.625rem] border text-sm transition-colors text-left
            ${disabled
              ? 'border-[oklch(0.25_0.03_55)] bg-[oklch(0.18_0.02_55)] text-[oklch(0.40_0.03_55)] cursor-not-allowed'
              : isOpen
                ? 'border-amber-500/50 bg-[oklch(0.22_0.025_55)] text-[oklch(0.88_0.02_55)]'
                : 'border-[oklch(0.32_0.03_55)] bg-[oklch(0.22_0.025_55)] text-[oklch(0.88_0.02_55)] hover:border-[oklch(0.40_0.03_55)]'
            }
          `}
        >
          <span className={value ? 'text-[oklch(0.88_0.02_55)]' : 'text-[oklch(0.45_0.03_55)]'}>
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onClear()
                }}
                className="p-0.5 rounded hover:bg-[oklch(0.30_0.03_55)] transition-colors"
              >
                <X className="w-3 h-3 text-[oklch(0.55_0.04_55)]" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-[oklch(0.50_0.04_55)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 rounded-[0.625rem] border border-[oklch(0.32_0.03_55)] bg-[oklch(0.20_0.025_55)] shadow-lg overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-[oklch(0.28_0.03_55)]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[oklch(0.45_0.03_55)]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="pl-8 h-8 text-xs bg-[oklch(0.18_0.02_55)] border-[oklch(0.28_0.03_55)] text-[oklch(0.88_0.02_55)] placeholder:text-[oklch(0.40_0.03_55)] rounded-lg"
                  autoFocus
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.length > 0 ? (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors
                      ${opt === value
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'text-[oklch(0.80_0.02_55)] hover:bg-[oklch(0.25_0.03_55)]'
                      }
                    `}
                  >
                    {opt}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-[oklch(0.45_0.03_55)]">No matches found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GenrePicker() {
  const { settings, updateSetting } = useSoundStudioStore()

  const genres = useMemo(() => GENRE_TAXONOMY.map((g) => g.name), [])
  const subgenres = useMemo(
    () => (settings.genre ? getSubgenres([settings.genre]) : []),
    [settings.genre],
  )
  const microgenres = useMemo(
    () => (settings.subgenre ? getMicrogenres([settings.subgenre]) : []),
    [settings.subgenre],
  )

  const handleGenreChange = (val: string) => {
    updateSetting('genre', val)
    updateSetting('subgenre', null)
    updateSetting('microgenre', null)
  }

  const handleSubgenreChange = (val: string) => {
    updateSetting('subgenre', val)
    updateSetting('microgenre', null)
  }

  const handleMicrogenreChange = (val: string) => {
    updateSetting('microgenre', val)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Music2 className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-[oklch(0.88_0.02_55)] tracking-[-0.025em]">
          Genre
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchableDropdown
          label="Genre"
          value={settings.genre}
          options={genres}
          placeholder="Select genre..."
          onChange={handleGenreChange}
          onClear={() => {
            updateSetting('genre', null)
            updateSetting('subgenre', null)
            updateSetting('microgenre', null)
          }}
        />

        <SearchableDropdown
          label="Subgenre"
          value={settings.subgenre}
          options={subgenres}
          placeholder="Select subgenre..."
          onChange={handleSubgenreChange}
          onClear={() => {
            updateSetting('subgenre', null)
            updateSetting('microgenre', null)
          }}
          disabled={!settings.genre}
        />

        <SearchableDropdown
          label="Microgenre"
          value={settings.microgenre}
          options={microgenres}
          placeholder="Select microgenre..."
          onChange={handleMicrogenreChange}
          onClear={() => updateSetting('microgenre', null)}
          disabled={!settings.subgenre}
        />
      </div>
    </div>
  )
}
