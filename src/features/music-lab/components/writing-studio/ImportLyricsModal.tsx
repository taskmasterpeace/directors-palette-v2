'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, FileText, ArrowRight, Merge, Scissors } from 'lucide-react'
import { toast } from 'sonner'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { DetectedSection, SectionType } from '../../types/writing-studio.types'

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'hook', label: 'Hook' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
]

interface ImportLyricsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportLyricsModal({ open, onOpenChange }: ImportLyricsModalProps) {
  const [lyrics, setLyrics] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detected, setDetected] = useState<DetectedSection[] | null>(null)

  const importSections = useWritingStudioStore((s) => s.importSections)
  const artistDna = useArtistDnaStore((s) => s.draft)

  const handleAnalyze = async () => {
    if (!lyrics.trim()) {
      toast.error('Paste some lyrics first')
      return
    }

    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/artist-dna/analyze-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lyrics: lyrics.trim(),
          artistName: artistDna?.identity?.stageName || undefined,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const data = await res.json()
      setDetected(data.sections)
      toast.success(`Detected ${data.sections.length} sections`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRelabel = (index: number, type: SectionType) => {
    if (!detected) return
    const updated = [...detected]
    updated[index] = {
      ...updated[index],
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }
    setDetected(updated)
  }

  const handleMerge = (index: number) => {
    if (!detected || index >= detected.length - 1) return
    const updated = [...detected]
    const merged: DetectedSection = {
      type: updated[index].type,
      label: updated[index].label,
      lines: [...updated[index].lines, ...updated[index + 1].lines],
    }
    updated.splice(index, 2, merged)
    setDetected(updated)
  }

  const handleSplit = (sectionIndex: number, lineIndex: number) => {
    if (!detected) return
    const section = detected[sectionIndex]
    if (lineIndex <= 0 || lineIndex >= section.lines.length) return

    const first: DetectedSection = {
      type: section.type,
      label: section.label,
      lines: section.lines.slice(0, lineIndex),
    }
    const second: DetectedSection = {
      type: section.type,
      label: section.label + ' (cont.)',
      lines: section.lines.slice(lineIndex),
    }

    const updated = [...detected]
    updated.splice(sectionIndex, 1, first, second)
    setDetected(updated)
  }

  const handleLoad = () => {
    if (!detected || detected.length === 0) return
    importSections(detected)
    toast.success(`Loaded ${detected.length} sections into studio`)
    setLyrics('')
    setDetected(null)
    onOpenChange(false)
  }

  const handleClose = () => {
    setLyrics('')
    setDetected(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5" />
            Import Lyrics
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
          {/* Left: Paste area */}
          <div className="flex-1 flex flex-col gap-3">
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste your lyrics here..."
              className="flex-1 min-h-[300px] resize-none bg-zinc-950 border-zinc-700 text-sm font-mono"
              disabled={isAnalyzing}
            />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !lyrics.trim()}
              className="gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Analyze Sections
                </>
              )}
            </Button>
          </div>

          {/* Right: Detected sections */}
          {detected && (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="text-xs font-medium text-muted-foreground">
                {detected.length} sections detected — adjust labels or merge/split as needed
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {detected.map((section, sIdx) => (
                  <div
                    key={sIdx}
                    className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2"
                  >
                    {/* Section header with type selector */}
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={section.type}
                        onValueChange={(val) => handleRelabel(sIdx, val as SectionType)}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs bg-zinc-900 border-zinc-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_TYPES.map((st) => (
                            <SelectItem key={st.value} value={st.value}>
                              {st.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex gap-1">
                        {sIdx < detected.length - 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-muted-foreground"
                            onClick={() => handleMerge(sIdx)}
                            title="Merge with next section"
                          >
                            <Merge className="w-3 h-3 mr-1" />
                            Merge
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Lines */}
                    <div className="text-xs text-zinc-300 font-mono leading-relaxed">
                      {section.lines.map((line, lIdx) => (
                        <div key={lIdx} className="group flex items-start gap-1">
                          <span className="flex-1 py-0.5">{line || '\u00A0'}</span>
                          {lIdx > 0 && lIdx < section.lines.length && (
                            <button
                              onClick={() => handleSplit(sIdx, lIdx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-cyan-400 hover:text-cyan-300"
                              title="Split here"
                            >
                              <Scissors className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={handleLoad} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                Load into Studio ({detected.length} sections)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
