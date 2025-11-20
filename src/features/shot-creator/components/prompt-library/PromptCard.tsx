'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Trash2, Copy, Hash } from 'lucide-react'
import { SavedPrompt } from '../../store/prompt-library-store'

interface PromptCardProps {
  prompt: SavedPrompt
  categoryName?: string
  onToggleStar: (id: string) => void
  onDelete: (id: string) => void
  onUsePrompt: (prompt: SavedPrompt) => void
  processPromptReplacements?: (prompt: string) => string
}

export function PromptCard({ prompt, categoryName, onToggleStar, onDelete, onUsePrompt, processPromptReplacements }: PromptCardProps) {
  const showPreview = prompt.prompt.includes('@') && processPromptReplacements

  return (
    <Card className="bg-slate-950 border-slate-700 hover:border-slate-600 transition-all shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-white mb-1">{prompt.title}</h4>
            {prompt.reference && <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 mb-2">{prompt.reference}</Badge>}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {categoryName && <><span>{categoryName}</span><span>·</span></>}
              <span>{new Date(prompt.metadata.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onToggleStar(prompt.id)} className="h-8 w-8 p-0">
              <Star className={`w-4 h-4 ${prompt.isQuickAccess ? 'fill-yellow-500 text-yellow-500' : 'text-slate-400'}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(prompt.id)} className="h-8 w-8 p-0">
              <Trash2 className="w-4 h-4 text-red-400" />
            </Button>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-300 line-clamp-2">{prompt.prompt}</p>
          {showPreview && <p className="text-xs text-blue-400 mt-1 italic">Preview: {processPromptReplacements(prompt.prompt)}</p>}
        </div>

        {prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {prompt.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs bg-slate-800 text-slate-400">
                <Hash className="w-3 h-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <Button size="sm" onClick={() => onUsePrompt(prompt)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          <Copy className="w-3 h-3 mr-1" />Use Prompt
        </Button>
      </CardContent>
    </Card>
  )
}
