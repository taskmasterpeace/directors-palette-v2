'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Lock, Sparkles } from 'lucide-react'
import {
  getGenres,
  getSubgenres,
  getMicrogenres,
  searchGenres,
  findGenreEntry,
  type GenreFlatEntry,
  type GenreLevel,
} from '../../../data/genre-taxonomy.data'

export interface GenrePickerValue {
  base?: string
  sub?: string
  micro?: string
  /** Which level the user locked onto — drives the "primary" genre sent to the model. */
  lockedLevel?: GenreLevel
  /** True when the value is a free-form custom string not in the taxonomy. */
  custom?: boolean
}

interface Props {
  value: GenrePickerValue
  onChange: (v: GenrePickerValue) => void
  requireBase?: boolean
}

const spring = { type: 'spring' as const, stiffness: 520, damping: 26, mass: 0.7 }

export function GenrePickerStandalone({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(value.base ?? null)
  const [expandedSub, setExpandedSub] = useState<string | null>(value.sub ?? null)

  const allGenres = useMemo(() => getGenres(), [])
  const subgenres = useMemo(() => (expanded ? getSubgenres([expanded]) : []), [expanded])
  const microgenres = useMemo(() => (expandedSub ? getMicrogenres([expandedSub]) : []), [expandedSub])
  const searchResults = useMemo(() => searchGenres(query, 8), [query])

  const hasSelection = !!(value.base || value.sub || value.micro)
  const trimmedQuery = query.trim()
  const exactMatch = trimmedQuery ? findGenreEntry(trimmedQuery) : undefined

  function applyEntry(entry: GenreFlatEntry) {
    const next: GenrePickerValue = {
      base: entry.base,
      sub: entry.sub,
      micro: entry.level === 'micro' ? entry.name : undefined,
      lockedLevel: entry.level,
      custom: false,
    }
    onChange(next)
    setExpanded(entry.base)
    setExpandedSub(entry.sub ?? null)
    setQuery('')
  }

  function applyCustom(raw: string) {
    const name = raw.trim()
    if (!name) return
    onChange({ base: name, lockedLevel: 'base', custom: true })
    setExpanded(null)
    setExpandedSub(null)
    setQuery('')
  }

  function toggleBase(g: string) {
    if (value.base === g && value.lockedLevel === 'base' && !value.sub && !value.micro) {
      onChange({})
      setExpanded(null)
      setExpandedSub(null)
      return
    }
    applyEntry({ name: g, level: 'base', base: g })
  }

  function toggleSub(sg: string) {
    if (value.sub === sg && value.lockedLevel === 'sub') {
      // Step back up to base-level lock
      onChange({ base: expanded ?? value.base, lockedLevel: 'base' })
      setExpandedSub(null)
      return
    }
    const baseName = expanded ?? value.base
    if (!baseName) return
    applyEntry({ name: sg, level: 'sub', base: baseName, sub: sg })
  }

  function toggleMicro(mg: string) {
    if (value.micro === mg) {
      onChange({ base: value.base, sub: value.sub, lockedLevel: 'sub' })
      return
    }
    const baseName = expanded ?? value.base
    const subName = expandedSub ?? value.sub
    if (!baseName || !subName) return
    applyEntry({ name: mg, level: 'micro', base: baseName, sub: subName })
  }

  function clearAll() {
    onChange({})
    setExpanded(null)
    setExpandedSub(null)
    setQuery('')
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any genre, subgenre, or microgenre…"
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/40 focus-visible:border-fuchsia-400/40 transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search dropdown */}
      <AnimatePresence>
        {trimmedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden"
          >
            {searchResults.length > 0 ? (
              <ul className="divide-y divide-white/5 max-h-60 overflow-y-auto">
                {searchResults.map((r) => (
                  <li key={`${r.level}-${r.name}`}>
                    <button
                      type="button"
                      onClick={() => applyEntry(r)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{r.name}</div>
                        {r.level !== 'base' && (
                          <div className="text-[11px] text-white/40 truncate">
                            {r.base}
                            {r.sub && r.level === 'micro' && ` › ${r.sub}`}
                          </div>
                        )}
                      </div>
                      <LevelBadge level={r.level} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {!exactMatch && (
              <button
                type="button"
                onClick={() => applyCustom(trimmedQuery)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-fuchsia-300 hover:bg-fuchsia-500/10 transition border-t border-white/5"
              >
                <Sparkles className="w-4 h-4" />
                Use <span className="font-semibold">&ldquo;{trimmedQuery}&rdquo;</span> as a custom genre
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current lock breadcrumb */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            key="breadcrumb"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={spring}
            className="flex items-center gap-2 flex-wrap rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2"
          >
            <Lock className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-fuchsia-300">
              Locked:
            </span>
            {value.base && (
              <LockChip
                label={value.base}
                level="base"
                primary={value.lockedLevel === 'base'}
                onClear={() => clearAll()}
              />
            )}
            {value.sub && (
              <>
                <span className="text-white/30">›</span>
                <LockChip
                  label={value.sub}
                  level="sub"
                  primary={value.lockedLevel === 'sub'}
                  onClear={() => {
                    onChange({ base: value.base, lockedLevel: 'base' })
                    setExpandedSub(null)
                  }}
                />
              </>
            )}
            {value.micro && (
              <>
                <span className="text-white/30">›</span>
                <LockChip
                  label={value.micro}
                  level="micro"
                  primary={value.lockedLevel === 'micro'}
                  onClear={() =>
                    onChange({ base: value.base, sub: value.sub, lockedLevel: 'sub' })
                  }
                />
              </>
            )}
            {value.custom && (
              <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200/80">
                custom
              </span>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-auto text-[11px] text-white/50 hover:text-white transition"
            >
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Base chips */}
      <div>
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
          Genre
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allGenres.map((g, i) => {
            const active = value.base === g
            return (
              <motion.button
                key={g}
                type="button"
                onClick={() => toggleBase(g)}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring, delay: i * 0.012 }}
                whileTap={{ scale: 0.94 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_24px_-6px_rgba(251,191,36,0.8)]'
                    : 'bg-white/[0.04] text-white/85 border-white/10 hover:border-amber-300/50 hover:bg-white/[0.08]'
                }`}
              >
                {g}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Subgenres (bounce reveal) */}
      <AnimatePresence mode="wait">
        {expanded && subgenres.length > 0 && (
          <motion.div
            key={`subs-${expanded}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
                Subgenre <span className="text-white/25 normal-case tracking-normal">· optional, lock-able on its own</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subgenres.map((sg, i) => {
                  const active = value.sub === sg
                  return (
                    <motion.button
                      key={sg}
                      type="button"
                      onClick={() => toggleSub(sg)}
                      initial={{ opacity: 0, y: 10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: i * 0.018 }}
                      whileTap={{ scale: 0.94 }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-cyan-400 text-black border-cyan-300 shadow-[0_0_20px_-6px_rgba(34,211,238,0.8)]'
                          : 'bg-white/[0.04] text-white/80 border-white/10 hover:border-cyan-300/50 hover:bg-white/[0.08]'
                      }`}
                    >
                      {sg}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Microgenres (bounce reveal) */}
      <AnimatePresence mode="wait">
        {expandedSub && microgenres.length > 0 && (
          <motion.div
            key={`micros-${expandedSub}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1">
              <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-2">
                Microgenre <span className="text-white/25 normal-case tracking-normal">· the most specific lock</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {microgenres.map((mg, i) => {
                  const active = value.micro === mg
                  return (
                    <motion.button
                      key={mg}
                      type="button"
                      onClick={() => toggleMicro(mg)}
                      initial={{ opacity: 0, y: 10, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...spring, delay: i * 0.022 }}
                      whileTap={{ scale: 0.94 }}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-fuchsia-400 text-black border-fuchsia-300 shadow-[0_0_20px_-6px_rgba(217,70,239,0.8)]'
                          : 'bg-white/[0.04] text-white/80 border-white/10 hover:border-fuchsia-300/50 hover:bg-white/[0.08]'
                      }`}
                    >
                      {mg}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LevelBadge({ level }: { level: GenreLevel }) {
  const map = {
    base: { label: 'Genre', cls: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
    sub: { label: 'Sub', cls: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30' },
    micro: { label: 'Micro', cls: 'bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30' },
  } as const
  const { label, cls } = map[level]
  return (
    <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${cls}`}>
      {label}
    </span>
  )
}

function LockChip({
  label,
  level,
  primary,
  onClear,
}: {
  label: string
  level: GenreLevel
  primary: boolean
  onClear: () => void
}) {
  const ring =
    level === 'base'
      ? 'border-amber-300/50 text-amber-100'
      : level === 'sub'
        ? 'border-cyan-300/50 text-cyan-100'
        : 'border-fuchsia-300/50 text-fuchsia-100'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-white/[0.04] px-2 py-0.5 text-[11px] ${ring} ${
        primary ? 'font-bold' : 'font-medium opacity-80'
      }`}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full hover:bg-white/15 p-0.5 transition"
        aria-label={`Remove ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
