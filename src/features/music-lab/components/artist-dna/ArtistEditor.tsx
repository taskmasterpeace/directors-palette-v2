'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
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

export function ArtistEditor() {
  const { activeTab, setActiveTab, suggestionCache, setSuggestions, draft } = useArtistDnaStore()

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
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="identity"><IdentityTab /></TabsContent>
        <TabsContent value="sound"><SoundTab /></TabsContent>
        <TabsContent value="persona"><PersonaTab /></TabsContent>
        <TabsContent value="lexicon"><LexiconTab /></TabsContent>
        <TabsContent value="look"><LookTab /></TabsContent>
        <TabsContent value="catalog"><CatalogTab /></TabsContent>
      </Tabs>
    </div>
  )
}
