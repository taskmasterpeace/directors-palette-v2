'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { ARTIST_DNA_TABS } from '../../types/artist-dna.types'
import { IdentityTab } from './tabs/IdentityTab'
import { SoundTab } from './tabs/SoundTab'
import { FlowTab } from './tabs/FlowTab'
import { PersonaTab } from './tabs/PersonaTab'
import { LexiconTab } from './tabs/LexiconTab'
import { LookTab } from './tabs/LookTab'
import { CatalogTab } from './tabs/CatalogTab'
import { TheMixOutput } from './TheMixOutput'

export function ArtistEditor() {
  const { activeTab, setActiveTab, saveArtist, closeEditor, isDirty, draft } =
    useArtistDnaStore()

  const handleSave = async () => {
    await saveArtist()
  }

  const artistName = draft.identity.name || 'New Artist'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <h2 className="text-xl font-semibold">{artistName}</h2>
          {isDirty && <span className="text-xs text-muted-foreground">(unsaved changes)</span>}
        </div>
        <Button onClick={handleSave} disabled={!isDirty}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          {ARTIST_DNA_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={tab.id === 'the-mix' ? 'text-amber-500 data-[state=active]:text-amber-600' : ''}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="identity"><IdentityTab /></TabsContent>
        <TabsContent value="sound"><SoundTab /></TabsContent>
        <TabsContent value="flow"><FlowTab /></TabsContent>
        <TabsContent value="persona"><PersonaTab /></TabsContent>
        <TabsContent value="lexicon"><LexiconTab /></TabsContent>
        <TabsContent value="look"><LookTab /></TabsContent>
        <TabsContent value="catalog"><CatalogTab /></TabsContent>
        <TabsContent value="the-mix"><TheMixOutput /></TabsContent>
      </Tabs>
    </div>
  )
}
