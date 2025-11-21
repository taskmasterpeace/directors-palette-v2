'use client'

import { useState } from 'react'
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
}

export function AddPromptDialog({ open, onOpenChange, categories, onAdd }: AddPromptDialogProps) {
  const [formData, setFormData] = useState({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })

  const handleSubmit = () => {
    if (!formData.title || !formData.prompt) return
    onAdd(formData)
    setFormData({ title: '', prompt: '', categoryId: 'custom', tags: '', isQuickAccess: false })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white" aria-describedby="add-prompt-description">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription id="add-prompt-description" className="text-gray-400">Create a new prompt and add it to your library</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-slate-800 border-slate-700" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <textarea id="prompt" value={formData.prompt} onChange={(e) => setFormData({ ...formData, prompt: e.target.value })} className="min-h-[100px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id} className="text-white hover:bg-red-600/30">
                    <span className="flex items-center gap-2"><span>{category.icon}</span><span>{category.name}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="e.g., hero, dramatic, closeup" className="bg-slate-800 border-slate-700" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="quickAccess" checked={formData.isQuickAccess} onCheckedChange={(checked) => setFormData({ ...formData, isQuickAccess: checked as boolean })} className="border-slate-600" />
            <Label htmlFor="quickAccess">Add to Quick Access</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">Add Prompt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
