'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Check, Scissors, Trash2, X, Star, Loader2, RefreshCw, MessageSquareText } from 'lucide-react'
import { useWritingStudioStore } from '../../store/writing-studio.store'
import { useArtistDnaStore } from '../../store/artist-dna.store'
import type { DraftOption, IdeaTag, ArtistJudgment } from '../../types/writing-studio.types'
import { IDEA_TAGS } from '../../types/writing-studio.types'

function ScoreBadge({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {label}: {score}/10
    </span>
  )
}

function DraftCard({ draft, judgment, rank }: { draft: DraftOption; judgment?: ArtistJudgment; rank?: number }) {
  const {
    activeSectionId,
    keepDraft,
    addToIdeaBank,
    tossDraft,
    editDraft,
    reviseDraft,
    isRevising,
    sections,
    artistDirection,
  } = useWritingStudioStore()
  const { draft: artistDna } = useArtistDnaStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(draft.content)
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set())
  const [showChopTags, setShowChopTags] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [revisionText, setRevisionText] = useState('')

  const lines = useMemo(() => draft.content.split('\n').filter(l => l.trim()), [draft.content])

  // Build a map of lineNumber -> LineNote for highlighting
  const lineNoteMap = useMemo(() => {
    const map = new Map<number, { note: string; suggestion?: string }>()
    if (judgment?.lineNotes) {
      judgment.lineNotes.forEach(n => map.set(n.lineNumber, { note: n.note, suggestion: n.suggestion }))
    }
    return map
  }, [judgment])

  const activeSection = sections.find(s => s.id === activeSectionId)

  const handleKeep = () => {
    if (activeSectionId) keepDraft(activeSectionId, draft)
  }

  const handleRevise = () => {
    if (!activeSectionId || !revisionText.trim() || !activeSection) return
    reviseDraft(activeSectionId, draft, revisionText, activeSection.type, artistDna, judgment, artistDirection)
    setShowRevision(false)
    setRevisionText('')
  }

  const handleSaveEdit = () => {
    editDraft(draft.id, editText)
    setIsEditing(false)
  }

  const toggleLine = (idx: number) => {
    setSelectedLines(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const handleChopSelected = (tags: IdeaTag[]) => {
    const text = selectedLines.size > 0
      ? [...selectedLines].sort((a, b) => a - b).map(i => lines[i]).join('\n')
      : draft.content
    addToIdeaBank(text, tags, 'chopped')
    setSelectedLines(new Set())
    setShowChopTags(false)
    setIsEditing(false)
  }

  const openEditMode = () => {
    setEditText(draft.content)
    setSelectedLines(new Set())
    setIsEditing(true)
  }

  const scoreColor = judgment
    ? judgment.score >= 7 ? 'bg-green-500/15 text-green-400'
      : judgment.score >= 4 ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400'
    : ''

  const rhymeScoreColor = judgment
    ? judgment.rhymeScore >= 7 ? 'bg-green-500/15 text-green-400'
      : judgment.rhymeScore >= 4 ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400'
    : ''

  return (
    <div className={`rounded-lg border bg-card p-3 flex flex-col gap-2 ${
      judgment?.wouldKeep ? 'border-green-500/40' : 'border-border/50'
    }`}>
      {/* Header: label + rank + scores */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">Option {draft.label}</span>
          {rank !== undefined && (
            <span className="text-[10px] text-muted-foreground">#{rank + 1}</span>
          )}
          {judgment?.wouldKeep && (
            <Star className="w-3 h-3 text-green-400 fill-green-400" />
          )}
        </div>
        {judgment && (
          <div className="flex items-center gap-1.5">
            <ScoreBadge label="Overall" score={judgment.score} color={scoreColor} />
            <ScoreBadge label="Rhyme" score={judgment.rhymeScore} color={rhymeScoreColor} />
          </div>
        )}
      </div>

      {/* Artist vibe quote */}
      {judgment?.vibe && (
        <p className="text-xs italic text-muted-foreground/80 border-l-2 border-amber-500/30 pl-2 py-0.5">
          &ldquo;{judgment.vibe}&rdquo;
        </p>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="text-sm min-h-[120px] resize-y"
          />
          <div className="border border-border/30 rounded-md p-2 space-y-1">
            <p className="text-[10px] text-muted-foreground mb-1">Select lines for Idea Bank:</p>
            {lines.map((line, idx) => (
              <label key={idx} className="flex items-start gap-2 cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5">
                <Checkbox
                  checked={selectedLines.has(idx)}
                  onCheckedChange={() => toggleLine(idx)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span className="text-xs leading-snug">{line}</span>
              </label>
            ))}
          </div>
          {showChopTags ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">
                Tag {selectedLines.size > 0 ? `${selectedLines.size} line${selectedLines.size > 1 ? 's' : ''}` : 'all'} for Idea Bank:
              </p>
              <div className="flex flex-wrap gap-1">
                {IDEA_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleChopSelected([tag])}
                    className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowChopTags(false)}
              >
                <X className="w-3 h-3 inline" /> Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                onClick={() => setShowChopTags(true)}
              >
                <Scissors className="w-3 h-3 mr-1" />
                {selectedLines.size > 0 ? `Chop ${selectedLines.size}` : 'Chop All'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Lyrics with line-level highlights */
        <TooltipProvider>
          <div className="text-sm whitespace-pre-wrap flex-1 min-h-[60px] space-y-0">
            {lines.map((line, idx) => {
              const lineNum = idx + 1
              const note = lineNoteMap.get(lineNum)
              return note ? (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className="bg-amber-500/10 border-l-2 border-amber-500/40 pl-1.5 -ml-1.5 cursor-help rounded-r">
                      {line}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[280px]">
                    <p className="text-xs font-medium">{note.note}</p>
                    {note.suggestion && (
                      <p className="text-xs text-amber-400 mt-1">Try: {note.suggestion}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div key={idx}>{line}</div>
              )
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Revision input */}
      {showRevision && (
        <div className="space-y-2 border-t border-border/30 pt-2">
          <label className="text-[10px] text-muted-foreground font-medium">Revision Notes</label>
          <Input
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder="e.g. Make verse 2 punchier, swap the metaphor in line 3..."
            className="text-xs h-8"
            onKeyDown={(e) => { if (e.key === 'Enter') handleRevise() }}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-amber-400 hover:text-amber-300"
              onClick={handleRevise}
              disabled={isRevising || !revisionText.trim()}
            >
              {isRevising ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Revise
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRevision(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isEditing && !showRevision && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
            onClick={handleKeep}
          >
            <Check className="w-3 h-3 mr-1" /> Keep
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            onClick={() => setShowRevision(true)}
          >
            <MessageSquareText className="w-3 h-3 mr-1" /> Revise
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={openEditMode}
          >
            <Scissors className="w-3 h-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
            onClick={() => tossDraft(draft.id)}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Toss
          </Button>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton({ label }: { label?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 animate-pulse">
      <div className="h-3 w-16 bg-muted rounded mb-3" />
      {label && <div className="h-2 w-24 bg-muted/50 rounded mb-2" />}
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-3 bg-muted rounded w-3/5" />
      </div>
    </div>
  )
}

function JudgingSkeleton() {
  return (
    <div className="col-span-2 flex items-center justify-center gap-2 py-3">
      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      <span className="text-xs text-muted-foreground">Artist is reviewing drafts...</span>
    </div>
  )
}

export function OptionGrid() {
  const { draftOptions, isGenerating, isJudging, judgeResult } = useWritingStudioStore()

  if (isGenerating) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
        <LoadingSkeleton />
      </div>
    )
  }

  if (draftOptions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
        Click Generate to create draft options
      </div>
    )
  }

  // Sort drafts by artist ranking if available
  const sortedDrafts = judgeResult?.ranking
    ? judgeResult.ranking.map(i => draftOptions[i]).filter(Boolean)
    : draftOptions

  // Build judgment map by draft index
  const judgmentMap = new Map<string, { judgment: ArtistJudgment; rank: number }>()
  if (judgeResult) {
    judgeResult.judgments.forEach(j => {
      const draft = draftOptions[j.draftIndex]
      if (draft) {
        const rank = judgeResult.ranking.indexOf(j.draftIndex)
        judgmentMap.set(draft.id, { judgment: j, rank })
      }
    })
  }

  return (
    <div className="space-y-2">
      {/* Ranking reason */}
      {judgeResult?.rankingReason && (
        <p className="text-xs text-muted-foreground/70 italic px-1">
          {judgeResult.rankingReason}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {isJudging && <JudgingSkeleton />}
        {sortedDrafts.map((draft) => {
          const entry = judgmentMap.get(draft.id)
          return (
            <DraftCard
              key={draft.id}
              draft={draft}
              judgment={entry?.judgment}
              rank={entry?.rank}
            />
          )
        })}
      </div>
    </div>
  )
}
