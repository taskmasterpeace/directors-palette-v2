'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Film, Camera, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import type { ClassifiedSegment, BRollPoolCategory } from '../../types/storyboard.types'

// ---------------------------------------------------------------------------
// Badge color map
// ---------------------------------------------------------------------------
const BADGE_COLORS: Record<string, string> = {
    'title-card': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    action: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    narration: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    transition: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// ---------------------------------------------------------------------------
// TimelineItem sub-component
// ---------------------------------------------------------------------------
interface TimelineItemProps {
    segment: ClassifiedSegment
    imageUrl?: string
    prompt?: string
    brollCategory?: BRollPoolCategory
    onSelectVariant?: (categoryId: string, promptId: string) => void
}

function TimelineItem({ segment, imageUrl, prompt, brollCategory, onSelectVariant }: TimelineItemProps) {
    const [expanded, setExpanded] = useState(false)

    const isNarration = segment.classification === 'narration'
    const isTransition = segment.classification === 'transition'
    const badgeType = segment.classification
    const badgeLabel = isNarration ? 'B-ROLL' : isTransition ? 'TRANSITION' : 'ACTION'
    const badgeColor = BADGE_COLORS[badgeType] ?? BADGE_COLORS.action

    // Narration segments render at 70% width, offset left
    const widthClass = isNarration ? 'w-[70%]' : 'w-full'

    // Find the selected variant image from the B-roll pool
    const selectedVariant = brollCategory?.prompts.find(p => p.selected)
    const displayImage = isNarration && selectedVariant?.imageUrl ? selectedVariant.imageUrl : imageUrl

    return (
        <div className={`${widthClass} group`}>
            <Card className="overflow-hidden border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors">
                {/* Image area */}
                {displayImage && (
                    <div className="relative aspect-video overflow-hidden">
                        <img
                            src={displayImage}
                            alt={`Shot ${segment.sequence}`}
                            className="w-full h-full object-cover"
                        />
                        <Badge
                            variant="outline"
                            className={`absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}
                        >
                            {badgeLabel}
                        </Badge>
                        {isNarration && brollCategory && (
                            <Badge
                                variant="outline"
                                className="absolute top-2 left-2 text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                                {brollCategory.theme}
                            </Badge>
                        )}
                    </div>
                )}

                {/* Text content */}
                <CardContent className="p-3 space-y-2">
                    <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                        {segment.text}
                    </p>

                    {prompt && (
                        <p className="text-[10px] text-white/40 italic line-clamp-1">
                            {prompt}
                        </p>
                    )}

                    {/* B-roll variant picker for narration segments */}
                    {isNarration && brollCategory && brollCategory.prompts.length > 1 && (
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-blue-400 hover:text-blue-300"
                                onClick={() => setExpanded(!expanded)}
                            >
                                <Camera className="w-3 h-3 mr-1" />
                                {expanded ? 'Hide' : 'Show'} variants ({brollCategory.prompts.length})
                            </Button>

                            {expanded && (
                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                    {brollCategory.prompts.map((variant) => (
                                        <button
                                            key={variant.id}
                                            onClick={() => onSelectVariant?.(brollCategory.id, variant.id)}
                                            className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                                                variant.selected
                                                    ? 'border-blue-400 ring-1 ring-blue-400/50'
                                                    : 'border-transparent hover:border-white/30'
                                            }`}
                                        >
                                            {variant.imageUrl ? (
                                                <img
                                                    src={variant.imageUrl}
                                                    alt="Variant"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                    <Film className="w-3 h-3 text-white/20" />
                                                </div>
                                            )}
                                            {variant.selected && (
                                                <div className="absolute inset-0 bg-blue-400/10" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

// ---------------------------------------------------------------------------
// DocumentaryTimeline main component
// ---------------------------------------------------------------------------
export function DocumentaryTimeline() {
    const {
        documentaryChapters,
        generatedImages,
        generatedPrompts,
        updateChapterName,
        selectBrollVariant,
    } = useStoryboardStore()

    const [collapsedChapters, setCollapsedChapters] = useState<Set<number>>(new Set())
    const [editingChapter, setEditingChapter] = useState<number | null>(null)
    const [editName, setEditName] = useState('')

    // ----- Empty state -----
    if (documentaryChapters.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                    <Film className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No documentary data yet</p>
                    <p className="text-sm mt-1">
                        Enable documentary mode and generate a breakdown to see the timeline.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const toggleCollapse = (idx: number) => {
        setCollapsedChapters((prev) => {
            const next = new Set(prev)
            if (next.has(idx)) next.delete(idx)
            else next.add(idx)
            return next
        })
    }

    const startEditing = (idx: number, currentName: string) => {
        setEditingChapter(idx)
        setEditName(currentName)
    }

    const commitEdit = (idx: number) => {
        if (editName.trim()) updateChapterName(idx, editName.trim())
        setEditingChapter(null)
    }

    const cancelEdit = () => setEditingChapter(null)

    // Helper: find the B-roll category for a narration segment
    const findBrollCategory = (chapter: typeof documentaryChapters[number], segSeq: number) =>
        chapter.brollPool.find((cat) => cat.assignedSegments.includes(segSeq))

    return (
        <div className="space-y-6">
            {documentaryChapters.map((chapter) => {
                const isCollapsed = collapsedChapters.has(chapter.index)
                const isEditing = editingChapter === chapter.index

                return (
                    <div key={chapter.index} className="space-y-3">
                        {/* Sticky chapter header */}
                        <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 backdrop-blur py-2 px-1 -mx-1 rounded">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => toggleCollapse(chapter.index)}
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </Button>

                            {isEditing ? (
                                <div className="flex items-center gap-1 flex-1">
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitEdit(chapter.index)
                                            if (e.key === 'Escape') cancelEdit()
                                        }}
                                        className="h-7 text-sm"
                                        autoFocus
                                    />
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => commitEdit(chapter.index)}>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEdit}>
                                        <X className="w-3.5 h-3.5 text-red-400" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-white/90 truncate">
                                        Ch. {chapter.index + 1}: {chapter.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 shrink-0"
                                        onClick={() => startEditing(chapter.index, chapter.name)}
                                    >
                                        <Pencil className="w-3 h-3 text-white/50" />
                                    </Button>
                                    <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                                        {chapter.segments.length} shots
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Chapter content */}
                        {!isCollapsed && (
                            <div className="space-y-3 pl-4 border-l-2 border-white/10">
                                {/* Title card */}
                                {chapter.titleCard && (
                                    <div className="w-full">
                                        <Card className="overflow-hidden border-amber-500/20 bg-amber-500/5">
                                            {chapter.titleCard.imageUrl && (
                                                <div className="relative aspect-video overflow-hidden">
                                                    <img
                                                        src={chapter.titleCard.imageUrl}
                                                        alt={`Title: ${chapter.name}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <Badge
                                                        variant="outline"
                                                        className={`absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider ${BADGE_COLORS['title-card']}`}
                                                    >
                                                        TITLE CARD
                                                    </Badge>
                                                </div>
                                            )}
                                            {!chapter.titleCard.imageUrl && (
                                                <CardContent className="py-6 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] font-semibold uppercase tracking-wider ${BADGE_COLORS['title-card']}`}
                                                    >
                                                        TITLE CARD
                                                    </Badge>
                                                    <p className="text-sm font-medium text-amber-400/80 mt-2">
                                                        {chapter.name}
                                                    </p>
                                                </CardContent>
                                            )}
                                        </Card>
                                    </div>
                                )}

                                {/* Segments */}
                                {chapter.segments.map((segment) => {
                                    const imgData = generatedImages[segment.sequence]
                                    const promptData = generatedPrompts.find(
                                        (p) => p.sequence === segment.sequence
                                    )
                                    const brollCat = segment.classification === 'narration'
                                        ? findBrollCategory(chapter, segment.sequence)
                                        : undefined

                                    return (
                                        <TimelineItem
                                            key={segment.sequence}
                                            segment={segment}
                                            imageUrl={imgData?.imageUrl}
                                            prompt={promptData?.prompt}
                                            brollCategory={brollCat}
                                            onSelectVariant={selectBrollVariant}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
