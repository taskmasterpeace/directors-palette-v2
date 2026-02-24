'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Save, Check, Loader2, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ARTIST_DNA_TABS } from '../../types/artist-dna.types'
import { IdentityTab } from './tabs/IdentityTab'
import { SoundTab } from './tabs/SoundTab'
import { PersonaTab } from './tabs/PersonaTab'
import { LexiconTab } from './tabs/LexiconTab'
import { LookTab } from './tabs/LookTab'
import { CatalogTab } from './tabs/CatalogTab'

const ConstellationWidget = dynamic(
  () => import('./ConstellationWidget').then((m) => m.ConstellationWidget),
  { ssr: false }
)

// Top fields to pre-fetch per tab
const PREFETCH_FIELDS: Record<string, { field: string; section: string }[]> = {
  identity: [
    { field: 'backstory', section: 'identity' },
    { field: 'significantEvents', section: 'identity' },
  ],
  sound: [
    { field: 'vocalTextures', section: 'sound' },
    { field: 'artistInfluences', section: 'sound' },
    { field: 'productionPreferences', section: 'sound' },
  ],
  persona: [
    { field: 'traits', section: 'persona' },
    { field: 'attitude', section: 'persona' },
  ],
  lexicon: [
    { field: 'signaturePhrases', section: 'lexicon' },
    { field: 'slang', section: 'lexicon' },
  ],
  look: [
    { field: 'skinTone', section: 'look' },
    { field: 'hairStyle', section: 'look' },
    { field: 'fashionStyle', section: 'look' },
  ],
}

// Map field path prefixes to their DNA tab
function getLowConfidenceTabCounts(fields: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const f of fields) {
    const section = f.split('.')[0] // "identity.realName" -> "identity"
    counts[section] = (counts[section] || 0) + 1
  }
  return counts
}

export function ArtistEditor() {
  const { activeTab, setActiveTab, suggestionCache, setSuggestions, draft, isDirty, saveArtist } = useArtistDnaStore()
  const lcfCounts = getLowConfidenceTabCounts(draft.lowConfidenceFields || [])
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const handleSave = useCallback(async () => {
    if (!isDirty && saveState !== 'idle') return
    setSaveState('saving')
    const success = await saveArtist()
    setSaveState(success ? 'saved' : 'idle')
    if (success) {
      setTimeout(() => setSaveState('idle'), 2000)
    }
  }, [isDirty, saveArtist, saveState])

  // Ctrl+S / Cmd+S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDirty, handleSave])

  // Reset save state when draft changes
  useEffect(() => {
    if (isDirty && saveState === 'saved') {
      setSaveState('idle')
    }
  }, [isDirty, saveState])

  // Pre-fetch suggestions on tab switch
  useEffect(() => {
    const fields = PREFETCH_FIELDS[activeTab]
    if (!fields) return

    fields.forEach(({ field, section }) => {
      // Only fetch if not already cached
      if (suggestionCache[field]?.suggestions?.length) return

      fetch('/api/artist-dna/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          section,
          currentValue: '',
          context: draft,
          exclude: [],
        }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.suggestions?.length) {
            setSuggestions(field, data.suggestions)
          }
        })
        .catch(() => {/* silent pre-fetch failure */})
    })
    // Only re-run when tab changes, not on every draft/cache change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  return (
    <div className="space-y-2">
      {/* Constellation with overlaid controls (Back, Name, Save) */}
      <ConstellationWidget />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          {ARTIST_DNA_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="relative"
            >
              {tab.label}
              {lcfCounts[tab.id] > 0 && (
                <Sparkles className="w-3 h-3 text-amber-400/60 ml-1 inline-block" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Low confidence banner for active tab */}
        {lcfCounts[activeTab] > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-500/5 border border-amber-500/20 px-3 py-2 mt-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-400/70 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-400/80">
              <span className="font-medium">AI-estimated fields:</span>{' '}
              {(draft.lowConfidenceFields || [])
                .filter(f => f.startsWith(activeTab + '.'))
                .map(f => f.split('.').slice(1).join('.'))
                .join(', ')}
              <span className="text-muted-foreground ml-1">— verify these for accuracy</span>
            </div>
          </div>
        )}

        <TabsContent value="identity"><IdentityTab /></TabsContent>
        <TabsContent value="sound"><SoundTab /></TabsContent>
        <TabsContent value="persona"><PersonaTab /></TabsContent>
        <TabsContent value="lexicon"><LexiconTab /></TabsContent>
        <TabsContent value="look"><LookTab /></TabsContent>
        <TabsContent value="catalog"><CatalogTab /></TabsContent>
      </Tabs>

      {/* Sticky save bar — always visible */}
      {isDirty && (
        <div className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-background/90 backdrop-blur-md border-t border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Unsaved changes
              <span className="hidden sm:inline text-xs ml-2 text-muted-foreground/60">
                Ctrl+S to save
              </span>
            </p>
            <button
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60 transition-colors"
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saveState === 'saved' ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Artist
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
