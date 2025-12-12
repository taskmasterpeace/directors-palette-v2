'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import { useStoryboardStore } from '../../store'

interface ShotTextPreviewProps {
    chapterIndex?: number
}

export function ShotTextPreview({ chapterIndex = 0 }: ShotTextPreviewProps) {
    const { storyText, breakdownResult, chapters, isPreviewCollapsed, togglePreviewCollapsed } = useStoryboardStore()

    // Filter segments by chapter
    // chapterIndex of -1 means "All Chapters" view - show all segments
    const filteredSegments = useMemo(() => {
        if (!breakdownResult?.segments) return []
        if (!chapters || chapters.length === 0) return breakdownResult.segments

        // "All Chapters" view - show all segments
        if (chapterIndex < 0) return breakdownResult.segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return breakdownResult.segments
        }

        return breakdownResult.segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex])

    // Get chapter text bounds for display
    const chapterTextBounds = useMemo(() => {
        if (!chapters || chapters.length === 0) {
            return { start: 0, end: storyText.length }
        }
        // "All Chapters" view - show full story text
        if (chapterIndex < 0) {
            return { start: 0, end: storyText.length }
        }
        const activeChapter = chapters[chapterIndex]
        if (!activeChapter) {
            return { start: 0, end: storyText.length }
        }
        return { start: activeChapter.startIndex, end: activeChapter.endIndex }
    }, [chapters, chapterIndex, storyText.length])

    // Build highlighted text from breakdown segments
    const highlightedContent = useMemo(() => {
        if (!storyText || !breakdownResult) {
            return <span className="text-muted-foreground">{storyText || 'No story text yet...'}</span>
        }

        // Use chapter text bounds
        const { start: chapterStart, end: chapterEnd } = chapterTextBounds
        const chapterText = storyText.slice(chapterStart, chapterEnd)

        const elements: React.ReactElement[] = []
        let lastEnd = 0

        filteredSegments.forEach((segment, index) => {
            // Adjust indices relative to chapter start
            const relativeStart = segment.start_index - chapterStart
            const relativeEnd = segment.end_index - chapterStart

            // Skip segments outside chapter bounds
            if (relativeEnd <= 0 || relativeStart >= chapterText.length) return

            // Clamp to chapter bounds
            const clampedStart = Math.max(0, relativeStart)
            const clampedEnd = Math.min(chapterText.length, relativeEnd)

            // Add any text before this segment
            if (clampedStart > lastEnd) {
                elements.push(
                    <span key={`gap-${index}`}>
                        {chapterText.slice(lastEnd, clampedStart)}
                    </span>
                )
            }

            // Add the highlighted segment
            elements.push(
                <span
                    key={`segment-${index}`}
                    className="px-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                        backgroundColor: `${segment.color}30`,
                        borderBottom: `2px solid ${segment.color}`
                    }}
                    title={`Shot ${segment.sequence}: ${segment.text.slice(0, 50)}...`}
                >
                    {chapterText.slice(clampedStart, clampedEnd)}
                </span>
            )

            lastEnd = clampedEnd
        })

        // Add any remaining text
        if (lastEnd < chapterText.length) {
            elements.push(
                <span key="remainder">
                    {chapterText.slice(lastEnd)}
                </span>
            )
        }

        return elements.length > 0 ? elements : <span className="text-muted-foreground">No content in this chapter...</span>
    }, [storyText, breakdownResult, filteredSegments, chapterTextBounds])

    return (
        <Collapsible open={!isPreviewCollapsed} onOpenChange={() => togglePreviewCollapsed()}>
            <Card>
                <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                        <CardTitle className="text-sm flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Color-Coded Preview
                                {filteredSegments.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        {filteredSegments.length} segments
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {isPreviewCollapsed && (
                                    <span className="text-xs text-muted-foreground">Click to expand</span>
                                )}
                                {isPreviewCollapsed ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>
                        <div className="max-h-[400px] overflow-y-auto p-3 rounded-lg bg-muted/30 border font-mono text-sm leading-relaxed whitespace-pre-wrap">
                            {highlightedContent}
                        </div>

                        {filteredSegments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-xs text-muted-foreground">Legend:</span>
                                {filteredSegments.slice(0, 6).map((segment) => (
                                    <span
                                        key={segment.sequence}
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{
                                            backgroundColor: `${segment.color}30`,
                                            borderLeft: `3px solid ${segment.color}`
                                        }}
                                    >
                                        Shot {segment.sequence}
                                    </span>
                                ))}
                                {filteredSegments.length > 6 && (
                                    <span className="text-xs text-muted-foreground">
                                        +{filteredSegments.length - 6} more...
                                    </span>
                                )}
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}
