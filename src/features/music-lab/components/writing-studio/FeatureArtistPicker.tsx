'use client'

import { useState, useRef, useEffect } from 'react'
import { Users, X, User, PenLine } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { generateVoiceDescription } from '../../utils/voice-description-generator'
import type { FeatureArtist } from '../../types/writing-studio.types'

type Tab = 'artists' | 'manual'

export function FeatureArtistPicker() {
  const featureArtist = useWritingStudioStore((s) => s.featureArtist)
  const setFeatureArtist = useWritingStudioStore((s) => s.setFeatureArtist)
  const artists = useArtistDnaStore((s) => s.artists)

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('artists')
  const [manualName, setManualName] = useState('')
  const [manualVoice, setManualVoice] = useState<'male' | 'female'>('male')
  const [manualDesc, setManualDesc] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectArtist = (artist: { id: string; name: string; dna: unknown }) => {
    const fa: FeatureArtist = {
      id: artist.id,
      name: artist.name,
      voiceType: 'male',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      voiceDescription: generateVoiceDescription(artist.dna as any),
    }
    setFeatureArtist(fa)
    setOpen(false)
  }

  const submitManual = () => {
    if (!manualName.trim()) return
    const fa: FeatureArtist = {
      id: null,
      name: manualName.trim(),
      voiceType: manualVoice,
      voiceDescription: manualDesc.trim(),
    }
    setFeatureArtist(fa)
    setManualName('')
    setManualDesc('')
    setOpen(false)
  }

  const remove = () => {
    setFeatureArtist(null)
  }

  // -- Chip when artist is set --
  if (featureArtist) {
    return (
      <div className="flex items-center gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs font-medium border border-cyan-500/25">
          <Users className="w-3 h-3" />
          ft. {featureArtist.name}
          <button
            onClick={remove}
            className="ml-0.5 p-0.5 rounded-full hover:bg-cyan-500/25 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      </div>
    )
  }

  // -- Add Feature button + dropdown --
  return (
    <div className="relative mb-2" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        Add Feature
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 rounded-[0.625rem] border border-[oklch(0.32_0.03_290)] bg-[oklch(0.2_0.02_290)] shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[oklch(0.32_0.03_290)]">
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'artists'
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('artists')}
            >
              <User className="w-3 h-3" />
              My Artists
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                tab === 'manual'
                  ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTab('manual')}
            >
              <PenLine className="w-3 h-3" />
              Manual
            </button>
          </div>

          {/* Content */}
          <div className="max-h-48 overflow-y-auto">
            {tab === 'artists' && (
              <>
                {artists.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    No artist profiles yet
                  </p>
                ) : (
                  <div className="py-1">
                    {artists.map((a) => (
                      <button
                        key={a.id}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-500/10 transition-colors flex items-center gap-2"
                        onClick={() => selectArtist(a)}
                      >
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-[10px] font-bold shrink-0">
                          {a.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{a.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'manual' && (
              <div className="p-3 space-y-2.5">
                {/* Name */}
                <input
                  type="text"
                  placeholder="Artist name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md bg-[oklch(0.16_0.02_290)] border border-[oklch(0.32_0.03_290)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                />

                {/* Voice type radio */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="voiceType"
                      checked={manualVoice === 'male'}
                      onChange={() => setManualVoice('male')}
                      className="accent-cyan-500 w-3 h-3"
                    />
                    <span className="text-muted-foreground">Male</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="voiceType"
                      checked={manualVoice === 'female'}
                      onChange={() => setManualVoice('female')}
                      className="accent-cyan-500 w-3 h-3"
                    />
                    <span className="text-muted-foreground">Female</span>
                  </label>
                </div>

                {/* Voice description */}
                <input
                  type="text"
                  placeholder="Voice description (optional)"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md bg-[oklch(0.16_0.02_290)] border border-[oklch(0.32_0.03_290)] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50"
                />

                {/* Submit */}
                <button
                  onClick={submitManual}
                  disabled={!manualName.trim()}
                  className="w-full py-1.5 rounded-md text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add Feature Artist
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
