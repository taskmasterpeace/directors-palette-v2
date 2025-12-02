'use client'

import { useState } from 'react'
import { usePromptLibraryManager } from '@/features/shot-creator/hooks/usePromptLibraryManager'
import { SavedPrompt } from '@/features/shot-creator/store/prompt-library-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Search, Plus } from 'lucide-react'
import { PromptAccordion } from './PromptAccordion'
import { MobilePromptCard } from './MobilePromptCard'

interface PromptLibraryMobileProps {
  onSelectPrompt?: (prompt: string) => void
  showQuickAccess?: boolean
}

export function PromptLibraryMobile({ onSelectPrompt, showQuickAccess: _showQuickAccess = true }: PromptLibraryMobileProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  const {
    categories,
    quickPrompts: _quickPrompts,
    filteredPrompts,
    searchQuery,
    setSearchQuery,
    handleSelectPrompt,
    toggleQuickAccess,
    deletePrompt,
    getPromptsByCategory
  } = usePromptLibraryManager(onSelectPrompt)

  const handleUsePrompt = (prompt: SavedPrompt) => {
    handleSelectPrompt(prompt)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Prompt Library</h2>
          <Button
            size="lg"
            onClick={() => setIsAddSheetOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white h-12 min-h-[48px] px-4"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card border-border text-white h-12 min-h-[48px]"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery ? (
          <div className="space-y-3">
            {filteredPrompts.map((prompt) => (
              <MobilePromptCard
                key={prompt.id}
                prompt={prompt}
                onToggleQuickAccess={toggleQuickAccess}
                onDelete={deletePrompt}
                onUsePrompt={handleUsePrompt}
              />
            ))}
          </div>
        ) : (
          <PromptAccordion
            categories={categories}
            getPromptsByCategory={getPromptsByCategory}
            onToggleQuickAccess={toggleQuickAccess}
            onDeletePrompt={deletePrompt}
            onUsePrompt={handleUsePrompt}
          />
        )}
      </div>

      {/* Add Prompt Sheet */}
      <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <SheetContent side="bottom" className="bg-background border-border text-white h-[90vh]">
          <SheetHeader>
            <SheetTitle className="text-white">Add New Prompt</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Create a new prompt for your library
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  )
}
