'use client'

import { Play, Download, CheckSquare, Square, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CanvasToolbarProps {
    selectedCount: number
    totalCount: number
    onSelectAll: () => void
    onDeselectAll: () => void
    onGenerateSelected: () => void
    onExport: () => void
    isImporting: boolean
}

export function CanvasToolbar({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onGenerateSelected,
    onExport,
    isImporting,
}: CanvasToolbarProps) {
    const hasSelection = selectedCount > 0
    const allSelected = selectedCount === totalCount && totalCount > 0

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border rounded-lg">
            {/* Selection controls */}
            <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={allSelected ? onDeselectAll : onSelectAll}
            >
                {allSelected ? (
                    <><Square className="w-3.5 h-3.5 mr-1" /> Deselect All</>
                ) : (
                    <><CheckSquare className="w-3.5 h-3.5 mr-1" /> Select All</>
                )}
            </Button>

            {hasSelection && (
                <span className="text-xs text-muted-foreground">
                    {selectedCount} of {totalCount} selected
                </span>
            )}

            <div className="flex-1" />

            {/* Batch actions */}
            {hasSelection && (
                <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onGenerateSelected}
                >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Generate Selected ({selectedCount})
                </Button>
            )}

            <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onExport}
                disabled={isImporting}
            >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export
            </Button>

            {isImporting && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Upload className="w-3 h-3 animate-pulse" />
                    Importing...
                </span>
            )}
        </div>
    )
}
