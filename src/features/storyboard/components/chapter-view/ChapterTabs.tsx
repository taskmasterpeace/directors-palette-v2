'use client'

import { useEffect, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BookOpen, FileText, Layers } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { detectChapters, mapSegmentsToChapters } from '../../services/chapter-detection.service'

interface ChapterTabsProps {
    children: (chapterIndex: number) => React.ReactNode
}

// Special index for "All Chapters" view
export const ALL_CHAPTERS_INDEX = -1

export function ChapterTabs({ children }: ChapterTabsProps) {
    const {
        storyText,
        chapters,
        activeChapterIndex,
        shouldShowChapters,
        chapterDetectionReason,
        breakdownResult,
        setChapters,
        setActiveChapter
    } = useStoryboardStore()

    // Auto-detect chapters when story text changes
    useEffect(() => {
        if (!storyText.trim()) {
            return
        }

        const result = detectChapters(storyText)

        // Map segments to chapters if we have breakdown result
        if (result.shouldChapter && breakdownResult?.segments) {
            const mappedChapters = mapSegmentsToChapters(
                result.chapters,
                breakdownResult.segments
            )
            setChapters({ ...result, chapters: mappedChapters })
        } else {
            setChapters(result)
        }
    }, [storyText, breakdownResult, setChapters])

    // Calculate total shots across all chapters
    const totalShots = breakdownResult?.total_count || chapters.reduce((sum, ch) => sum + ch.segmentIndices.length, 0)

    // Get shots count for the active chapter
    const activeShotCount = useMemo(() => {
        if (activeChapterIndex < 0) return totalShots
        const ch = chapters[activeChapterIndex]
        return ch?.segmentIndices.length || 0
    }, [activeChapterIndex, chapters, totalShots])

    const activeChapterLabel = useMemo(() => {
        if (activeChapterIndex < 0) return 'All Chapters'
        const ch = chapters[activeChapterIndex]
        return ch?.title || `Chapter ${activeChapterIndex + 1}`
    }, [activeChapterIndex, chapters])

    // If no chapters or single chapter, just render content directly
    if (!shouldShowChapters || chapters.length <= 1) {
        return <>{children(0)}</>
    }

    return (
        <div className="space-y-2">
            {/* Chapter Navigation - More Prominent */}
            <div className="rounded-lg border bg-card p-2">
                {/* Header with active chapter summary */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>Chapters</span>
                        <Badge variant="outline" className="text-xs">
                            {chapters.length}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                            Viewing: {activeChapterLabel} ({activeShotCount} of {totalShots} shots)
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                            {chapterDetectionReason}
                        </span>
                    </div>
                </div>

                {/* Chapter Tabs */}
                <Tabs
                    value={String(activeChapterIndex)}
                    onValueChange={(v) => setActiveChapter(Number(v))}
                >
                    <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 p-1 bg-muted/50">
                        {/* All Chapters Tab */}
                        <TabsTrigger
                            value={String(ALL_CHAPTERS_INDEX)}
                            className="flex items-center gap-1.5 py-1.5 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span className="font-medium">All Shots</span>
                            <Badge variant="outline" className="text-xs py-0 px-1.5 ml-1 bg-background/50">
                                {totalShots}
                            </Badge>
                        </TabsTrigger>

                        {chapters.map((chapter, i) => (
                            <TabsTrigger
                                key={chapter.id}
                                value={String(i)}
                                className="flex items-center gap-1.5 py-1.5 px-3 text-xs"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span className="max-w-[150px] truncate">
                                    {chapter.title || `Chapter ${i + 1}`}
                                </span>
                                {chapter.segmentIndices.length > 0 && (
                                    <Badge variant="secondary" className="text-xs py-0 px-1.5 ml-1">
                                        {chapter.segmentIndices.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* All Chapters Content */}
                    <TabsContent value={String(ALL_CHAPTERS_INDEX)} className="mt-3">
                        {children(ALL_CHAPTERS_INDEX)}
                    </TabsContent>

                    {chapters.map((chapter, i) => (
                        <TabsContent key={chapter.id} value={String(i)} className="mt-3">
                            {children(i)}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    )
}
