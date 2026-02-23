import { create } from 'zustand'

export type TabValue = 'shot-creator' | 'shot-animator' | 'layout-annotation' | 'node-workflow' | 'storyboard' | 'storybook' | 'music-lab' | 'ad-lab' | 'adhub' | 'prompt-tools' | 'gallery' | 'community' | 'help'

export type MusicLabSubTab = 'artist-lab' | 'writing-studio' | 'music-video'

interface LayoutStore {
  activeTab: TabValue
  musicLabSubTab: MusicLabSubTab
  setActiveTab: (tab: string) => void
  setMusicLabSubTab: (sub: MusicLabSubTab) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  activeTab: 'shot-creator',
  musicLabSubTab: 'artist-lab',
  setActiveTab: (tab) => set({ activeTab: tab as TabValue }),
  setMusicLabSubTab: (sub) => set({ musicLabSubTab: sub }),
}))
