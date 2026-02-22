'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Copy } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'

const SECTION_HEADERS: Record<string, string> = {
  intro: 'Intro',
  hook: 'Hook',
  verse: 'Verse',
  bridge: 'Bridge',
  outro: 'Outro',
}

export function LyricsPreview() {
  const { sections } = useWritingStudioStore()

  const lockedSections = sections.filter((s) => s.isLocked && s.selectedDraft)

  // Number verses/hooks sequentially
  const sectionCounts: Record<string, number> = {}
  const assembledLyrics = lockedSections.map((section) => {
    const baseLabel = SECTION_HEADERS[section.type] || section.type
    sectionCounts[section.type] = (sectionCounts[section.type] || 0) + 1
    const count = sectionCounts[section.type]
    const needsNumber = sections.filter((s) => s.type === section.type && s.isLocked).length > 1
    const label = needsNumber ? `${baseLabel} ${count}` : baseLabel

    return `[${label}]\n${section.selectedDraft!.content}`
  })

  const fullLyrics = assembledLyrics.join('\n\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLyrics)
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            Lyrics
          </span>
          {fullLyrics && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
              <Copy className="w-3 h-3" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lockedSections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Lock sections to build your lyrics
          </p>
        ) : (
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">
            {fullLyrics}
          </pre>
        )}
        {fullLyrics && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {fullLyrics.length} / 3000 chars
          </p>
        )}
      </CardContent>
    </Card>
  )
}
