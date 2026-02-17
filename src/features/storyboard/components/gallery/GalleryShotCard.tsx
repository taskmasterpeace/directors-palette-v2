'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { CheckCircle, AlertCircle, Film, Grid3X3, Users, RefreshCw } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GalleryLoadingCard } from './GalleryLoadingCard'
import { GalleryActionBar } from './GalleryActionBar'
import type { GeneratedImageData, GeneratedShotPrompt, ShotBreakdownSegment } from '../../types/storyboard.types'

interface GalleryShotCardProps {
    segment: ShotBreakdownSegment
    generatedImage?: GeneratedImageData
    shotPrompt?: GeneratedShotPrompt
    hasVariants: boolean
    isAnimating: boolean
    isRegenerating: boolean
    isGeneratingBRoll: boolean
    onShotLab: () => void
    onPreview: () => void
    onContactSheet: () => void
    onBRoll: () => void
    onAnimate: () => void
    onRegenerate: () => void
    onDownload: () => void
    onVideoPreview: (url: string) => void
}

export function GalleryShotCard({
    segment,
    generatedImage,
    shotPrompt,
    hasVariants,
    isAnimating,
    isRegenerating,
    isGeneratingBRoll,
    onShotLab,
    onPreview,
    onContactSheet,
    onBRoll,
    onAnimate,
    onRegenerate,
    onDownload,
    onVideoPreview,
}: GalleryShotCardProps) {
    const isFailed = generatedImage?.status === 'failed'
    const hasImage = !!generatedImage?.imageUrl
    const isGenerating = generatedImage?.status === 'generating' || generatedImage?.status === 'pending'

    // Loading state - violet glow card
    if (isGenerating && !hasImage) {
        return (
            <GalleryLoadingCard
                sequence={segment.sequence}
                promptText={shotPrompt?.prompt}
                color={segment.color}
            />
        )
    }

    return (
        <div className="group relative">
            <div
                className="aspect-video rounded-lg border bg-muted/20 flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
                style={{ borderColor: segment.color }}
            >
                {/* Image or placeholder */}
                {hasImage ? (
                    <>
                        <img
                            src={generatedImage!.imageUrl!}
                            alt={`Shot ${segment.sequence}`}
                            className="w-full h-full object-cover"
                        />
                        {/* Prompt overlay */}
                        {shotPrompt && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-[11px] text-white/90 line-clamp-1 pointer-events-auto group-hover:opacity-0 transition-opacity">
                                            {shotPrompt.prompt}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[320px] text-xs">
                                        {shotPrompt.prompt}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </>
                ) : (
                    <div className="text-center p-2">
                        {isFailed ? (
                            <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
                        ) : generatedImage?.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                        ) : null}
                        <Badge className="mt-2" style={{ backgroundColor: segment.color }}>
                            Shot {segment.sequence}
                        </Badge>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {segment.text.slice(0, 50)}...
                        </p>
                    </div>
                )}

                {/* Shot number badge */}
                <Badge
                    className="absolute top-1 left-1 text-xs"
                    style={{ backgroundColor: segment.color }}
                >
                    {segment.sequence}
                </Badge>

                {/* Character badges */}
                {shotPrompt?.characterRefs?.length ? (
                    <div className="absolute top-1 left-8 flex gap-0.5 group-hover:opacity-0 transition-opacity">
                        {shotPrompt.characterRefs.slice(0, 3).map(c => (
                            <Badge
                                key={c.id}
                                variant="secondary"
                                className="text-[9px] py-0 px-1 bg-black/60 text-white/90 border-none"
                            >
                                {c.reference_image_url ? (
                                    <img src={c.reference_image_url} alt={c.name} className="w-3 h-3 rounded-full object-cover mr-0.5 inline-block" />
                                ) : (
                                    <Users className="w-2.5 h-2.5 mr-0.5" />
                                )}
                                {c.name}
                            </Badge>
                        ))}
                        {shotPrompt.characterRefs.length > 3 && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-black/60 text-white/90 border-none">
                                +{shotPrompt.characterRefs.length - 3}
                            </Badge>
                        )}
                    </div>
                ) : null}

                {/* Status indicator */}
                {generatedImage && (
                    <div className="absolute top-1 right-1">
                        {generatedImage.status === 'completed' && generatedImage.imageUrl && (
                            <Badge variant="secondary" className="text-xs bg-green-500/80">
                                <CheckCircle className="w-3 h-3" />
                            </Badge>
                        )}
                        {generatedImage.status === 'generating' && (
                            <Badge variant="secondary" className="text-xs">
                                <LoadingSpinner size="xs" color="current" />
                            </Badge>
                        )}
                        {generatedImage.status === 'failed' && (
                            <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="w-3 h-3" />
                            </Badge>
                        )}
                    </div>
                )}

                {/* Video ready badge */}
                {generatedImage?.videoStatus === 'completed' && generatedImage?.videoUrl && (
                    <Badge
                        className="absolute top-1 right-8 text-xs bg-indigo-600/80 text-white border-0 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation()
                            onVideoPreview(generatedImage.videoUrl!)
                        }}
                    >
                        <Film className="w-3 h-3 mr-1" />
                        Video
                    </Badge>
                )}

                {/* Animating spinner badge */}
                {isAnimating && (
                    <Badge className="absolute top-1 right-8 text-xs bg-indigo-600/80 text-white border-0">
                        <LoadingSpinner size="xs" color="current" className="mr-1" />
                        Animating
                    </Badge>
                )}

                {hasVariants && (
                    <Badge
                        variant="secondary"
                        className="absolute bottom-1 right-1 text-xs group-hover:opacity-0 transition-opacity"
                    >
                        <Grid3X3 className="w-3 h-3 mr-1" />
                        3x3
                    </Badge>
                )}

                {/* Failed shot: retry overlay */}
                {isFailed && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                        >
                            {isRegenerating ? (
                                <>
                                    <LoadingSpinner size="sm" color="current" className="mr-1" />
                                    Retrying...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-1" />
                                    Retry Shot
                                </>
                            )}
                        </Button>
                        {generatedImage?.error && (
                            <p className="text-xs text-red-300 text-center px-2 max-w-[90%]">
                                {generatedImage.error}
                            </p>
                        )}
                    </div>
                )}

                {/* Completed shot: action toolbar */}
                {hasImage && !isFailed && (
                    <GalleryActionBar
                        sequence={segment.sequence}
                        imageUrl={generatedImage!.imageUrl!}
                        videoStatus={generatedImage?.videoStatus}
                        videoUrl={generatedImage?.videoUrl}
                        isAnimating={isAnimating}
                        isGeneratingBRoll={isGeneratingBRoll}
                        onShotLab={onShotLab}
                        onPreview={onPreview}
                        onContactSheet={onContactSheet}
                        onBRoll={onBRoll}
                        onAnimate={onAnimate}
                        onDownload={onDownload}
                    />
                )}
            </div>
        </div>
    )
}
