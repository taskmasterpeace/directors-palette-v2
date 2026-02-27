'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, Scissors, Trash2, X } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import type { DraftOption, IdeaTag } from '../../types/writing-studio.types'
import { IDEA_TAGS } from '../../types/writing-studio.types'

function DraftCard({ draft }: { draft: DraftOption }) {
  const { activeSectionId, keepDraft, addToIdeaBank, tossDraft, editDraft } =
    useWritingStudioStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(draft.content)
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const [showChopTags, setShowChopTags] = useState(false)

  const lines = useMemo(() => draft.content.split('\n').filter(l => l.trim()), [draft.content])

  const handleKeep = () => {
    if (activeSectionId) keepDraft(activeSectionId, draft)
  }

  const handleSaveEdit = () => {
    editDraft(draft.id, editText)
    setIsEditing(false)
  }

  const toggleLine = (idx: number) => {
    setSelectedLines(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleChopSelected = (tags: IdeaTag[]) => {
    const text = selectedLines.size > 0
      ? [...selectedLines].sort((a, b) => a - b).map(i => lines[i]).join('\n')
      : draft.content
    addToIdeaBank(text, tags, 'chopped')
    setSelectedLines(new Set())
    setShowChopTags(false)
    setIsEditing(false)
  }

  const openEditMode = () => {
    setEditText(draft.content)
    setSelectedLines(new Set())
    setIsEditing(true)
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-400">Option {draft.label}</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {/* Text editing area */}
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm min-h-[120px] resize-y"
          />

          {/* Line selection for Idea Bank */}
          <div className="border border-border/30 rounded-md p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground mb-1">Select lines for Idea Bank:</p>
            {lines.map((line, idx) => (
              <label key={idx} className="flex items-start gap-2 cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5">
                <Checkbox
                  checked={selectedLines.has(idx)}
                  onCheckedChange={() => toggleLine(idx)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span className="text-xs leading-snug">{line}</span>
              </label>
            ))}
          </div>

          {showChopTags ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                Tag {selectedLines.size > 0 ? `${selectedLines.size} line${selectedLines.size > 1 ? 's' : ''}` : 'all'} for Idea Bank:
              </p>
              <div className="flex flex-wrap gap-1">
                {IDEA_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleChopSelected([tag])}
                    className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowChopTags(false)}
              >
                <X className="w-3 h-3 inline" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={() => setShowChopTags(true)}
              >
                <Scissors className="w-3 h-3 mr-1" />
                {selectedLines.size > 0 ? `Chop ${selectedLines.size}` : 'Chop All'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap flex-1 min-h-[60px]">{draft.content}</p>
      )}

      {!isEditing && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={handleKeep}
          >
            <Check className="w-3 h-3 mr-1" /> Keep
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={openEditMode}
          >
            <Scissors className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => tossDraft(draft.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Toss
          </Button>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
    </div>
  )
}

export function OptionGrid() {
  const { draftOptions, isGenerating } = useWritingStudioStore()

  if (isGenerating) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    )
  }

  if (draftOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
        Click Generate to create draft options
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {draftOptions.map((draft) => (
        <DraftCard key={draft.id} draft={draft} />
      ))}
    </div>
  )
}
