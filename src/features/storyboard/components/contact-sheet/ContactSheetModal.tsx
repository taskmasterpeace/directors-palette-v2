'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Grid3X3, CheckCircle, AlertCircle, Maximize2 } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { DEFAULT_CONTACT_SHEET_CONFIG, PRESET_STYLES, ANGLE_PROMPTS } from '../../types/storyboard.types'
import type { CinematicAngle, GeneratedShotPrompt } from '../../types/storyboard.types'
import {
    contactSheetServiceV2,
    ContactSheetVariant as ServiceVariant,
    ContactSheetProgress,
    ANGLE_NAMES,
    CONTACT_SHEET_TEMPLATE_PATH
} from '../../services/contact-sheet.service'

const ANGLE_LABELS: Record<CinematicAngle, string> = ANGLE_NAMES

interface ContactSheetModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shot: GeneratedShotPrompt | null
}

export function ContactSheetModal({
    open,
    onOpenChange,
    shot
}: ContactSheetModalProps) {
    const { currentStyleGuide, selectedPresetStyle, setContactSheetVariants } = useStoryboardStore()

    // Get effective style guide - preset takes precedence
    const effectiveStyleGuide = selectedPresetStyle
        ? {
            id: `preset-${selectedPresetStyle}`,
            user_id: '',
            name: PRESET_STYLES.find(s => s.id === selectedPresetStyle)?.name || '',
            style_prompt: PRESET_STYLES.find(s => s.id === selectedPresetStyle)?.stylePrompt,
            reference_image_url: PRESET_STYLES.find(s => s.id === selectedPresetStyle)?.imagePath,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
        : currentStyleGuide

    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState<ContactSheetProgress>({ total: 2, current: 0, status: 'idle' })
    const [variants, setVariants] = useState<ServiceVariant[]>([])
    const [gridImageUrl, setGridImageUrl] = useState<string | null>(null)
    const [showFullGrid, setShowFullGrid] = useState(false)

    // Settings
    const [useTemplateReference, setUseTemplateReference] = useState(true)
    const [aspectRatio, setAspectRatio] = useState('1:1')
    const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K')

    // Set up progress callback
    useEffect(() => {
        contactSheetServiceV2.setProgressCallback(setProgress)
    }, [])

    // Reset state when modal opens with new shot
    useEffect(() => {
        if (open && shot) {
            setVariants([])
            setGridImageUrl(null)
            setShowFullGrid(false)
            setProgress({ total: 2, current: 0, status: 'idle' })
            contactSheetServiceV2.resetProgress()
        }
    }, [open, shot])

    // Build 9 variants based on grid configuration (for preview)
    const buildPreviewVariants = (): ServiceVariant[] => {
        if (!shot) return []
        const config = DEFAULT_CONTACT_SHEET_CONFIG
        const allAngles = [
            ...config.rows.row_1,
            ...config.rows.row_2,
            ...config.rows.row_3
        ]

        return allAngles.map((angle, index) => ({
            position: index + 1,
            angle,
            anglePrompt: ANGLE_PROMPTS[angle],
            fullPrompt: `${ANGLE_PROMPTS[angle]}, ${shot.prompt}${effectiveStyleGuide?.style_prompt ? `, ${effectiveStyleGuide.style_prompt}` : ''}`,
            status: 'pending' as const
        }))
    }

    const handleGenerateContactSheet = async () => {
        if (!shot) return

        setIsGenerating(true)

        try {
            // Use V2 service: generates ONE grid image then slices it (much cheaper!)
            const result = await contactSheetServiceV2.generateGridContactSheet(
                shot,
                { aspectRatio: '1:1', resolution, useTemplateReference }, // Force 1:1 for grid
                effectiveStyleGuide || undefined
            )
            setVariants(result.variants)
            if (result.gridImageUrl) {
                setGridImageUrl(result.gridImageUrl)
            }

            // Save variants to store
            const storeVariants = result.variants.map((v) => ({
                id: `variant-${shot.sequence}-${v.position}`,
                storyboard_shot_id: String(shot.sequence),
                position: v.position,
                angle_type: v.angle,
                prompt: v.fullPrompt,
                status: v.status === 'completed' ? 'completed' as const : 'failed' as const,
                created_at: new Date().toISOString()
            }))

            setContactSheetVariants(storeVariants)
        } catch (error) {
            console.error('Contact sheet generation failed:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const progressPercent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

    if (!shot) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Grid3X3 className="w-5 h-5" />
                        3x3 Contact Sheet - Shot {shot.sequence}
                    </DialogTitle>
                    <DialogDescription>
                        Generate a single 3x3 grid with 9 camera angles, then auto-slice into cells
                        <Badge variant="outline" className="ml-2 text-[10px]">Cost: ~20 tokens</Badge>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Original Shot */}
                    <div className="p-3 rounded-lg bg-muted/30 border">
                        <p className="text-sm font-medium mb-1">Original Shot Prompt:</p>
                        <p className="text-sm text-muted-foreground">{shot.prompt}</p>
                        {effectiveStyleGuide && (
                            <Badge variant="outline" className="mt-2">
                                Style: {effectiveStyleGuide.name}
                            </Badge>
                        )}
                    </div>

                    {/* Generation Settings */}
                    {variants.length === 0 && (
                        <div className="grid grid-cols-3 gap-4 p-3 rounded-lg border bg-card/50">
                            <div className="space-y-2">
                                <Label>Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                        <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                        <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Resolution</Label>
                                <Select value={resolution} onValueChange={(v) => setResolution(v as '1K' | '2K' | '4K')}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1K">1K</SelectItem>
                                        <SelectItem value="2K">2K</SelectItem>
                                        <SelectItem value="4K">4K</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2 self-end pb-2">
                                <Switch
                                    id="use-template"
                                    checked={useTemplateReference}
                                    onCheckedChange={setUseTemplateReference}
                                />
                                <Label htmlFor="use-template" className="text-sm">
                                    Use Template
                                </Label>
                            </div>
                        </div>
                    )}

                    {/* Template Preview */}
                    {useTemplateReference && variants.length === 0 && (
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={CONTACT_SHEET_TEMPLATE_PATH}
                                alt="Contact Sheet Template"
                                className="w-20 h-20 object-cover rounded"
                            />
                            <div>
                                <p className="text-sm font-medium text-amber-500">Template Reference Enabled</p>
                                <p className="text-xs text-muted-foreground">
                                    The 3x3 grid template will be used as a reference for composition
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress */}
                    {isGenerating && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {progress.current === 1 ? 'Generating 3x3 grid...' : 'Slicing grid into cells...'}
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={gridImageUrl}
                                alt="Full 3x3 grid"
                                className="w-full"
                            />
                        </div>
                    )}

                    {/* 3x3 Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {(variants.length > 0 ? variants : buildPreviewVariants()).map((variant, index) => (
                            <div
                                key={index}
                                className="aspect-square rounded-lg border bg-muted/20 flex flex-col items-center justify-center p-2 relative overflow-hidden"
                            >
                                {variant.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={variant.imageUrl}
                                        alt={ANGLE_LABELS[variant.angle]}
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <div className="text-center">
                                        {variant.status === 'generating' ? (
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        ) : variant.status === 'completed' ? (
                                            <div className="text-center">
                                                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
                                                {variant.predictionId && (
                                                    <p className="text-[10px] text-muted-foreground truncate max-w-full px-1">
                                                        {variant.predictionId.slice(0, 8)}...
                                                    </p>
                                                )}
                                            </div>
                                        ) : variant.status === 'failed' ? (
                                            <div className="text-center">
                                                <AlertCircle className="w-6 h-6 mx-auto text-destructive mb-1" />
                                                <p className="text-[10px] text-destructive">Failed</p>
                                            </div>
                                        ) : (
                                            <Grid3X3 className="w-6 h-6 mx-auto text-muted-foreground/30" />
                                        )}
                                    </div>
                                )}
                                <Badge
                                    variant="secondary"
                                    className="absolute bottom-1 left-1 text-[10px] px-1"
                                >
                                    {ANGLE_LABELS[variant.angle]}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    {/* Grid Legend */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div className="text-center font-medium">Row 1: Wide Shots</div>
                        <div className="text-center font-medium">Row 2: Core Shots</div>
                        <div className="text-center font-medium">Row 3: Detail Shots</div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        {variants.length === 0 ? (
                            <Button
                                onClick={handleGenerateContactSheet}
                                disabled={isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Grid3X3 className="w-4 h-4 mr-2" />
                                        Generate 9 Angles
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGenerateContactSheet}
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
