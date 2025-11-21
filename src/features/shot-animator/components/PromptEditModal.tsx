'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface PromptEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (prompt: string) => void
  initialPrompt: string
  imageName: string
}

export function PromptEditModal({
  isOpen,
  onClose,
  onSave,
  initialPrompt,
  imageName
}: PromptEditModalProps) {
  const [prompt, setPrompt] = useState(initialPrompt)

  useEffect(() => {
    setPrompt(initialPrompt)
  }, [initialPrompt, isOpen])

  const handleSave = () => {
    onSave(prompt)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Edit Animation Prompt</DialogTitle>
          <DialogDescription className="text-slate-400">
            {imageName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-white">Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the animation for this shot... e.g., 'A slow cinematic pan across the scene with warm lighting'"
              className="bg-slate-800 border-slate-600 text-white min-h-[150px]"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              Tip: Be descriptive about camera movement, lighting, and mood
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-800 border-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700"
          >
            Save Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
