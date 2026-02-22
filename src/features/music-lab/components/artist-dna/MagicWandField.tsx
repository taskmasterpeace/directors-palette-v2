'use client'

import { useState, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { X } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'

interface MagicWandFieldProps {
  field: string
  section: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
}

export function MagicWandField({
  field,
  section,
  value,
  onChange,
  placeholder,
  multiline = false,
}: MagicWandFieldProps) {
  const { suggestionCache, setSuggestions, consumeSuggestion, dismissSuggestion, draft } =
    useArtistDnaStore()
  const [isLoading, setIsLoading] = useState(false)

  const suggestions = suggestionCache[field]?.suggestions ?? []

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/artist-dna/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          section,
          currentValue: value,
          context: draft,
          exclude: [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions?.length) {
          setSuggestions(field, data.suggestions)
        }
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [field, section, value, draft, setSuggestions])

  const handleSuggestionClick = (suggestion: string) => {
    if (multiline) {
      onChange(value ? `${value}\n${suggestion}` : suggestion)
    } else {
      onChange(suggestion)
    }
    consumeSuggestion(field, suggestion)
  }

  const InputComponent = multiline ? Textarea : Input

  return (
    <div className="space-y-2">
      <div className="relative">
        <InputComponent
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={multiline ? 'pr-10 min-h-[80px]' : 'pr-10'}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchSuggestions}
                disabled={isLoading}
                className="absolute top-1 right-1 h-7 w-7 p-0"
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
                  dismissSuggestion(field, i)
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
    </div>
  )
}
