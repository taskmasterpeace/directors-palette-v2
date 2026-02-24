'use client'

import { useState, useCallback, useMemo } from 'react'
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

function calculateContextScore(draft: { identity: { stageName: string; realName: string; ethnicity: string; city: string; backstory: string }; sound: { genres: string[]; artistInfluences: string[] }; persona: { attitude: string; traits: string[] }; look: { fashionStyle: string }; lexicon: { signaturePhrases: string[] } }) {
  const fields = [
    draft.identity.stageName || draft.identity.realName,
    draft.identity.ethnicity,
    draft.identity.city,
    draft.identity.backstory,
    draft.sound.genres.length > 0,
    draft.sound.artistInfluences.length > 0,
    draft.persona.attitude,
    draft.persona.traits.length > 0,
    draft.look.fashionStyle,
    draft.lexicon.signaturePhrases.length > 0,
  ]
  const filled = fields.filter(Boolean).length
  return { filled, total: fields.length, pct: filled / fields.length }
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
  const ctx = useMemo(() => calculateContextScore(draft), [draft])

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
      onChange(value ? `${value}\n\n${suggestion}` : suggestion)
    } else {
      onChange(suggestion)
    }
    consumeSuggestion(field, suggestion)
  }

  // Context indicator color
  const dotColor = ctx.pct >= 0.7 ? 'bg-green-400' : ctx.pct >= 0.4 ? 'bg-amber-400' : 'bg-amber-400'

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
                <span className="relative">
                  <Sparkles className={`w-4 h-4 text-amber-500 ${isLoading ? 'animate-spin' : ''}`} />
                  <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI suggestions based on your artist profile ({ctx.filled}/{ctx.total} fields filled)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center" data-testid="suggestion-chips">
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
          {suggestions.length <= 2 && suggestions.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={fetchSuggestions}
              className="text-[11px] text-amber-500 hover:text-amber-400 font-medium"
            >
              Get more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
