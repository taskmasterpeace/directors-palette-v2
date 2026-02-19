'use client'

import React from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAdLabStore } from '../../store/ad-lab.store'
import { BriefInput } from '../BriefInput'
import { MandateCard } from '../MandateCard'
import type { CreativeMandate } from '../../types/ad-lab.types'

const LLM_MODELS = [
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast & cheap' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Balanced' },
]

export function StrategyPhase() {
  const {
    briefText,
    selectedModel,
    setSelectedModel,
    mandate,
    setMandate,
    isParsingBrief,
    setIsParsingBrief,
    setError,
    completePhase,
    setPhase,
  } = useAdLabStore()

  const handleGenerateMandate = async () => {
    if (!briefText.trim()) {
      setError('Please enter a creative brief first.')
      return
    }

    setIsParsingBrief(true)
    setError(null)

    try {
      const response = await fetch('/api/ad-lab/parse-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefText, model: selectedModel }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to parse brief')
      }

      const result: CreativeMandate = await response.json()
      setMandate(result)
      completePhase('strategy')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse brief')
    } finally {
      setIsParsingBrief(false)
    }
  }

  const handleNext = () => {
    setPhase('execution')
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Paste your creative brief</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Provide a brand brief or paste structured JSON. The LLM will extract a creative mandate.
          </p>
        </div>
        <Select value={selectedModel} onValueChange={setSelectedModel}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {LLM_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{m.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brief Input */}
      <BriefInput />

      {/* Generate Button */}
      <Button
        onClick={handleGenerateMandate}
        disabled={isParsingBrief || !briefText.trim()}
        className="w-full"
        size="lg"
      >
        {isParsingBrief ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Parsing Brief...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Mandate
          </>
        )}
      </Button>

      {/* Mandate Card */}
      {mandate && (
        <>
          <MandateCard />
          <div className="flex justify-end">
            <Button onClick={handleNext} size="lg">
              Next: Generate Prompts
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
