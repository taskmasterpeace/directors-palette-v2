"use client"

/**
 * TemplatePreview Component
 *
 * Shows live preview of assembled prompts with sample values.
 * Displays both "with style" and "without style" variants.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Copy, Check, X, Plus, Ban } from 'lucide-react'
import type { Token, PromptTemplate } from '../types/prompt-template.types'
import { PromptBuilderService } from '../services/prompt-builder.service'
import { createLogger } from '@/lib/logger'


const log = createLogger('Templates')
interface TemplatePreviewProps {
  template: PromptTemplate | null
  tokens: Token[]
  bannedTerms: string[]
  onAddBannedTerm: (term: string) => void
  onRemoveBannedTerm: (term: string) => void
}

export function TemplatePreview({
  template,
  tokens,
  bannedTerms,
  onAddBannedTerm,
  onRemoveBannedTerm,
}: TemplatePreviewProps) {
  const [copied, setCopied] = useState(false)
  const [newBannedTerm, setNewBannedTerm] = useState('')

  // Build preview prompts
  const previews = useMemo(() => {
    if (!template) return null

    const builder = new PromptBuilderService(tokens, bannedTerms)

    // Generate sample selections from template slots
    const sampleSelections = template.slots.map(slot => {
      const token = tokens.find(t => t.id === slot.tokenId)
      if (!token) return { tokenId: slot.tokenId, value: '' }

      // Use default or first option as sample
      const sampleValue = token.defaultValue ||
        (token.options.length > 0 ? token.options[0].value : 'sample')

      return {
        tokenId: slot.tokenId,
        value: sampleValue,
      }
    })

    // Add style selections for "with style" preview
    const styleSelections = [
      ...sampleSelections,
      { tokenId: 'stylePrefix', value: 'cinematic' },
      { tokenId: 'stylePrompt', value: 'in the style of Christopher Nolan' },
      { tokenId: 'styleSuffix', value: '' },
    ]

    // Add motion selections for motion preview
    const motionSelections = [
      ...sampleSelections,
      { tokenId: 'cameraMovement', value: 'dolly-in' },
      { tokenId: 'movementIntensity', value: 'moderate' },
      { tokenId: 'subjectMotion', value: 'walking' },
    ]

    const withoutStyle = builder.buildPrompt(template, sampleSelections, false)
    const withStyle = builder.buildPrompt(template, styleSelections, true)
    const withMotion = builder.buildPrompt(template, motionSelections, false)

    return {
      withoutStyle,
      withStyle,
      withMotion,
      motionPrompt: builder.buildMotionPrompt(withMotion.base, withMotion.motion),
    }
  }, [template, tokens, bannedTerms])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      log.error('Failed to copy', { error: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleAddBannedTerm = () => {
    if (newBannedTerm.trim()) {
      onAddBannedTerm(newBannedTerm.trim())
      setNewBannedTerm('')
    }
  }

  if (!template) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 h-full">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-white text-sm">Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
              <Copy className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">Select a template to preview</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
      <CardHeader className="pb-2 border-b border-zinc-800">
        <CardTitle className="text-white text-sm font-semibold">Live Preview</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <Tabs defaultValue="without-style" className="w-full">
              <TabsList className="bg-zinc-800/80 w-full grid grid-cols-3 p-1 rounded-lg">
                <TabsTrigger
                  value="without-style"
                  className="text-xs data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-400 data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md transition-all"
                >
                  Base
                </TabsTrigger>
                <TabsTrigger
                  value="with-style"
                  className="text-xs data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-400 data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md transition-all"
                >
                  + Style
                </TabsTrigger>
                <TabsTrigger
                  value="with-motion"
                  className="text-xs data-[state=active]:bg-gradient-to-b data-[state=active]:from-amber-400 data-[state=active]:to-amber-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md transition-all"
                >
                  + Motion
                </TabsTrigger>
              </TabsList>

              {/* Without Style */}
              <TabsContent value="without-style" className="mt-3">
                {previews && (
                  <PreviewBox
                    label="Base Prompt"
                    content={previews.withoutStyle.full}
                    warnings={previews.withoutStyle.warnings}
                    onCopy={handleCopy}
                    copied={copied}
                  />
                )}
                <p className="text-xs text-zinc-500 mt-2">
                  Includes: visual look tokens (lens, depth, lighting, color, grain)
                </p>
              </TabsContent>

              {/* With Style */}
              <TabsContent value="with-style" className="mt-3">
                {previews && (
                  <>
                    <PreviewBox
                      label="Full Prompt"
                      content={previews.withStyle.full}
                      warnings={previews.withStyle.warnings}
                      onCopy={handleCopy}
                      copied={copied}
                    />
                    <div className="mt-3 space-y-2">
                      <div className="p-2 rounded bg-zinc-800/50">
                        <span className="text-xs text-zinc-500">Prefix: </span>
                        <span className="text-xs text-amber-400">
                          {previews.withStyle.style.prefix || '(none)'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-zinc-800/50">
                        <span className="text-xs text-zinc-500">Style Prompt: </span>
                        <span className="text-xs text-purple-400">
                          {previews.withStyle.style.stylePrompt || '(none)'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      Excludes: visual look tokens (handled by style)
                    </p>
                  </>
                )}
              </TabsContent>

              {/* With Motion */}
              <TabsContent value="with-motion" className="mt-3">
                {previews && (
                  <>
                    <PreviewBox
                      label="Motion Prompt"
                      content={previews.motionPrompt}
                      warnings={previews.withMotion.warnings}
                      onCopy={handleCopy}
                      copied={copied}
                    />
                    {previews.withMotion.motion && (
                      <div className="mt-3 p-2 rounded bg-zinc-800/50">
                        <span className="text-xs text-zinc-500">Camera: </span>
                        <span className="text-xs text-orange-400">
                          {previews.withMotion.motion.cameraMovement}
                        </span>
                        {previews.withMotion.motion.subjectMotion && (
                          <>
                            <span className="text-xs text-zinc-500 ml-2">Subject: </span>
                            <span className="text-xs text-orange-400">
                              {previews.withMotion.motion.subjectMotion}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                      Format: [movement]: [base prompt], [subject motion]
                    </p>
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Banned Terms */}
            <div className="pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-red-500/10">
                  <Ban className="w-3.5 h-3.5 text-red-400" />
                </div>
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Banned Terms</Label>
                <Badge variant="secondary" className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0 h-4">
                  {bannedTerms.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {bannedTerms.length === 0 ? (
                  <span className="text-xs text-zinc-600 italic">No banned terms</span>
                ) : (
                  bannedTerms.map((term) => (
                    <Badge
                      key={term}
                      variant="secondary"
                      className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs pr-1 hover:bg-red-500/25 transition-colors"
                    >
                      {term}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 ml-1 hover:bg-red-500/30 rounded-sm"
                        onClick={() => onRemoveBannedTerm(term)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newBannedTerm}
                  onChange={(e) => setNewBannedTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBannedTerm()}
                  placeholder="Add banned term..."
                  className="h-8 text-xs bg-zinc-800 border-zinc-700 focus:border-red-500/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs border-zinc-700 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  onClick={handleAddBannedTerm}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// Preview box sub-component
interface PreviewBoxProps {
  label: string
  content: string
  warnings?: string[]
  onCopy: (text: string) => void
  copied: boolean
}

function PreviewBox({ label, content, warnings, onCopy, copied }: PreviewBoxProps) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-800/80 to-zinc-800/40 border border-zinc-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50 bg-zinc-800/50">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{label}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 hover:bg-zinc-700/50"
          onClick={() => onCopy(content)}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
          )}
        </Button>
      </div>
      <div className="p-3">
        <p className="text-sm text-zinc-200 break-all leading-relaxed">
          {content || <span className="text-zinc-600 italic">No content generated</span>}
        </p>
        {warnings && warnings.length > 0 && (
          <div className="mt-3 pt-2 border-t border-zinc-700/50">
            {warnings.map((warning, i) => (
              <p key={i} className="text-xs text-yellow-500/90 flex items-center gap-1.5">
                <span className="text-yellow-500">⚠</span> {warning}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
