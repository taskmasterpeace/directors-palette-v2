'use client'

import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Images, CheckCircle, AlertCircle, Clock, RefreshCw, Archive, LayoutGrid, GalleryHorizontal } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export type GalleryViewMode = 'grid' | 'carousel'

interface GalleryHeaderProps {
    generatedCount: number
    pendingCount: number
    failedCount: number
    showCompletedOnly: boolean
    isRegeneratingFailed: boolean
    isDownloadingAll: boolean
    viewMode: GalleryViewMode
    onToggleCompletedOnly: () => void
    onRegenerateFailed: () => void
    onDownloadAll: () => void
    onViewModeChange: (mode: GalleryViewMode) => void
}

export function GalleryHeader({
    generatedCount,
    pendingCount,
    failedCount,
    showCompletedOnly,
    isRegeneratingFailed,
    isDownloadingAll,
    viewMode,
    onToggleCompletedOnly,
    onRegenerateFailed,
    onDownloadAll,
    onViewModeChange,
}: GalleryHeaderProps) {
    return (
        <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Images className="w-5 h-5" />
                    Generated Storyboard
                </div>
                {/* Status + view toggle */}
                <div className="flex items-center gap-3 text-sm">
                    {generatedCount > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            {generatedCount}
                        </span>
                    )}
                    {pendingCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="w-4 h-4" />
                            {pendingCount}
                        </span>
                    )}
                    {failedCount > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                {failedCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRegenerateFailed}
                                disabled={isRegeneratingFailed}
                                className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                            >
                                {isRegeneratingFailed ? (
                                    <>
                                        <LoadingSpinner size="xs" color="current" className="mr-1" />
                                        Retrying...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Retry Failed
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                    {/* View mode toggle */}
                    <div className="flex items-center border rounded-md overflow-hidden ml-2">
                        <button
                            onClick={() => onViewModeChange('grid')}
                            className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                            title="Grid view"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onViewModeChange('carousel')}
                            className={`p-1.5 transition-colors ${viewMode === 'carousel' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                            title="Carousel view"
                        >
                            <GalleryHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>{viewMode === 'grid' ? 'Hover for actions.' : 'Navigate shots with arrows.'}</span>
                    <button
                        onClick={onToggleCompletedOnly}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${showCompletedOnly ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'}`}
                    >
                        {showCompletedOnly ? 'Completed only' : 'Show all'}
                    </button>
                </div>
                {generatedCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDownloadAll}
                        disabled={isDownloadingAll}
                        className="ml-2 flex-shrink-0"
                    >
                        {isDownloadingAll ? (
                            <>
                                <LoadingSpinner size="xs" color="current" className="mr-1" />
                                Zipping...
                            </>
                        ) : (
                            <>
                                <Archive className="w-4 h-4 mr-1" />
                                Download All
                            </>
                        )}
                    </Button>
                )}
            </CardDescription>
        </CardHeader>
    )
}
