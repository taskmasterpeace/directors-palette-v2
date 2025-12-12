import { create } from 'zustand'

export type TabValue = 'shot-creator' | 'shot-animator' | 'layout-annotation' | 'storyboard' | 'gallery' | 'wildcards'

interface LayoutStore {
  activeTab: TabValue
  setActiveTab: (tab: string) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  activeTab: 'shot-creator',
  setActiveTab: (tab) => set({ activeTab: tab as TabValue }),
}))
