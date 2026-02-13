'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PromptCategory } from '../../../store/prompt-library-store'

interface AddPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: PromptCategory[]
  onAdd: (prompt: { title: string; prompt: string; categoryId: string; tags: string; isQuickAccess: boolean }) => void
  initialPrompt?: string
}

export function AddPromptDialog({ open, onOpenChange, categories, onAdd, initialPrompt = '' }: AddPromptDialogProps) {
  const [formData, setFormData] = useState({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })

  // Pre-fill prompt when dialog opens with initialPrompt
  useEffect(() => {
    if (open && initialPrompt) {
      // Generate a title from the first few words of the prompt
      const words = initialPrompt.trim().split(/\s+/).slice(0, 4).join(' ')
      const autoTitle = words.length > 20 ? words.slice(0, 20) + '...' : words
      setFormData(prev => ({
        ...prev,
        prompt: initialPrompt,
        title: autoTitle
      }))
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })
    }
  }, [open, initialPrompt])

  const handleSubmit = () => {
    if (!formData.title || !formData.prompt) return
    onAdd(formData)
    setFormData({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-white" aria-describedby="add-prompt-description">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription id="add-prompt-description" className="text-gray-400">Create a new prompt and add it to your library</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-card border-border" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <textarea id="prompt" value={formData.prompt} onChange={(e) => setFormData({ ...formData, prompt: e.target.value })} className="min-h-[100px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
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
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g., hero, dramatic, closeup" className="bg-card border-border" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="quickAccess" checked={formData.isQuickAccess} onCheckedChange={(checked) => setFormData({ ...formData, isQuickAccess: checked as boolean })} className="border-border" />
            <Label htmlFor="quickAccess">Add to Quick Access</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Add Prompt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
