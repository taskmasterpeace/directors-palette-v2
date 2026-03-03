'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Sparkles, PenTool, RotateCcw, Lightbulb, Loader2, RefreshCw } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import { SectionPicker } from './SectionPicker'
import { ToneControls } from './ToneControls'
import { OptionGrid } from './OptionGrid'
import { IdeaBankDrawer } from './IdeaBankDrawer'
import { LyricsPreview } from './LyricsPreview'
import { PromptPreview } from './PromptPreview'

export function StudioTab() {
  const {
    sections,
    activeSectionId,
    concept,
    setConcept,
    isGenerating,
    draftOptions,
    generateOptions,
    resetStudio,
    setActiveArtistId,
  } = useWritingStudioStore()

  const { draft: artistDna, activeArtistId } = useArtistDnaStore()
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [conceptSuggestions, setConceptSuggestions] = useState<string[]>([])
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false)
  const [showConcepts, setShowConcepts] = useState(false)

  // Sync active artist to writing studio for per-artist Idea Bank
  useEffect(() => {
    setActiveArtistId(activeArtistId)
  }, [activeArtistId, setActiveArtistId])

  const activeSection = sections.find((s) => s.id === activeSectionId)

  const doGenerate = () => {
    if (!activeSectionId) return
    generateOptions(activeSectionId, artistDna, sections)
  }

  const handleGenerate = () => {
    if (!activeSectionId) return
    if (draftOptions.length > 0) {
      setShowRegenerateConfirm(true)
    } else {
      doGenerate()
    }
  }

  const generateConcepts = useCallback(async () => {
    setIsLoadingConcepts(true)
    setShowConcepts(true)
    try {
      const res = await fetch('/api/artist-dna/suggest-concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistDna }),
      })
      if (res.ok) {
        const data = await res.json()
        setConceptSuggestions(data.concepts || [])
      }
    } catch {
      // silent
    } finally {
      setIsLoadingConcepts(false)
    }
  }, [artistDna])

  const selectConcept = (c: string) => {
    setConcept(c)
    setShowConcepts(false)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Writing Studio
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={resetStudio}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Concept input + generator */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Song Concept
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-amber-400 hover:text-amber-300 gap-1"
              onClick={generateConcepts}
              disabled={isLoadingConcepts}
            >
              {isLoadingConcepts ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : showConcepts && conceptSuggestions.length > 0 ? (
                <RefreshCw className="w-3 h-3" />
              ) : (
                <Lightbulb className="w-3 h-3" />
              )}
              {isLoadingConcepts ? 'Thinking...' : 'Suggest Ideas'}
            </Button>
          </div>
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="What is this song about?"
            className="text-sm"
          />

          {/* Concept suggestions */}
          {showConcepts && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 space-y-1.5">
              {isLoadingConcepts ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-xs text-muted-foreground">Brainstorming concepts...</span>
                </div>
              ) : conceptSuggestions.length > 0 ? (
                <>
                  {conceptSuggestions.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => selectConcept(c)}
                      className="w-full text-left px-3 py-2 rounded-md text-xs text-foreground/80 hover:bg-amber-500/15 hover:text-foreground transition-colors leading-relaxed"
                    >
                      {c}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowConcepts(false)}
                    className="w-full text-center text-[10px] text-muted-foreground/60 hover:text-muted-foreground pt-1"
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No suggestions available</p>
              )}
            </div>
          )}
        </div>

        {/* 3-column layout */}
        <div className="flex gap-4 min-h-[500px]">
          {/* Left: Section Picker + Idea Bank */}
          <div className="w-[240px] shrink-0 space-y-4">
            <SectionPicker />
            <IdeaBankDrawer />
          </div>

          {/* Center: Tone + Options */}
          <div className="flex-1 space-y-4 min-w-0">
            {activeSection ? (
              <>
                <ToneControls />
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Draft Options
                    {activeSection.isLocked && (
                      <span className="text-xs text-green-400 ml-2">(locked)</span>
                    )}
                  </h3>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating || activeSection.isLocked}
                    className="gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </Button>
                </div>
                <OptionGrid />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {sections.length === 0
                  ? 'Add a section to start writing'
                  : 'Select a section from the sidebar'}
              </div>
            )}
          </div>

          {/* Right: Lyrics + Prompt */}
          <div className="w-[300px] shrink-0 space-y-4">
            <LyricsPreview />
            <PromptPreview />
          </div>
        </div>
      </CardContent>

      {/* Regenerate confirmation dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing drafts?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {draftOptions.length} unsaved draft option{draftOptions.length !== 1 ? 's' : ''}.
              Generating new ones will replace them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowRegenerateConfirm(false); doGenerate() }}>
              Generate New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
