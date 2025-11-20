'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Trash2, Copy, Hash, Pencil } from 'lucide-react'
import { SavedPrompt } from '../../store/prompt-library-store'

interface PromptCardProps {
  prompt: SavedPrompt
  categoryName?: string
  categoryIcon?: string
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (prompt: SavedPrompt) => void
  onUsePrompt: (prompt: SavedPrompt) => void
  processPromptReplacements?: (prompt: string) => string
}

export function PromptCard({
  prompt,
  categoryName,
  categoryIcon,
  onToggleStar,
  onDelete,
  onEdit,
  onUsePrompt,
  processPromptReplacements
}: PromptCardProps) {
  const showPreview = prompt.prompt.includes('@') && processPromptReplacements
  const hasTagsToShow = prompt.tags.length > 0

  return (
    <Card className="bg-slate-950 border-slate-700 hover:border-slate-600 transition-all shadow-md group">
      <CardContent className="p-2">
        {/* Line 1: Category icon + Title + Action buttons */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {categoryIcon && (
              <span className="text-base shrink-0" title={categoryName}>{categoryIcon}</span>
            )}
            <h4 className="font-medium text-white text-xs truncate">{prompt.title}</h4>
            {prompt.reference && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-slate-600 text-slate-400 shrink-0">
                {prompt.reference}
              </Badge>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(prompt)}
              className="h-6 w-6 p-0 hover:bg-slate-800"
              title="Edit prompt"
            >
              <Pencil className="w-3 h-3 text-blue-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleStar(prompt.id)}
              className="h-6 w-6 p-0 hover:bg-slate-800"
              title={prompt.isQuickAccess ? "Remove from quick access" : "Add to quick access"}
            >
              <Star className={`w-3 h-3 ${prompt.isQuickAccess ? 'fill-yellow-500 text-yellow-500' : 'text-slate-400'}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUsePrompt(prompt)}
              className="h-6 w-6 p-0 hover:bg-slate-800"
              title="Use prompt"
            >
              <Copy className="w-3 h-3 text-green-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(prompt.id)}
              className="h-6 w-6 p-0 hover:bg-slate-800"
              title="Delete prompt"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
            </Button>
          </div>
        </div>

        {/* Line 2: Prompt text (single line) */}
        <div className="mb-1">
          <p className="text-[11px] text-gray-300 line-clamp-1 leading-tight">{prompt.prompt}</p>
        </div>

        {/* Line 3: Tags (show on hover) or Preview */}
        {showPreview ? (
          <p className="text-[9px] text-blue-400 italic line-clamp-1">
            Preview: {processPromptReplacements(prompt.prompt)}
          </p>
        ) : hasTagsToShow ? (
          <div className="flex flex-wrap gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            {prompt.tags.slice(0, 3).map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[9px] px-1 py-0 h-3.5 bg-slate-800 text-slate-400"
              >
                <Hash className="w-2 h-2 mr-0.5" />{tag}
              </Badge>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-[9px] text-slate-500">+{prompt.tags.length - 3}</span>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
