'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Zap, Copy, Check } from 'lucide-react'
import { useArtistDnaStore } from '../../store/artist-dna.store'

export function TheMixOutput() {
  const { sunoOutput, generateMix, combineVocalAndStyle, toggleCombineMode, isLoading } =
    useArtistDnaStore()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    await generateMix()
    setIsGenerating(false)
  }

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleCopy(text, field)}
      className="h-7"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-amber-500" />
            The Mix
          </span>
          <Button onClick={handleGenerate} disabled={isGenerating || isLoading}>
            {isGenerating ? 'Generating...' : 'Generate Mix'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={combineVocalAndStyle}
            onCheckedChange={toggleCombineMode}
            id="combine-toggle"
          />
          <Label htmlFor="combine-toggle" className="text-sm">
            Combine vocal + style into one prompt
          </Label>
        </div>

        {!sunoOutput ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Click &quot;Generate Mix&quot; to create Suno-compatible prompts from this artist&apos;s DNA.
          </p>
        ) : (
          <>
            {combineVocalAndStyle && sunoOutput.combinedPrompt ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Combined Prompt</Label>
                  <CopyButton text={sunoOutput.combinedPrompt} field="combined" />
                </div>
                <Textarea
                  value={sunoOutput.combinedPrompt}
                  readOnly
                  className="font-mono text-sm min-h-[60px]"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Vocal Prompt</Label>
                    <CopyButton text={sunoOutput.vocalPrompt} field="vocal" />
                  </div>
                  <Textarea
                    value={sunoOutput.vocalPrompt}
                    readOnly
                    className="font-mono text-sm min-h-[60px]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Music / Style Prompt</Label>
                    <CopyButton text={sunoOutput.musicStylePrompt} field="style" />
                  </div>
                  <Textarea
                    value={sunoOutput.musicStylePrompt}
                    readOnly
                    className="font-mono text-sm min-h-[60px]"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lyrics Template</Label>
                <CopyButton text={sunoOutput.lyricsTemplate} field="lyrics" />
              </div>
              <Textarea
                value={sunoOutput.lyricsTemplate}
                readOnly
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
