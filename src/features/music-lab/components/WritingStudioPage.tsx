'use client'

import { PenTool, ChevronDown, ChevronRight } from 'lucide-react'
import { ArtistContextBar } from './ArtistContextBar'
import { StudioTab } from './writing-studio/StudioTab'
import { TheMixOutput } from './artist-dna/TheMixOutput'
import { useArtistDnaStore } from '../store/artist-dna.store'
import { useWritingStudioStore } from '../store/writing-studio.store'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useState } from 'react'
import type { CatalogEntry } from '../types/artist-dna.types'

interface WritingStudioPageProps {
  userId: string
}

export function WritingStudioPage({ userId }: WritingStudioPageProps) {
  const { activeArtistId } = useArtistDnaStore()
  const { setConcept } = useWritingStudioStore()
  const [mixOpen, setMixOpen] = useState(false)

  const handleTrackSelect = (entry: CatalogEntry) => {
    setConcept(entry.title)
  }

  return (
    <div className="flex flex-col h-full">
      <ArtistContextBar
        userId={userId}
        onTrackSelect={handleTrackSelect}
      />

      {activeArtistId ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <StudioTab />

          <Collapsible open={mixOpen} onOpenChange={setMixOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors w-full py-2">
              {mixOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              The Mix — Suno Prompt Output
            </CollapsibleTrigger>
            <CollapsibleContent>
              <TheMixOutput />
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
          <PenTool className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            Select an artist above to start writing.
          </p>
        </div>
      )}
    </div>
  )
}
