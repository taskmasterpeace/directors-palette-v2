'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Trash2, Copy, Hash, Pencil } from 'lucide-react'
import { SavedPrompt } from '../../store/prompt-library-store'

interface PromptCardProps {
  prompt: SavedPrompt
  categoryName?: string
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (prompt: SavedPrompt) => void
  onUsePrompt: (prompt: SavedPrompt) => void
  processPromptReplacements?: (prompt: string) => string
}

export function PromptCard({
  prompt,
  categoryName,
  onToggleStar,
  onDelete,
  onEdit,
  onUsePrompt,
  processPromptReplacements
}: PromptCardProps) {
  const showPreview = prompt.prompt.includes('@') && processPromptReplacements

  return (
    <Card className="bg-slate-950 border-slate-700 hover:border-slate-600 transition-all shadow-md">
      <CardContent className="p-3">
        {/* Header with title and all action buttons */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white text-sm truncate">{prompt.title}</h4>
              {prompt.reference && (
                <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 shrink-0">
                  {prompt.reference}
                </Badge>
              )}
            </div>
            {categoryName && (
              <div className="text-[10px] text-slate-500">{categoryName}</div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(prompt)}
              className="h-7 w-7 p-0 hover:bg-slate-800"
              title="Edit prompt"
            >
              <Pencil className="w-3.5 h-3.5 text-blue-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggleStar(prompt.id)}
              className="h-7 w-7 p-0 hover:bg-slate-800"
              title={prompt.isQuickAccess ? "Remove from quick access" : "Add to quick access"}
            >
              <Star className={`w-3.5 h-3.5 ${prompt.isQuickAccess ? 'fill-yellow-500 text-yellow-500' : 'text-slate-400'}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUsePrompt(prompt)}
              className="h-7 w-7 p-0 hover:bg-slate-800"
              title="Use prompt"
            >
              <Copy className="w-3.5 h-3.5 text-green-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(prompt.id)}
              className="h-7 w-7 p-0 hover:bg-slate-800"
              title="Delete prompt"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </Button>
          </div>
        </div>

        {/* Prompt text */}
        <div className="mb-2">
          <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{prompt.prompt}</p>
          {showPreview && (
            <p className="text-[10px] text-blue-400 mt-1 italic line-clamp-1">
              Preview: {processPromptReplacements(prompt.prompt)}
            </p>
          )}
        </div>

        {/* Tags */}
        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {prompt.tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-slate-800 text-slate-400"
              >
                <Hash className="w-2.5 h-2.5 mr-0.5" />{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
