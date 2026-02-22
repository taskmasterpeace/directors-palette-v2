'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Plus, Trash2, Copy, X } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import type { IdeaTag } from '../../types/writing-studio.types'
import { IDEA_TAGS } from '../../types/writing-studio.types'

export function IdeaBankDrawer() {
  const { ideaBank, ideaBankOpen, toggleIdeaBank, addToIdeaBank, removeFromIdeaBank } =
    useWritingStudioStore()
  const [newIdea, setNewIdea] = useState('')
  const [filterTag, setFilterTag] = useState<IdeaTag | null>(null)

  const filteredIdeas = filterTag
    ? ideaBank.filter((e) => e.tags.includes(filterTag))
    : ideaBank

  const handleAddIdea = () => {
    if (!newIdea.trim()) return
    addToIdeaBank(newIdea.trim(), [], 'manual')
    setNewIdea('')
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!ideaBankOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleIdeaBank}
        className="w-full justify-start text-xs gap-2"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        Idea Bank ({ideaBank.length})
      </Button>
    )
  }

  return (
    <div className="border-t border-border/50 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Idea Bank
        </h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleIdeaBank}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Add idea */}
      <div className="flex gap-1.5">
        <Input
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          placeholder="Add an idea..."
          className="h-7 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleAddIdea}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tag filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
            !filterTag ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
          onClick={() => setFilterTag(null)}
        >
          All
        </button>
        {IDEA_TAGS.map((tag) => (
          <button
            key={tag}
            className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
              filterTag === tag ? 'bg-accent text-accent-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {filteredIdeas.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            {ideaBank.length === 0 ? 'Chop drafts or add ideas manually' : 'No ideas match this filter'}
          </p>
        )}
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className="group flex items-start gap-2 p-1.5 rounded bg-muted/30 hover:bg-muted/50"
          >
            <p className="text-xs flex-1 min-w-0 break-words">{idea.text}</p>
            <div className="flex items-center gap-0.5 shrink-0">
              {idea.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                  {tag}
                </Badge>
              ))}
              <button
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/50"
                onClick={() => handleCopy(idea.text)}
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive"
                onClick={() => removeFromIdeaBank(idea.id)}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
