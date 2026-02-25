'use client'

import { useMemo } from 'react'
import {
    Play,
    Pause,
    X,
    Download,
    CheckSquare,
    Square,
    Upload,
    Film,
    CheckCircle,
    Clock,
    AlertCircle,
    Clapperboard,
    Search,
    LayoutGrid,
    Grid3X3,
    BookOpen,
    Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type { GeneratedImageData } from '../../types/storyboard.types'
import type { CanvasVideoEntry } from './CanvasPanel'
import type { StoryChapter } from '../../services/chapter-detection.service'

interface CanvasToolbarProps {
    selectedCount: number
    totalCount: number
    onSelectAll: () => void
    onDeselectAll: () => void
    onGenerateSelected: () => void
    onAnimateSelected: () => void
    onExport: () => void
    isImporting: boolean
    generatedImages: Record<number, GeneratedImageData>
    videos: Record<number, CanvasVideoEntry>
    searchQuery: string
    onSearchChange: (query: string) => void
    gridDensity: 'compact' | 'normal'
    onToggleDensity: () => void
    // Chapter controls
    chapters: StoryChapter[]
    activeChapterIndex: number
    onChapterChange: (index: number) => void
    // Generation controls
    isGenerating: boolean
    isPaused: boolean
    progress: { current: number; total: number }
    onPause: () => void
    onResume: () => void
    onCancel: () => void
}

export function CanvasToolbar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onGenerateSelected,
    onAnimateSelected,
    onExport,
    isImporting,
    generatedImages,
    videos,
    searchQuery,
    onSearchChange,
    gridDensity,
    onToggleDensity,
    chapters,
    activeChapterIndex,
    onChapterChange,
    isGenerating,
    isPaused,
    progress,
    onPause,
    onResume,
    onCancel,
}: CanvasToolbarProps) {
    const hasSelection = selectedCount > 0
    const allSelected = selectedCount === totalCount && totalCount > 0

    // Status summary
    const statusCounts = useMemo(() => {
        const entries = Object.values(generatedImages)
        return {
            completed: entries.filter(e => e.status === 'completed').length,
            generating: entries.filter(e => e.status === 'generating' || e.status === 'pending').length,
            failed: entries.filter(e => e.status === 'failed').length,
            videosReady: Object.values(videos).filter(v => v.status === 'completed').length,
            videosProcessing: Object.values(videos).filter(v => v.status === 'processing' || v.status === 'pending').length,
        }
    }, [generatedImages, videos])

    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    return (
        <div className="flex flex-col gap-2">
            {/* Chapter row - only show when multiple chapters */}
            {chapters.length > 1 && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-card/50 border border-border rounded-xl overflow-x-auto">
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <button
                        onClick={() => onChapterChange(-1)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors flex-shrink-0 ${
                            activeChapterIndex < 0
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                        <Layers className="w-3 h-3" />
                        All
                    </button>
                    {chapters.map((ch, i) => (
                        <button
                            key={ch.id}
                            onClick={() => onChapterChange(i)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors flex-shrink-0 ${
                                activeChapterIndex === i
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                        >
                            Ch.{i + 1}
                            {ch.segmentIndices.length > 0 && (
                                <span className="text-[10px] opacity-70">({ch.segmentIndices.length})</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Main toolbar row */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border rounded-xl">
                {/* Selection controls */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs touch-manipulation"
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                >
                    {allSelected ? (
                        <><Square className="w-3.5 h-3.5 mr-1" /> Deselect</>
                    ) : (
                        <><CheckSquare className="w-3.5 h-3.5 mr-1" /> Select All</>
                    )}
                </Button>

                {hasSelection && (
                    <Badge variant="secondary" className="text-xs py-0">
                        {selectedCount}/{totalCount}
                    </Badge>
                )}

                {/* Search */}
                <div className="relative flex-1 max-w-[180px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Filter shots..."
                        className="h-7 text-xs pl-7 bg-secondary/30"
                    />
                </div>

                {/* Grid density toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggleDensity}
                    title={gridDensity === 'compact' ? 'Normal grid' : 'Compact grid'}
                >
                    {gridDensity === 'compact' ? (
                        <LayoutGrid className="w-3.5 h-3.5" />
                    ) : (
                        <Grid3X3 className="w-3.5 h-3.5" />
                    )}
                </Button>

                <div className="flex-1" />

                {/* Status summary */}
                <div className="hidden sm:flex items-center gap-2 text-xs">
                    {statusCounts.completed > 0 && (
                        <span className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {statusCounts.completed}
                        </span>
                    )}
                    {statusCounts.generating > 0 && (
                        <span className="flex items-center gap-1 text-amber-500">
                            <Clock className="w-3.5 h-3.5" />
                            {statusCounts.generating}
                        </span>
                    )}
                    {statusCounts.failed > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {statusCounts.failed}
                        </span>
                    )}
                    {statusCounts.videosReady > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                            <Film className="w-3.5 h-3.5" />
                            {statusCounts.videosReady}
                        </span>
                    )}
                </div>

                {/* Batch actions */}
                {hasSelection && !isGenerating && (
                    <>
                        <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs touch-manipulation"
                            onClick={onGenerateSelected}
                        >
                            <Play className="w-3.5 h-3.5 mr-1" />
                            Generate ({selectedCount})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 touch-manipulation"
                            onClick={onAnimateSelected}
                        >
                            <Clapperboard className="w-3.5 h-3.5 mr-1" />
                            Video ({selectedCount})
                        </Button>
                    </>
                )}

                {/* Generation controls */}
                {isGenerating && (
                    <>
                        {isPaused ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onResume}>
                                <Play className="w-3.5 h-3.5 mr-1" /> Resume
                            </Button>
                        ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPause}>
                                <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                            </Button>
                        )}
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={onCancel}>
                            <X className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                    </>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs touch-manipulation"
                    onClick={onExport}
                    disabled={isImporting || statusCounts.completed === 0}
                >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Export
                </Button>

                {isImporting && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Upload className="w-3 h-3 animate-pulse" />
                        Importing...
                    </Badge>
                )}
            </div>

            {/* Generation progress bar */}
            {isGenerating && (
                <div className="flex items-center gap-3 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-xl">
                    <span className="text-xs font-medium">
                        {isPaused ? 'Paused' : 'Generating'} {progress.current}/{progress.total}
                    </span>
                    <Progress value={progressPercent} className="flex-1 h-1.5" />
                    <span className="text-xs font-bold text-primary">{Math.round(progressPercent)}%</span>
                </div>
            )}
        </div>
    )
}
