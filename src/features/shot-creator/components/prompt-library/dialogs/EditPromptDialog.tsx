'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SavedPrompt, PromptCategory } from '../../../store/prompt-library-store'

interface EditPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: SavedPrompt | null
  categories: PromptCategory[]
  onUpdate: (prompt: SavedPrompt) => void
}

export function EditPromptDialog({ open, onOpenChange, prompt, categories, onUpdate }: EditPromptDialogProps) {
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null)

  useEffect(() => {
    if (prompt) setEditingPrompt(prompt)
  }, [prompt])

  const handleSubmit = () => {
    if (!editingPrompt) return
    onUpdate(editingPrompt)
    setEditingPrompt(null)
  }

  if (!editingPrompt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-white" aria-describedby="edit-prompt-description">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription id="edit-prompt-description" className="text-gray-400">Update your prompt details</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={editingPrompt.title} onChange={(e) => setEditingPrompt({ ...editingPrompt, title: e.target.value })} className="bg-card border-border" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-prompt">Prompt</Label>
            <textarea id="edit-prompt" value={editingPrompt.prompt} onChange={(e) => setEditingPrompt({ ...editingPrompt, prompt: e.target.value })} className="min-h-[100px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-category">Category</Label>
            <Select value={editingPrompt.categoryId} onValueChange={(value) => setEditingPrompt({ ...editingPrompt, categoryId: value })}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id} className="text-white hover:bg-primary/30">
                    <span className="flex items-center gap-2"><span>{category.icon}</span><span>{category.name}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
