'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, Copy } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'

export function PromptPreview() {
  const { sections, concept } = useWritingStudioStore()

  const lockedSections = sections.filter((s) => s.isLocked && s.selectedDraft)

  // Build a vocal prompt summary from tone settings
  const tonesSummary = lockedSections
    .map((s) => `${s.tone.emotion.toLowerCase()}, ${s.tone.delivery.toLowerCase()}`)
  const uniqueTones = [...new Set(tonesSummary)]

  const prompt = [
    concept && `Theme: ${concept}`,
    uniqueTones.length > 0 && `Vocal style: ${uniqueTones.join('; ')}`,
    lockedSections.length > 0 &&
      `Structure: ${lockedSections.map((s) => s.type).join(' → ')}`,
  ]
    .filter(Boolean)
    .join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt)
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Mic className="w-4 h-4" />
            Suno Prompt
          </span>
          {prompt && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!prompt ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Lock sections to preview vocal prompt
          </p>
        ) : (
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}
