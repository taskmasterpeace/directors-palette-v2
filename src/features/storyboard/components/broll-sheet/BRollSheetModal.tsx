'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Film, CheckCircle, AlertCircle, Maximize2, Layers } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BROLL_NAMES } from '../../types/storyboard.types'
import {
    brollSheetService,
    BRollVariant,
    BRollSheetProgress
} from '../../services/broll-sheet.service'
import { TOKENS_PER_IMAGE } from '../../constants/generation.constants'

interface BRollSheetModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    referenceImageUrl: string | null
    shotNumber?: number
}

export function BRollSheetModal({
    open,
    onOpenChange,
    referenceImageUrl,
    shotNumber
}: BRollSheetModalProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState<BRollSheetProgress>({ total: 2, current: 0, status: 'idle' })
    const [variants, setVariants] = useState<BRollVariant[]>([])
    const [gridImageUrl, setGridImageUrl] = useState<string | null>(null)
    const [showFullGrid, setShowFullGrid] = useState(false)

    // Settings
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K')

    // Set up progress callback
    useEffect(() => {
        brollSheetService.setProgressCallback(setProgress)
    }, [])

    // Reset state when modal opens with new reference
    useEffect(() => {
        if (open && referenceImageUrl) {
            setVariants([])
            setGridImageUrl(null)
            setShowFullGrid(false)
            setProgress({ total: 2, current: 0, status: 'idle' })
            brollSheetService.resetProgress()
        }
    }, [open, referenceImageUrl])

    // Build preview variants
    const buildPreviewVariants = (): BRollVariant[] => {
        return brollSheetService.buildPreviewVariants()
    }

    const handleGenerateBRollSheet = async () => {
        if (!referenceImageUrl) return

        setIsGenerating(true)

        try {
            const result = await brollSheetService.generateBRollGrid(
                referenceImageUrl,
                { aspectRatio: '16:9', resolution }
            )
            setVariants(result.variants)
            if (result.gridImageUrl) {
                setGridImageUrl(result.gridImageUrl)
            }
        } catch (error) {
            console.error('B-Roll sheet generation failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    if (!referenceImageUrl) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film className="w-5 h-5" />
                        B-Roll Grid {shotNumber ? `- Shot ${shotNumber}` : ''}
                    </DialogTitle>
                    <DialogDescription>
                        Generate 9 complementary B-roll shots that maintain visual continuity
                        <Badge variant="outline" className="ml-2 text-xs">Cost: ~{TOKENS_PER_IMAGE} tokens</Badge>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Reference Image Preview */}
                    <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 border">
                        <img
                            src={referenceImageUrl}
                            alt="Reference"
                            className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Reference Image</p>
                            <p className="text-xs text-muted-foreground">
                                All 9 B-roll shots will match the color, lighting, and setting of this image.
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                    <Layers className="w-3 h-3 mr-1" />
                                    Visual Continuity
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Generation Settings */}
                    {variants.length === 0 && (
                        <div className="flex items-end gap-4 p-3 rounded-lg border bg-card/50">
                            <div className="space-y-2">
                                <Label>Resolution</Label>
                                <Select value={resolution} onValueChange={(v) => setResolution(v as '1K' | '2K' | '4K')}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="4K">4K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">
                                    B-roll shots: establishing, foreground, background, object, texture, action, ambient, symbol, context
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {isGenerating && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <LoadingSpinner size="sm" />
                                    {progress.status === 'generating' ? 'Generating B-roll grid...' : 'Slicing grid into cells...'}
                                </span>
                                <span>Step {progress.current} / {progress.total}</span>
                            </div>
                            <Progress value={progressPercent} />
                        </div>
                    )}

                    {/* Full Grid Preview Button */}
                    {gridImageUrl && variants.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFullGrid(!showFullGrid)}
                            >
                                <Maximize2 className="w-4 h-4 mr-1" />
                                {showFullGrid ? 'Hide' : 'View'} Full Grid
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                Click to see the original generated grid
                            </span>
                        </div>
                    )}

                    {/* Full Grid Image Display */}
                    {showFullGrid && gridImageUrl && (
                        <div className="rounded-lg border overflow-hidden">
                            <img
                                src={gridImageUrl}
                                alt="Full B-roll grid"
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* 3x3 Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {(variants.length > 0 ? variants : buildPreviewVariants()).map((variant, index) => (
                            <div
                                key={index}
                                className="aspect-square rounded-lg border bg-muted/20 flex flex-col items-center justify-center p-2 relative overflow-hidden group"
                            >
                                {variant.imageUrl ? (
                                    <>
                                        <img
                                            src={variant.imageUrl}
                                            alt={BROLL_NAMES[variant.shotType]}
                                            className="w-full h-full object-cover rounded"
                                        />
                                        {/* Hover overlay with description */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                                            <p className="text-xs text-white text-center">
                                                {variant.description}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        {variant.status === 'generating' ? (
                                            <LoadingSpinner size="md" className="mx-auto" />
                                        ) : variant.status === 'completed' ? (
                                            <div className="text-center">
                                                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
                                            </div>
                                        ) : variant.status === 'failed' ? (
                                            <div className="text-center">
                                                <AlertCircle className="w-6 h-6 mx-auto text-destructive mb-1" />
                                                <p className="text-xs text-destructive">Failed</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Film className="w-6 h-6 mx-auto text-muted-foreground/30 mb-1" />
                                                <p className="text-xs text-muted-foreground text-center px-1 line-clamp-2">
                                                    {variant.description.slice(0, 40)}...
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                                {/* Shot type label */}
                                <Badge
                                    variant="secondary"
                                    className="absolute bottom-1 left-1 text-xs px-1"
                                >
                                    {BROLL_NAMES[variant.shotType]}
                                </Badge>
                                {/* B-roll indicator */}
                                <Badge
                                    variant="secondary"
                                    className="absolute top-1 right-1 text-xs px-1"
                                >
                                    B
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Grid Legend */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div className="text-center font-medium">Row 1: Environment</div>
                        <div className="text-center font-medium">Row 2: Details</div>
                        <div className="text-center font-medium">Row 3: Atmosphere</div>
                    </div>

                    {/* B-Roll vs Contact Sheet Explanation */}
                    {variants.length === 0 && (
                        <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                            <p className="font-medium mb-1">B-Roll vs Angles</p>
                            <p className="text-muted-foreground text-xs">
                                <strong>Angles</strong>: Same scene, different <em>camera angles</em> (wide, medium, close-up)<br />
                                <strong>B-Roll</strong>: Different <em>scene elements</em> that match the visual style (props, textures, environment)
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        {variants.length === 0 ? (
                            <Button
                                onClick={handleGenerateBRollSheet}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <LoadingSpinner size="sm" color="current" className="mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Film className="w-4 h-4 mr-2" />
                                        Generate 9 B-Roll Shots
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGenerateBRollSheet}
                                disabled={isGenerating}
                                variant="secondary"
                            >
                                Regenerate All
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
