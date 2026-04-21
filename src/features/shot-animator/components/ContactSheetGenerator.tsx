'use client'

/**
 * ContactSheetGenerator
 *
 * Generates a 3x3 contact sheet (angles or b-roll) from a Shot Animator
 * shot's start-frame, and offers to send the grid back into the animator
 * as a new shot with a prebuilt creative prompt. The whole grid is used
 * as the start frame — not individual cells — so the video model can
 * weave the 9 panels into a cinematic sequence (angles) or a B-roll
 * montage with subtle movement between frames (b-roll).
 */

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Grid3X3, Film, Send, Coins, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

export type ContactSheetMode = 'angles' | 'broll'

const MODE_CONFIG: Record<ContactSheetMode, {
  label: string
  icon: typeof Grid3X3
  endpoint: string
  description: string
  suggestedPrompt: string
  suffix: string
}> = {
  angles: {
    label: 'Angles Contact Sheet',
    icon: Grid3X3,
    endpoint: '/api/tools/cinematic-grid',
    description: '3x3 grid of the same subject from 9 cinematic camera angles.',
    // User's verbatim direction: don't force the order, be creative, weave them.
    suggestedPrompt:
      'Use this 3x3 contact sheet to tell a story — do not follow the grid order. ' +
      'Be creative and weave the 9 camera angles into one cinematic sequence with ' +
      'smooth motivated cuts and consistent character continuity.',
    suffix: 'Angles Grid',
  },
  broll: {
    label: 'B-Roll Contact Sheet',
    icon: Film,
    endpoint: '/api/tools/broll-grid',
    description: '3x3 grid of 9 complementary B-roll shots in the same visual world.',
    // User's verbatim direction: add subtle camera movement, no text overlays.
    suggestedPrompt:
      'These exact 9 frames as B-roll — add subtle camera movement and smooth ' +
      'transitions between them. Do not render any text or overlays. Piece them ' +
      'together as a montage that supports the scene.',
    suffix: 'B-Roll Grid',
  },
}

interface ContactSheetGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: ContactSheetMode
  /** Source shot's start-frame image (https: or data:). */
  sourceImageUrl: string
  /** Source shot's display name — used to label the newly-added shot. */
  sourceImageName: string
  /**
   * Called when the user hits "Send to Animator". Receives the grid's public
   * https URL, a suggested prompt, and a suggested imageName for the new shot.
   */
  onSendToAnimator: (gridImageUrl: string, suggestedPrompt: string, suggestedImageName: string) => void
}

export function ContactSheetGenerator({
  open,
  onOpenChange,
  mode,
  sourceImageUrl,
  sourceImageName,
  onSendToAnimator,
}: ContactSheetGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [gridUrl, setGridUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const cfg = MODE_CONFIG[mode]
  const Icon = cfg.icon

  // Reset when reopening or mode changes
  const resetState = () => {
    setGridUrl(null)
    setError(null)
    setIsGenerating(false)
  }

  const handleGenerate = async () => {
    setError(null)
    setIsGenerating(true)
    try {
      const res = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: sourceImageUrl }),
      })
      const data = await res.json()
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || data.message || `Generation failed (${res.status})`)
      }
      setGridUrl(data.imageUrl)
      toast({
        title: `${cfg.label} ready`,
        description: `Used ${data.creditsUsed ?? 0} pts. Send it to the animator to start a new shot.`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      logger.shotCreator.error('Contact sheet generation failed', { mode, error: msg })
      toast({
        title: 'Generation failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = () => {
    if (!gridUrl) return
    const suggestedName = `${sourceImageName.replace(/\.[^.]+$/, '')} — ${cfg.suffix}`
    onSendToAnimator(gridUrl, cfg.suggestedPrompt, suggestedName)
    onOpenChange(false)
    // Reset so next open starts fresh
    resetState()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetState()
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {cfg.label}
          </DialogTitle>
          <DialogDescription>
            {cfg.description}
            <Badge variant="outline" className="ml-2 text-xs">
              <Coins className="w-3 h-3 mr-1" />
              20 pts
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source thumbnail */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sourceImageUrl}
              alt={sourceImageName}
              className="w-20 h-20 object-cover rounded border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Source frame</p>
              <p className="text-sm font-medium truncate">{sourceImageName}</p>
            </div>
          </div>

          {/* Result / placeholder */}
          <div className="rounded-lg border bg-background aspect-[16/9] flex items-center justify-center overflow-hidden">
            {isGenerating ? (
              <div className="text-center space-y-2">
                <LoadingSpinner size="lg" className="mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Generating {cfg.label.toLowerCase()}…
                </p>
              </div>
            ) : gridUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={gridUrl}
                alt={`${cfg.label} preview`}
                className="w-full h-full object-contain"
              />
            ) : error ? (
              <div className="text-center space-y-2 px-4">
                <AlertCircle className="w-8 h-8 mx-auto text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : (
              <div className="text-center space-y-2 text-muted-foreground">
                <Icon className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm">Click Generate to create the 3x3 grid.</p>
              </div>
            )}
          </div>

          {/* Prebuilt prompt preview */}
          {gridUrl && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
              <p className="font-medium text-foreground">
                Prebuilt animator prompt (editable after sending):
              </p>
              <p className="text-muted-foreground italic">{cfg.suggestedPrompt}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!gridUrl ? (
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Icon className="w-4 h-4 mr-2" />
                    Generate (20 pts)
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
                  Regenerate
                </Button>
                <Button onClick={handleSend}>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Animator
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
