'use client'

import { useState, useCallback, useMemo } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  onWandClick?: () => void
  isLoading?: boolean
  suggestions?: string[]
  onSuggestionClick?: (value: string) => void
  onSuggestionDismiss?: (index: number) => void
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Add tag...',
  maxTags,
  onWandClick,
  isLoading = false,
  suggestions = [],
  onSuggestionClick,
  onSuggestionDismiss,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const safeTags = useMemo(() => tags ?? [], [tags])

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (safeTags.includes(trimmed)) return
    if (maxTags && safeTags.length >= maxTags) return
    onTagsChange([...safeTags, trimmed])
    setInputValue('')
  }, [safeTags, onTagsChange, maxTags])

  const removeTag = useCallback((index: number) => {
    onTagsChange(safeTags.filter((_, i) => i !== index))
  }, [safeTags, onTagsChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && safeTags.length > 0) {
      removeTag(safeTags.length - 1)
    }
  }

  const handleSuggestionClick = (value: string) => {
    addTag(value)
    onSuggestionClick?.(value)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background">
        {safeTags.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 hover:text-destructive"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="flex-1 flex items-center gap-1 min-w-[120px]">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="border-0 shadow-none p-0 h-7 focus-visible:ring-0"
          />
          {onWandClick && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onWandClick}
                    disabled={isLoading}
                    className="h-7 w-7 p-0 shrink-0"
                    aria-label="Get suggestions"
                  >
                    <Sparkles className={`w-4 h-4 text-amber-500 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI suggestions based on your artist profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="suggestion-chips">
          {suggestions.slice(0, 5).map((suggestion, i) => (
            <Badge
              key={`${suggestion}-${i}`}
              variant="outline"
              className="gap-1 pr-1 cursor-pointer hover:bg-accent"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSuggestionDismiss?.(i)
                }}
                className="ml-0.5 hover:text-destructive"
                aria-label={`Dismiss ${suggestion}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {maxTags && (
        <p className="text-xs text-muted-foreground">{safeTags.length}/{maxTags}</p>
      )}
    </div>
  )
}
