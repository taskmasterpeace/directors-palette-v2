'use client'

import { useState, useCallback } from 'react'
import { X, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  onWandClick?: () => void
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
  suggestions = [],
  onSuggestionClick,
  onSuggestionDismiss,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addTag = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) return
    if (maxTags && tags.length >= maxTags) return
    onTagsChange([...tags, trimmed])
    setInputValue('')
  }, [tags, onTagsChange, maxTags])

  const removeTag = useCallback((index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }, [tags, onTagsChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const handleSuggestionClick = (value: string) => {
    addTag(value)
    onSuggestionClick?.(value)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background">
        {tags.map((tag, i) => (
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onWandClick}
              className="h-7 w-7 p-0 shrink-0"
              aria-label="Get suggestions"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
            </Button>
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
        <p className="text-xs text-muted-foreground">{tags.length}/{maxTags}</p>
      )}
    </div>
  )
}
