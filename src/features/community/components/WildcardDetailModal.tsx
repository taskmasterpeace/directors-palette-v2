'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Hash } from 'lucide-react'
import type { CommunityItem, WildcardContent } from '../types/community.types'

interface WildcardDetailModalProps {
  item: CommunityItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: () => void
  isInLibrary: boolean
}

export function WildcardDetailModal({ item, open, onOpenChange, onAdd, isInLibrary }: WildcardDetailModalProps) {
  if (!item || item.type !== 'wildcard') return null

  const content = item.content as WildcardContent
  const entries = content.entries || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-white max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-amber-400" />
            {item.name}
          </DialogTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Badge>
          {item.submittedByName && (
            <span className="text-xs text-muted-foreground">by {item.submittedByName}</span>
          )}
        </div>

        {/* Scrollable entries list */}
        <div className="flex-1 overflow-y-auto border border-border rounded-md bg-background/50 p-3 space-y-1 min-h-0">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 text-sm py-0.5">
              <span className="text-muted-foreground text-xs w-6 text-right shrink-0 pt-0.5">{i + 1}</span>
              <span className="text-foreground break-words">{entry}</span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No entries</p>
          )}
        </div>

        {/* Add button */}
        <div className="pt-2">
          <Button
            onClick={() => {
              onAdd()
              onOpenChange(false)
            }}
            disabled={isInLibrary}
            className="w-full"
            variant={isInLibrary ? 'secondary' : 'default'}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isInLibrary ? 'Already in My Wildcards' : 'Add to My Wildcards'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
