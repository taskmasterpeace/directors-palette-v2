'use client'

import { Dna, PenTool, Music } from 'lucide-react'
import { useLayoutStore } from '@/store/layout.store'
import type { MusicLabSubTab } from '@/store/layout.store'
import { ArtistDnaPage } from './artist-dna/ArtistDnaPage'
import { WritingStudioPage } from './WritingStudioPage'
import MusicVideoPage from '@/app/(app)/music-lab/page'
import { cn } from '@/utils/utils'

interface MusicLabHubProps {
  userId: string
}

const SUB_TABS: { id: MusicLabSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'artist-lab', label: 'Artist Lab', icon: Dna },
  { id: 'writing-studio', label: 'Writing Studio', icon: PenTool },
  { id: 'music-video', label: 'Music Video', icon: Music },
]

export function MusicLabHub({ userId }: MusicLabHubProps) {
  const { musicLabSubTab, setMusicLabSubTab } = useLayoutStore()

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-card/30 flex-shrink-0">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = musicLabSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setMusicLabSubTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden">
        {musicLabSubTab === 'artist-lab' && (
          <div className="h-full p-4 overflow-y-auto">
            <ArtistDnaPage userId={userId} />
          </div>
        )}
        {musicLabSubTab === 'writing-studio' && (
          <WritingStudioPage userId={userId} />
        )}
        {musicLabSubTab === 'music-video' && (
          <div className="h-full p-4 overflow-y-auto">
            <MusicVideoPage />
          </div>
        )}
      </div>
    </div>
  )
}
