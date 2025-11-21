'use client'

import { useState } from 'react'
import { NanoBananaPromptLoader } from './NanoBananaPromptLoader'
// Import to trigger module-level initialization
import '@/features/shot-creator/helpers/prompt-library-init'
import { SavedPrompt } from "../../store/prompt-library-store"
import { usePromptLibraryManager } from "../../hooks/usePromptLibraryManager"
import PromptLibraryCard from "./PromptLibraryCard"
import { AddPromptDialog } from '../prompt-library/dialogs/AddPromptDialog'
import { EditPromptDialog } from '../prompt-library/dialogs/EditPromptDialog'

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void
  showQuickAccess?: boolean
  className?: string
}

export function PromptLibrary({ onSelectPrompt, showQuickAccess = true, className }: PromptLibraryProps) {
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false)
  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null)

  const {
    categories,
    handleAddPrompt: addPrompt,
    handleUpdatePrompt: updatePrompt,
  } = usePromptLibraryManager(onSelectPrompt)

  const handleAddPromptClick = async (promptData: { title: string; prompt: string; categoryId: string; tags: string; isQuickAccess: boolean }) => {
    const success = await addPrompt(promptData)
    if (success) {
      setIsAddPromptOpen(false)
    }
  }

  const handleUpdatePromptClick = async (updatedPrompt: SavedPrompt) => {
    const success = await updatePrompt(updatedPrompt)
    if (success) {
      setIsEditPromptOpen(false)
      setEditingPrompt(null)
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <NanoBananaPromptLoader />
      <PromptLibraryCard onSelectPrompt={onSelectPrompt} setIsAddPromptOpen={setIsAddPromptOpen} showQuickAccess={showQuickAccess} />

      {/* Add Prompt Dialog */}
      <AddPromptDialog
        open={isAddPromptOpen}
        onOpenChange={setIsAddPromptOpen}
        categories={categories}
        onAdd={handleAddPromptClick}
      />

      {/* Edit Prompt Dialog */}
      <EditPromptDialog
        open={isEditPromptOpen}
        onOpenChange={setIsEditPromptOpen}
        prompt={editingPrompt}
        categories={categories}
        onUpdate={handleUpdatePromptClick}
      />
    </div>
  )
}