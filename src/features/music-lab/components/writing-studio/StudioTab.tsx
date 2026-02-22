'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, PenTool, RotateCcw } from 'lucide-react'
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
    generateOptions,
    resetStudio,
  } = useWritingStudioStore()

  const { draft: artistDna } = useArtistDnaStore()

  const activeSection = sections.find((s) => s.id === activeSectionId)

  const handleGenerate = () => {
    if (!activeSectionId) return
    generateOptions(activeSectionId, artistDna, sections)
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
        {/* Concept input */}
        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Song Concept
          </label>
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="What is this song about?"
            className="text-sm"
          />
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
    </Card>
  )
}
