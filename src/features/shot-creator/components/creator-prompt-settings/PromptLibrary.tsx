'use client'

import { useState } from 'react'
import { NanoBananaPromptLoader } from './NanoBananaPromptLoader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Import to trigger module-level initialization
import '@/features/shot-creator/helpers/prompt-library-init'
import { SavedPrompt } from "../../store/prompt-library-store"
import { usePromptLibraryManager } from "../../hooks/usePromptLibraryManager"
import PromptLibraryCard from "./PromptLibraryCard"

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void
  showQuickAccess?: boolean
  className?: string
}

export function PromptLibrary({ onSelectPrompt, showQuickAccess = true, className }: PromptLibraryProps) {
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false)
  const [isEditPromptOpen, setIsEditPromptOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null)
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    prompt: '',
    categoryId: 'custom',
    tags: '',
    isQuickAccess: false
  })

  const {
    categories,
    handleAddPrompt: addPrompt,
    handleUpdatePrompt: updatePrompt,
  } = usePromptLibraryManager(onSelectPrompt)

  const handleAddPromptClick = async () => {
    const success = await addPrompt(newPrompt)
    if (success) {
      setIsAddPromptOpen(false)
      setNewPrompt({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })
    }
  }

  const handleUpdatePromptClick = async () => {
    if (!editingPrompt) return
    const success = await updatePrompt(editingPrompt)
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
      <Dialog open={isAddPromptOpen} onOpenChange={setIsAddPromptOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white" aria-describedby="add-prompt-description">
          <DialogHeader>
            <DialogTitle>Add New Prompt</DialogTitle>
            <DialogDescription id="add-prompt-description" className="text-gray-400">
              Create a new prompt and add it to your library
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="prompt">Prompt</Label>
              <textarea
                id="prompt"
                value={newPrompt.prompt}
                onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                className="min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newPrompt.categoryId}
                onValueChange={(value) => setNewPrompt({ ...newPrompt, categoryId: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id} className="text-white hover:bg-red-600/30">
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={newPrompt.tags}
                onChange={(e) => setNewPrompt({ ...newPrompt, tags: e.target.value })}
                placeholder="e.g., hero, dramatic, closeup"
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="quickAccess"
                checked={newPrompt.isQuickAccess}
                onChange={(e) => setNewPrompt({ ...newPrompt, isQuickAccess: e.target.checked })}
                className="rounded border-slate-700"
              />
              <Label htmlFor="quickAccess">Add to Quick Access</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddPromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPromptClick} className="bg-blue-600 hover:bg-blue-700">
              Add Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Prompt Dialog */}
      <Dialog open={isEditPromptOpen} onOpenChange={setIsEditPromptOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white" aria-describedby="edit-prompt-description">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription id="edit-prompt-description" className="text-gray-400">
              Update your prompt details
            </DialogDescription>
          </DialogHeader>

          {editingPrompt && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingPrompt.title}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-prompt">Prompt</Label>
                <textarea
                  id="edit-prompt"
                  value={editingPrompt.prompt}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })}
                  className="min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editingPrompt.categoryId}
                  onValueChange={(value) => setEditingPrompt({ ...editingPrompt, categoryId: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id} className="text-white hover:bg-red-600/30">
                        <span className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditPromptOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePromptClick} className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}