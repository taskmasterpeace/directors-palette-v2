'use client'

import { useEffect, useState } from 'react'
import {
  Palette, FolderOpen, Wand2, Megaphone, Loader2
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrandStore, useActiveBrand } from '../hooks/useBrandStore'
import type { BrandStudioTab } from '../types'
import { BrandSelector } from './BrandSelector'
import { NewBrandDialog } from './NewBrandDialog'
import { BrandTab } from './tabs/BrandTab'
import { LibraryTab } from './tabs/LibraryTab'
import { CreateTab } from './tabs/CreateTab'
import { CampaignsTab } from './tabs/CampaignsTab'

const TABS: { id: BrandStudioTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'brand', label: 'Brand', icon: Palette },
  { id: 'library', label: 'Library', icon: FolderOpen },
  { id: 'create', label: 'Create', icon: Wand2 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
]

export function BrandStudioLayout() {
  const { activeTab, setActiveTab, loadBrands, isLoadingBrands } = useBrandStore()
  const activeBrand = useActiveBrand()
  const [newBrandOpen, setNewBrandOpen] = useState(false)

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/40 bg-card/50 flex flex-col">
        {/* Brand Logo + Name */}
        <div className="p-4 border-b border-border/30">
          {isLoadingBrands ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <BrandSelector onNewBrand={() => setNewBrandOpen(true)} />
          )}

          {/* Active brand logo */}
          {activeBrand?.logo_url && (
            <div className="mt-3 flex justify-center">
              <img
                src={activeBrand.logo_url}
                alt={activeBrand.name}
                className="h-12 max-w-[140px] object-contain opacity-80"
              />
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px] shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive && 'text-primary')} />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Brand info footer */}
        {activeBrand && (
          <div className="p-3 border-t border-border/30">
            <p className="text-[11px] text-muted-foreground truncate">
              {activeBrand.industry || activeBrand.tagline || activeBrand.name}
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {isLoadingBrands ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto p-6">
              {/* Page Header */}
              <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight">
                  {activeBrand ? activeBrand.name : 'Brand Studio'}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeTab === 'brand' && 'Brand identity and style guide'}
                  {activeTab === 'library' && 'Browse and manage brand assets'}
                  {activeTab === 'create' && 'Generate brand-aware content'}
                  {activeTab === 'campaigns' && 'Build multi-platform campaigns'}
                </p>
              </div>

              {/* Tab Content */}
              {activeTab === 'brand' && <BrandTab />}
              {activeTab === 'library' && <LibraryTab />}
              {activeTab === 'create' && <CreateTab />}
              {activeTab === 'campaigns' && <CampaignsTab />}
            </div>
          </ScrollArea>
        )}
      </main>

      {/* New Brand Dialog */}
      <NewBrandDialog open={newBrandOpen} onOpenChange={setNewBrandOpen} />
    </div>
  )
}
