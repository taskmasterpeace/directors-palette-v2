'use client'

import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ARTIST_DNA_TABS } from '../../types/artist-dna.types'
import { IdentityTab } from './tabs/IdentityTab'
import { SoundTab } from './tabs/SoundTab'
import { PersonaTab } from './tabs/PersonaTab'
import { LexiconTab } from './tabs/LexiconTab'
import { LookTab } from './tabs/LookTab'
import { CatalogTab } from './tabs/CatalogTab'
import { TheMixOutput } from './TheMixOutput'
import { StudioTab } from '../writing-studio/StudioTab'

const ConstellationWidget = dynamic(
  () => import('./ConstellationWidget').then((m) => m.ConstellationWidget),
  { ssr: false }
)

const TAB_HIGHLIGHT: Record<string, string> = {
  'the-mix': 'text-amber-500 data-[state=active]:text-amber-600',
  'studio': 'text-emerald-500 data-[state=active]:text-emerald-600',
}

export function ArtistEditor() {
  const {
    activeTab, setActiveTab, saveArtist, closeEditor,
    isDirty, draft, artists, activeArtistId, loadArtistIntoDraft, startNewArtist,
  } = useArtistDnaStore()

  const handleSave = async () => {
    await saveArtist()
  }

  const artistName = draft.identity.name || 'New Artist'
  const otherArtists = artists.filter((a) => a.id !== activeArtistId)

  return (
    <div className="space-y-2">
      {/* Header row: Back + Name + Save */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xl font-semibold hover:text-primary transition-colors">
                {artistName}
                {otherArtists.length > 0 && (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            {otherArtists.length > 0 && (
              <DropdownMenuContent align="start">
                <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium">Switch Artist</p>
                {otherArtists.map((a) => (
                  <DropdownMenuItem
                    key={a.id}
                    onClick={() => loadArtistIntoDraft(a.id)}
                    className="text-sm"
                  >
                    {a.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={startNewArtist} className="text-sm">
                  + New Artist
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>

          {isDirty && <span className="text-xs text-muted-foreground">(unsaved)</span>}
        </div>
        <Button onClick={handleSave} disabled={!isDirty}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      {/* Constellation — full width */}
      <ConstellationWidget />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          {ARTIST_DNA_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={TAB_HIGHLIGHT[tab.id] || ''}
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
        <TabsContent value="studio"><StudioTab /></TabsContent>
        <TabsContent value="the-mix"><TheMixOutput /></TabsContent>
      </Tabs>
    </div>
  )
}
