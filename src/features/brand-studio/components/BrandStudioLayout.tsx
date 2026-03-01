'use client'

import { useEffect, useState } from 'react'
import {
  Palette, FolderOpen, Wand2, Megaphone, Loader2, Plus, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBrandStore, useActiveBrand } from '../hooks/useBrandStore'
import type { BrandStudioTab } from '../types'
import { NewBrandDialog } from './NewBrandDialog'
import { BrandTab } from './tabs/BrandTab'
import { LibraryTab } from './tabs/LibraryTab'
import { CreateTab } from './tabs/CreateTab'
import { CampaignsTab } from './tabs/CampaignsTab'

const TABS: { id: BrandStudioTab; label: string; icon: React.ComponentType<{ className?: string }>; accent: string }[] = [
  { id: 'brand', label: 'Brand', icon: Palette, accent: 'from-amber-500/20 to-orange-500/10' },
  { id: 'library', label: 'Library', icon: FolderOpen, accent: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'create', label: 'Create', icon: Wand2, accent: 'from-violet-500/20 to-purple-500/10' },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone, accent: 'from-rose-500/20 to-pink-500/10' },
]

export function BrandStudioLayout() {
  const { activeTab, setActiveTab, brands, activeBrandId, setActiveBrandId, loadBrands, isLoadingBrands } = useBrandStore()
  const activeBrand = useActiveBrand()
  const [newBrandOpen, setNewBrandOpen] = useState(false)

  useEffect(() => {
    loadBrands()
  }, [loadBrands])

  const currentTab = TABS.find(t => t.id === activeTab) ?? TABS[0]

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Ambient background glow that shifts with active tab */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={cn(
          'absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-30 transition-all duration-1000',
          activeTab === 'brand' && 'bg-amber-500/40',
          activeTab === 'library' && 'bg-teal-500/40',
          activeTab === 'create' && 'bg-violet-500/40',
          activeTab === 'campaigns' && 'bg-rose-500/40',
        )} />
        <div className={cn(
          'absolute -bottom-48 -right-48 w-[500px] h-[500px] rounded-full blur-[150px] opacity-20 transition-all duration-1000',
          activeTab === 'brand' && 'bg-orange-500/30',
          activeTab === 'library' && 'bg-cyan-500/30',
          activeTab === 'create' && 'bg-purple-500/30',
          activeTab === 'campaigns' && 'bg-pink-500/30',
        )} />
      </div>

      {/* Left Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border/30 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm flex flex-col relative z-10">
        {/* Brand Selector Area */}
        <div className="p-4 space-y-3">
          {/* Logo + Brand Name Header */}
          {activeBrand ? (
            <div className="flex items-center gap-3 mb-1">
              {activeBrand.logo_url ? (
                <div className="w-10 h-10 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={activeBrand.logo_url} alt="" className="w-8 h-8 object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary/70" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{activeBrand.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeBrand.industry || activeBrand.tagline || 'Brand Studio'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-transparent border border-dashed border-primary/25 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">No Brand</p>
                <p className="text-[11px] text-muted-foreground/60">Create one below</p>
              </div>
            </div>
          )}

          {/* Brand Dropdown */}
          {isLoadingBrands ? (
            <div className="h-9 bg-secondary/30 rounded-lg animate-pulse" />
          ) : (
            <Select value={activeBrandId ?? ''} onValueChange={setActiveBrandId}>
              <SelectTrigger className="h-9 bg-secondary/40 border-border/40 text-sm">
                <SelectValue placeholder="Select brand..." />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* New Brand Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 border-dashed border-primary/30 text-primary/80 hover:text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 gap-2"
            onClick={() => setNewBrandOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Brand
          </Button>
        </div>

        {/* Divider with subtle glow */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Tab Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {/* Active tab background glow */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className={cn('absolute inset-0 bg-gradient-to-r rounded-xl border border-primary/15', tab.accent)}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 relative z-10', isActive && 'text-primary')} />
                <span className="relative z-10">{tab.label}</span>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-border/20">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            <span>Brand Studio v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        {isLoadingBrands ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="text-sm text-muted-foreground">Loading brands...</span>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-8 py-6">
              {/* Page Header */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br',
                    currentTab.accent,
                  )}>
                    <currentTab.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {activeBrand ? activeBrand.name : 'Brand Studio'}
                  </h1>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  {activeTab === 'brand' && 'Brand identity and style guide'}
                  {activeTab === 'library' && 'Browse and manage brand assets'}
                  {activeTab === 'create' && 'Generate brand-aware content'}
                  {activeTab === 'campaigns' && 'Build multi-platform campaigns'}
                </p>
              </motion.div>

              {/* Tab Content with animation */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === 'brand' && <BrandTab />}
                  {activeTab === 'library' && <LibraryTab />}
                  {activeTab === 'create' && <CreateTab />}
                  {activeTab === 'campaigns' && <CampaignsTab />}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </main>

      {/* New Brand Dialog */}
      <NewBrandDialog open={newBrandOpen} onOpenChange={setNewBrandOpen} />
    </div>
  )
}
