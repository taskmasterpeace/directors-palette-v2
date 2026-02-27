'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Plus, Trash2, Copy, X, Scissors, Check } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import type { IdeaTag } from '../../types/writing-studio.types'
import { IDEA_TAGS } from '../../types/writing-studio.types'

export function IdeaBankDrawer() {
  const { getIdeaBank, ideaBankOpen, toggleIdeaBank, addToIdeaBank, removeFromIdeaBank } =
    useWritingStudioStore()
  const ideaBank = getIdeaBank()
  const [newIdea, setNewIdea] = useState('')
  const [filterTag, setFilterTag] = useState<IdeaTag | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredIdeas = filterTag
    ? ideaBank.filter((e) => e.tags.includes(filterTag))
    : ideaBank

  const handleAddIdea = () => {
    if (!newIdea.trim()) return
    addToIdeaBank(newIdea.trim(), [], 'manual')
    setNewIdea('')
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  // Always show as expanded panel in sidebar (not collapsible)
  return (
    <div className="border-t border-border/50 pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          Idea Bank
          {ideaBank.length > 0 && (
            <span className="text-[10px] text-muted-foreground">({ideaBank.length})</span>
          )}
        </h3>
        {ideaBankOpen && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={toggleIdeaBank}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Guidance text */}
      {ideaBank.length === 0 && !ideaBankOpen && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Save lines and ideas for later. <strong>Chop</strong> a draft to save good lines here,
            or type your own. <strong>Copy</strong> ideas to paste into edits.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleIdeaBank}
            className="w-full justify-center text-xs gap-1.5 h-7"
          >
            <Plus className="w-3 h-3" />
            Add First Idea
          </Button>
        </div>
      )}

      {/* Collapsed view with count */}
      {ideaBank.length > 0 && !ideaBankOpen && (
        <div className="space-y-1.5">
          {/* Preview: show latest 2 ideas */}
          {ideaBank.slice(0, 2).map((idea) => (
            <div
              key={idea.id}
              className="group flex items-start gap-2 p-1.5 rounded bg-muted/30 hover:bg-muted/50 cursor-pointer"
              onClick={() => handleCopy(idea.id, idea.text)}
            >
              <p className="text-[10px] flex-1 min-w-0 break-words line-clamp-1 text-muted-foreground">{idea.text}</p>
              {idea.source === 'chopped' && (
                <Scissors className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleIdeaBank}
            className="w-full justify-center text-xs gap-1.5 h-7 text-muted-foreground"
          >
            {ideaBank.length > 2 ? `Show all ${ideaBank.length} ideas` : 'Expand Idea Bank'}
          </Button>
        </div>
      )}

      {/* Expanded view */}
      {ideaBankOpen && (
        <>
          {/* Add idea */}
          <div className="flex gap-1.5">
            <Input
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              placeholder="Save a line or idea..."
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleAddIdea()}
            />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleAddIdea}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Tag filter */}
          {ideaBank.length > 0 && (
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
          )}

          {/* Ideas list */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filteredIdeas.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-3">
                {ideaBank.length === 0
                  ? 'Chop a draft to save good lines, or type your own ideas'
                  : 'No ideas match this filter'}
              </p>
            )}
            {filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                className="group flex items-start gap-2 p-1.5 rounded bg-muted/30 hover:bg-muted/50"
              >
                <p className="text-xs flex-1 min-w-0 break-words">{idea.text}</p>
                <div className="flex items-center gap-0.5 shrink-0">
                  {idea.source === 'chopped' && (
                    <Scissors className="w-3 h-3 text-amber-400 opacity-50" />
                  )}
                  {idea.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                  <button
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-background/50"
                    onClick={() => handleCopy(idea.id, idea.text)}
                    title="Copy to clipboard"
                  >
                    {copiedId === idea.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-destructive"
                    onClick={() => removeFromIdeaBank(idea.id)}
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
