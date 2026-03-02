'use client'

import { Dna, PenTool, Music, MessageCircle, Headphones } from 'lucide-react'
import { useLayoutStore } from '@/store/layout.store'
import type { MusicLabSubTab } from '@/store/layout.store'
import { ArtistDnaPage } from './artist-dna/ArtistDnaPage'
import { WritingStudioPage } from './WritingStudioPage'
import { ChatPage } from './artist-chat/ChatPage'
import { SoundStudioPage } from './sound-studio/SoundStudioPage'
import MusicVideoPage from '@/app/(app)/music-lab/page'
import { cn } from '@/utils/utils'

interface MusicLabHubProps {
  userId: string
}

const SUB_TABS: { id: MusicLabSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'artist-lab', label: 'Artist Lab', icon: Dna },
  { id: 'artist-chat', label: 'Artist Chat', icon: MessageCircle },
  { id: 'writing-studio', label: 'Writing Studio', icon: PenTool },
  { id: 'sound-studio', label: 'Sound Studio', icon: Headphones },
  { id: 'music-video', label: 'Music Video', icon: Music },
]

export function MusicLabHub({ userId }: MusicLabHubProps) {
  const { musicLabSubTab, setMusicLabSubTab } = useLayoutStore()

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-noise" />
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-card/30 flex-shrink-0 relative z-10">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = musicLabSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setMusicLabSubTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-1 sm:px-2 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 min-w-0 min-h-[44px]',
                isActive
                  ? 'bg-amber-500/15 text-amber-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-hidden relative z-10">
        {musicLabSubTab === 'artist-lab' && (
          <div className="h-full p-2 sm:p-4 overflow-y-auto">
            <ArtistDnaPage userId={userId} />
          </div>
        )}
        {musicLabSubTab === 'artist-chat' && (
          <ChatPage userId={userId} />
        )}
        {musicLabSubTab === 'writing-studio' && (
          <WritingStudioPage userId={userId} />
        )}
        {musicLabSubTab === 'sound-studio' && (
          <SoundStudioPage userId={userId} />
        )}
        {musicLabSubTab === 'music-video' && (
          <div className="h-full p-2 sm:p-4 overflow-y-auto">
            <MusicVideoPage />
          </div>
        )}
      </div>
    </div>
  )
}
