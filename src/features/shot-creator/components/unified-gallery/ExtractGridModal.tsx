'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, ImagePlus, CheckSquare, Square } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { useUnifiedGalleryStore } from '../../store/unified-gallery-store'
import { logger } from '@/lib/logger'

interface ExtractGridModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    gridImageUrl: string | null
    sourceImageId?: string
}

interface GridCell {
    index: number
    row: number
    col: number
    dataUrl: string | null
    label: string
    selected: boolean
}

// Labels for the 9 cells based on the Angles grid layout
const CELL_LABELS = [
    'Establishing', 'Wide', 'Medium Wide',
    'Medium', 'Medium Close-Up', 'Close-Up',
    'Extreme Close-Up', 'Low Angle', 'High Angle'
]

/**
 * Slice a grid image into 9 equal cells
 */
async function sliceGridIntoNine(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
            const cellWidth = Math.floor(img.width / 3)
            const cellHeight = Math.floor(img.height / 3)
            const cells: string[] = []

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const canvas = document.createElement('canvas')
                    canvas.width = cellWidth
                    canvas.height = cellHeight
                    const ctx = canvas.getContext('2d')

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'))
                        return
                    }

                    ctx.drawImage(
                        img,
                        col * cellWidth,
                        row * cellHeight,
                        cellWidth,
                        cellHeight,
                        0,
                        0,
                        cellWidth,
                        cellHeight
                    )

                    cells.push(canvas.toDataURL('image/png'))
                }
            }

            resolve(cells)
        }

        img.onerror = () => reject(new Error('Failed to load image for slicing'))
        img.src = imageUrl
    })
}

export function ExtractGridModal({
    open,
    onOpenChange,
    gridImageUrl,
    sourceImageId: _sourceImageId // Reserved for future use (linking extracted cells to parent)
}: ExtractGridModalProps) {
    const { toast } = useToast()
    const [cells, setCells] = useState<GridCell[]>([])
    const [isSlicing, setIsSlicing] = useState(false)
    const [sliceError, setSliceError] = useState<string | null>(null)
    const [isSavingToGallery, setIsSavingToGallery] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

    // Slice the grid when modal opens
    useEffect(() => {
        if (open && gridImageUrl) {
            setIsSlicing(true)
            setSliceError(null)
            setCells([])

            sliceGridIntoNine(gridImageUrl)
                .then((dataUrls) => {
                    const newCells: GridCell[] = dataUrls.map((dataUrl, index) => ({
                        index,
                        row: Math.floor(index / 3),
                        col: index % 3,
                        dataUrl,
                        label: CELL_LABELS[index],
                        selected: true // All selected by default
                    }))
                    setCells(newCells)
                    setIsSlicing(false)
                })
                .catch((error) => {
                    logger.shotCreator.error('Failed to slice grid', { error: error })
                    setSliceError('Failed to extract cells from grid. The image may have CORS restrictions.')
                    setIsSlicing(false)
                })
        }
    }, [open, gridImageUrl])

    // Toggle cell selection
    const toggleCell = useCallback((index: number) => {
        setCells(prev => prev.map(cell =>
            cell.index === index ? { ...cell, selected: !cell.selected } : cell
        ))
    }, [])

    // Select all cells
    const selectAll = useCallback(() => {
        setCells(prev => prev.map(cell => ({ ...cell, selected: true })))
    }, [])

    // Deselect all cells
    const selectNone = useCallback(() => {
        setCells(prev => prev.map(cell => ({ ...cell, selected: false })))
    }, [])

    // Get selected cells
    const selectedCells = cells.filter(c => c.selected)
    const selectedCount = selectedCells.length

    // Download selected cells
    const handleDownload = useCallback(async () => {
        if (selectedCount === 0) {
            toast({ title: 'No cells selected', description: 'Select at least one cell to download' })
            return
        }

        setIsDownloading(true)

        try {
            for (const cell of selectedCells) {
                if (!cell.dataUrl) continue

                const link = document.createElement('a')
                link.href = cell.dataUrl
                link.download = `grid-cell-${cell.index + 1}-${cell.label.toLowerCase().replace(/\s+/g, '-')}.png`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                // Small delay between downloads
                await new Promise(r => setTimeout(r, 200))
            }

            toast({
                title: 'Download Complete',
                description: `Downloaded ${selectedCount} cell${selectedCount > 1 ? 's' : ''}`
            })
        } catch (error) {
            logger.shotCreator.error('Download error', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: 'Download Failed',
                description: 'An error occurred while downloading',
                variant: 'destructive'
            })
        } finally {
            setIsDownloading(false)
        }
    }, [selectedCells, selectedCount, toast])

    // Save selected cells to gallery
    const handleSaveToGallery = useCallback(async () => {
        if (selectedCount === 0) {
            toast({ title: 'No cells selected', description: 'Select at least one cell to save' })
            return
        }

        setIsSavingToGallery(true)

        try {
            let savedCount = 0

            for (const cell of selectedCells) {
                if (!cell.dataUrl) continue

                // Use the save-frame API which accepts base64 data URLs
                const saveResponse = await fetch('/api/gallery/save-frame', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        imageData: cell.dataUrl,
                        metadata: {
                            row: cell.row,
                            col: cell.col,
                            aspectRatio: '16:9',
                            width: 0, // Will be determined by the image
                            height: 0,
                        }
                    })
                })

                if (saveResponse.ok) {
                    savedCount++
                } else {
                    const errorData = await saveResponse.json().catch(() => ({}))
                    logger.shotCreator.warn('Failed to save cell', { cellIndex: cell.index + 1, error: errorData.error || saveResponse.statusText })
                }
            }

            if (savedCount > 0) {
                toast({
                    title: 'Saved to Gallery',
                    description: `${savedCount} cell${savedCount > 1 ? 's' : ''} saved to gallery`
                })

                // Refresh gallery
                setTimeout(() => {
                    useUnifiedGalleryStore.getState().refreshGallery()
                }, 500)
            } else {
                toast({
                    title: 'Save Failed',
                    description: 'No cells were saved to gallery',
                    variant: 'destructive'
                })
            }

            onOpenChange(false)
        } catch (error) {
            logger.shotCreator.error('Save to gallery error', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: 'Save Failed',
                description: 'An error occurred while saving to gallery',
                variant: 'destructive'
            })
        } finally {
            setIsSavingToGallery(false)
        }
    }, [selectedCells, selectedCount, toast, onOpenChange])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Extract Grid Cells</DialogTitle>
                    <DialogDescription>
                        Select which cells to download or save to gallery
                    </DialogDescription>
                </DialogHeader>

                {/* Loading state */}
                {isSlicing && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <LoadingSpinner size="lg" />
                        <p className="text-sm text-muted-foreground mt-4">Extracting cells...</p>
                    </div>
                )}

                {/* Error state */}
                {sliceError && (
                    <div className="text-center py-8">
                        <p className="text-destructive">{sliceError}</p>
                        <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                )}

                {/* Grid of cells */}
                {!isSlicing && !sliceError && cells.length > 0 && (
                    <div className="space-y-4">
                        {/* Selection controls */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={selectAll}>
                                    <CheckSquare className="w-4 h-4 mr-1" />
                                    Select All
                                </Button>
                                <Button variant="ghost" size="sm" onClick={selectNone}>
                                    <Square className="w-4 h-4 mr-1" />
                                    Select None
                                </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {selectedCount} of 9 selected
                            </span>
                        </div>

                        {/* 3x3 Grid */}
                        <div className="grid grid-cols-3 gap-2">
                            {cells.map((cell) => (
                                <div
                                    key={cell.index}
                                    className={`relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                        cell.selected
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                    onClick={() => toggleCell(cell.index)}
                                >
                                    {cell.dataUrl && (
                                        <img
                                            src={cell.dataUrl}
                                            alt={cell.label}
                                            className="w-full h-full object-cover"
                                        />
                                    )}

                                    {/* Selection checkbox overlay */}
                                    <div className="absolute top-2 left-2">
                                        <Checkbox
                                            checked={cell.selected}
                                            onCheckedChange={() => toggleCell(cell.index)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-background/80"
                                        />
                                    </div>

                                    {/* Label */}
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 px-2 py-1">
                                        <p className="text-xs text-white truncate">{cell.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleDownload}
                                disabled={selectedCount === 0 || isDownloading}
                            >
                                {isDownloading ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    <Download className="w-4 h-4 mr-2" />
                                )}
                                Download ({selectedCount})
                            </Button>
                            <Button
                                onClick={handleSaveToGallery}
                                disabled={selectedCount === 0 || isSavingToGallery}
                            >
                                {isSavingToGallery ? (
                                    <LoadingSpinner size="sm" className="mr-2" />
                                ) : (
                                    <ImagePlus className="w-4 h-4 mr-2" />
                                )}
                                Save to Gallery ({selectedCount})
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
