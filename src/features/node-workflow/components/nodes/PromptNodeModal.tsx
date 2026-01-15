'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PromptNodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (template: string) => void
  currentTemplate?: string
}

export function PromptNodeModal({
  isOpen,
  onClose,
  onSave,
  currentTemplate = ''
}: PromptNodeModalProps) {
  const [template, setTemplate] = useState(currentTemplate)

  // Sync with prop changes
  useEffect(() => {
    setTemplate(currentTemplate)
  }, [currentTemplate])

  const handleSave = () => {
    onSave(template)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Prompt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">
              Prompt Template
            </label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Enter your prompt text..."
              className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              onClick={onClose}
              variant="outline"
              className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Save Prompt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
