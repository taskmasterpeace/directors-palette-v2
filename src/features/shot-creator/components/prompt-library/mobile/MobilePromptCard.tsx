'use client'

import { useState } from 'react'
import { SavedPrompt } from '@/features/shot-creator/store/prompt-library-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Star, Trash2, Hash } from 'lucide-react'
import { cn } from '@/utils/utils'

interface MobilePromptCardProps {
  prompt: SavedPrompt
  categoryName?: string
  onToggleQuickAccess: (id: string) => void
  onDelete: (id: string) => void
  onUsePrompt: (prompt: SavedPrompt) => void
}

export function MobilePromptCard({
  prompt,
  categoryName,
  onToggleQuickAccess,
  onDelete,
  onUsePrompt
}: MobilePromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="bg-background border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Main content - tappable area */}
        <div
          className="p-4 cursor-pointer active:bg-card transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-white truncate mb-1">{prompt.title}</h4>
              {prompt.reference && (
                <Badge variant="outline" className="text-xs border-border text-muted-foreground mb-2">
                  {prompt.reference}
                </Badge>
              )}
              {categoryName && (
                <p className="text-xs text-muted-foreground">{categoryName}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleQuickAccess(prompt.id)
                }}
                className="h-12 w-12 p-0"
              >
                <Star className={cn(
                  "w-5 h-5",
                  prompt.isQuickAccess ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
                )} />
              </Button>
            </div>
          </div>

          <p className={cn(
            "text-sm text-foreground mb-3",
            !isExpanded && "line-clamp-2"
          )}>
            {prompt.prompt}
          </p>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-border pt-4 bg-card/50">
            {Array.isArray(prompt.tags) && prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {prompt.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs bg-secondary text-foreground">
                    <Hash className="w-3 h-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={() => onUsePrompt(prompt)}
                className="flex-1 bg-primary hover:bg-primary/90 text-white h-12 min-h-[48px]"
              >
                Use Prompt
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => onDelete(prompt.id)}
                className="h-12 w-12 min-h-[48px] min-w-[48px] p-0"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
