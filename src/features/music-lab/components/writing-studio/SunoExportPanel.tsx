'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, Music } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { buildSunoStylePrompt, buildSunoExcludePrompt } from '../../utils/suno-style-prompt-builder'
import { formatLyricsForSuno } from '../../utils/suno-lyrics-formatter'
import { ALL_DELIVERY_TAGS } from '../../utils/suno-delivery-inference'
import { Sparkles } from 'lucide-react'
import { useGenerateMusic } from '../../hooks/useGenerateMusic'
import { GenerationDrawer } from '../generation/GenerationDrawer'
import type { SongSection } from '../../types/writing-studio.types'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-zinc-400 hover:text-cyan-400"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function charCountClass(len: number): string {
  if (len >= 1000) return 'text-red-400'
  if (len >= 900) return 'text-yellow-400'
  return 'text-zinc-500'
}

const VOICE_OPTIONS: { value: SongSection['voice']; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'feature', label: 'Feature' },
  { value: 'both', label: 'Both' },
  { value: 'adlib', label: 'Ad-lib' },
]

export function SunoExportPanel() {
  const [expanded, setExpanded] = useState(false)

  const sections = useWritingStudioStore((s) => s.sections)
  const featureArtist = useWritingStudioStore((s) => s.featureArtist)
  const setSectionDeliveryTag = useWritingStudioStore((s) => s.setSectionDeliveryTag)
  const setSectionVoice = useWritingStudioStore((s) => s.setSectionVoice)

  const artistDna = useArtistDnaStore((s) => s.draft)

  const activeVoice = useMemo(
    () => artistDna.voices?.find((v) => v.isDefault) || null,
    [artistDna.voices]
  )

  const artistName = artistDna.identity?.stageName || artistDna.identity?.realName || 'Artist'

  // Auto-generated values
  const stylePrompt = useMemo(() => {
    const activeSection = sections.find((s) => s.id === useWritingStudioStore.getState().activeSectionId)
    return buildSunoStylePrompt(artistDna, activeVoice, {
      emotion: activeSection?.tone.emotion,
    })
  }, [artistDna, activeVoice, sections])

  const excludePrompt = useMemo(() => buildSunoExcludePrompt(artistDna), [artistDna])

  const formattedLyrics = useMemo(
    () =>
      formatLyricsForSuno(sections, {
        artistName,
        featureArtist,
        sound: artistDna.sound,
      }),
    [sections, artistName, featureArtist, artistDna.sound]
  )

  // Editable overrides
  const [styleOverride, setStyleOverride] = useState<string | null>(null)
  const [excludeOverride, setExcludeOverride] = useState<string | null>(null)
  const [lyricsOverride, setLyricsOverride] = useState<string | null>(null)

  const styleText = styleOverride ?? stylePrompt
  const excludeText = excludeOverride ?? excludePrompt
  const lyricsText = lyricsOverride ?? formattedLyrics

  const { generate, isGenerating } = useGenerateMusic()
  const activeArtist = useArtistDnaStore((s) => s.activeArtist)

  const handleGenerate = useCallback(() => {
    if (!activeArtist) return

    generate({
      mode: 'song',
      artistId: activeArtist,
      title: artistDna.identity?.stageName ? `${artistDna.identity.stageName} Song` : 'Song',
      stylePrompt: styleText,
      lyricsPrompt: lyricsText,
      excludePrompt: excludeText,
    })
  }, [activeArtist, artistDna.identity?.stageName, styleText, lyricsText, excludeText, generate])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const handleCopyAll = useCallback(() => {
    const combined = [
      '=== Style of Music ===',
      styleText,
      '',
      '=== Exclude ===',
      excludeText,
      '',
      '=== Lyrics ===',
      lyricsText,
    ].join('\n')
    navigator.clipboard.writeText(combined)
  }, [styleText, excludeText, lyricsText])

  const [copiedAll, setCopiedAll] = useState(false)
  const onCopyAll = () => {
    handleCopyAll()
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  // Section type badge colors
  const badgeColor = (type: string) => {
    const map: Record<string, string> = {
      verse: 'bg-blue-500/20 text-blue-300',
      chorus: 'bg-amber-500/20 text-amber-300',
      bridge: 'bg-purple-500/20 text-purple-300',
      hook: 'bg-pink-500/20 text-pink-300',
      intro: 'bg-green-500/20 text-green-300',
      outro: 'bg-green-500/20 text-green-300',
      'pre-chorus': 'bg-orange-500/20 text-orange-300',
      'post-chorus': 'bg-orange-500/20 text-orange-300',
      interlude: 'bg-zinc-500/20 text-zinc-300',
      instrumental: 'bg-zinc-500/20 text-zinc-300',
      adlib: 'bg-cyan-500/20 text-cyan-300',
      spoken: 'bg-rose-500/20 text-rose-300',
      refrain: 'bg-amber-500/20 text-amber-300',
    }
    return map[type] || 'bg-zinc-500/20 text-zinc-300'
  }

  return (
    <div className="border border-zinc-700/60 rounded-[0.625rem] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-cyan-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        )}
        <Music className="w-4 h-4 text-cyan-400" />
        Suno Export
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-zinc-700/40">
          {/* 1. Style of Music */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-400">Style of Music</label>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${charCountClass(styleText.length)}`}>
                  {styleText.length}/1000
                </span>
                <CopyButton text={styleText} />
              </div>
            </div>
            <textarea
              value={styleText}
              onChange={(e) => setStyleOverride(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none"
            />
          </div>

          {/* 2. Exclude */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-400">Exclude</label>
              <CopyButton text={excludeText} />
            </div>
            <textarea
              value={excludeText}
              onChange={(e) => setExcludeOverride(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-none"
              placeholder="No exclusions configured"
            />
          </div>

          {/* 3. Formatted Lyrics */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-400">Formatted Lyrics</label>
              <CopyButton text={lyricsText} />
            </div>
            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsOverride(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 resize-y"
              placeholder="No lyrics yet — write sections above"
            />
          </div>

          {/* 4. Per-Section Delivery Tags */}
          {sections.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Per-Section Delivery Tags
              </label>
              <div className="space-y-1">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {/* Section badge */}
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${badgeColor(section.type)}`}
                    >
                      {section.type}
                    </span>

                    {/* Delivery dropdown */}
                    <select
                      value={section.deliveryTag || ''}
                      onChange={(e) =>
                        setSectionDeliveryTag(section.id, e.target.value || null)
                      }
                      className="flex-1 min-w-0 rounded border border-zinc-700/60 bg-zinc-900/60 px-1.5 py-0.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                    >
                      <option value="">Auto</option>
                      {ALL_DELIVERY_TAGS.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>

                    {/* Voice dropdown — only when feature artist present */}
                    {featureArtist && (
                      <select
                        value={section.voice}
                        onChange={(e) =>
                          setSectionVoice(
                            section.id,
                            e.target.value as SongSection['voice']
                          )
                        }
                        className="shrink-0 w-20 rounded border border-zinc-700/60 bg-zinc-900/60 px-1.5 py-0.5 text-[11px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                      >
                        {VOICE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Generate + Copy */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={!activeArtist || isGenerating || !lyricsText.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-cyan-500/20 border border-cyan-500/30 text-xs font-medium text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? 'Generating...' : 'Generate Song — 12 pts'}
            </button>
            <button
              onClick={onCopyAll}
              className="shrink-0 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-zinc-500/30 text-xs font-medium text-zinc-400 hover:bg-zinc-500/10 transition-colors"
              title="Copy all to clipboard"
            >
              {copiedAll ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Generation Drawer */}
          <GenerationDrawer onRegenerate={handleRegenerate} />
        </div>
      )}
    </div>
  )
}
