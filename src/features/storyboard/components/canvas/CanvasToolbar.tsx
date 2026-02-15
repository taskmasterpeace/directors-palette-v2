'use client'

import { useMemo } from 'react'
import {
    Play,
    Download,
    CheckSquare,
    Square,
    Upload,
    Film,
    CheckCircle,
    Clock,
    AlertCircle,
    Wand2,
    Search,
    LayoutGrid,
    Grid3X3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { GeneratedImageData } from '../../types/storyboard.types'
import type { CanvasVideoEntry } from './CanvasPanel'

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

    return (
        <div className="flex flex-col gap-2">
            {/* Main toolbar row */}
            <div className="flex items-center gap-2 px-3 py-2 bg-card/50 border border-border rounded-xl">
                {/* Selection controls */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs touch-manipulation"
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                >
                    {allSelected ? (
                        <><Square className="w-3.5 h-3.5 mr-1.5" /> Deselect</>
                    ) : (
                        <><CheckSquare className="w-3.5 h-3.5 mr-1.5" /> Select All</>
                    )}
                </Button>

                {hasSelection && (
                    <Badge variant="secondary" className="text-xs">
                        {selectedCount}/{totalCount}
                    </Badge>
                )}

                {/* Search */}
                <div className="relative flex-1 max-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Filter shots..."
                        className="h-8 text-xs pl-7 bg-secondary/30"
                    />
                </div>

                {/* Grid density toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
                {hasSelection && (
                    <>
                        <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs touch-manipulation"
                            onClick={onGenerateSelected}
                        >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            Generate ({selectedCount})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10 touch-manipulation"
                            onClick={onAnimateSelected}
                        >
                            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                            Animate ({selectedCount})
                        </Button>
                    </>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs touch-manipulation"
                    onClick={onExport}
                    disabled={isImporting || statusCounts.completed === 0}
                >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export
                </Button>

                {isImporting && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <Upload className="w-3 h-3 animate-pulse" />
                        Importing...
                    </Badge>
                )}
            </div>
        </div>
    )
}
