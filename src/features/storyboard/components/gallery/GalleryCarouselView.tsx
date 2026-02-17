'use client'

import { useState, useCallback, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Film, RefreshCw } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { GalleryLoadingCard } from './GalleryLoadingCard'
import { GalleryActionBar } from './GalleryActionBar'
import { GalleryPromptEditor } from './GalleryPromptEditor'
import type { GeneratedImageData, GeneratedShotPrompt, ShotBreakdownSegment } from '../../types/storyboard.types'

interface GalleryCarouselViewProps {
    segments: ShotBreakdownSegment[]
    generatedImages: Record<number, GeneratedImageData>
    generatedPrompts: GeneratedShotPrompt[]
    showCompletedOnly: boolean
    animatingShots: Set<number>
    regeneratingShots: Set<number>
    generatingBRollId: number | null
    onShotLab: (sequence: number) => void
    onPreview: (imageUrl: string) => void
    onContactSheet: (sequence: number) => void
    onBRoll: (imageUrl: string, sequence: number) => void
    onAnimate: (sequence: number) => void
    onRegenerate: (sequence: number) => void
    onRegenerateWithPrompt: (sequence: number, prompt: string) => void
    onDownload: (sequence: number) => void
    onVideoPreview: (url: string, sequence: number) => void
}

export function GalleryCarouselView({
    segments,
    generatedImages,
    generatedPrompts,
    showCompletedOnly,
    animatingShots,
    regeneratingShots,
    generatingBRollId,
    onShotLab,
    onPreview,
    onContactSheet,
    onBRoll,
    onAnimate,
    onRegenerate,
    onRegenerateWithPrompt,
    onDownload,
    onVideoPreview,
}: GalleryCarouselViewProps) {
    const filteredSegments = showCompletedOnly
        ? segments.filter(segment => {
            const img = generatedImages[segment.sequence]
            return img?.status === 'completed' && img?.imageUrl
          })
        : segments

    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'center' })
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [canScrollPrev, setCanScrollPrev] = useState(false)
    const [canScrollNext, setCanScrollNext] = useState(false)

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
        setCanScrollPrev(emblaApi.canScrollPrev())
        setCanScrollNext(emblaApi.canScrollNext())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        onSelect()
        emblaApi.on('select', onSelect)
        emblaApi.on('reInit', onSelect)
        return () => {
            emblaApi.off('select', onSelect)
            emblaApi.off('reInit', onSelect)
        }
    }, [emblaApi, onSelect])

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

    if (filteredSegments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No shots to display.</p>
            </div>
        )
    }

    const currentSegment = filteredSegments[selectedIndex]
    const currentImage = currentSegment ? generatedImages[currentSegment.sequence] : undefined
    const currentPrompt = currentSegment ? generatedPrompts.find(p => p.sequence === currentSegment.sequence) : undefined
    return (
        <div className="space-y-4">
            {/* Carousel */}
            <div className="relative">
                {/* Navigation buttons */}
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={scrollPrev}
                    disabled={!canScrollPrev}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={scrollNext}
                    disabled={!canScrollNext}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Embla carousel */}
                <div className="overflow-hidden mx-10" ref={emblaRef}>
                    <div className="flex">
                        {filteredSegments.map((segment) => {
                            const genImage = generatedImages[segment.sequence]
                            const shotPrompt = generatedPrompts.find(p => p.sequence === segment.sequence)
                            const isGenerating = genImage?.status === 'generating' || genImage?.status === 'pending'
                            const hasImage = !!genImage?.imageUrl
                            const isFailed = genImage?.status === 'failed'
                            const isAnimating = animatingShots.has(segment.sequence) || genImage?.videoStatus === 'generating'

                            return (
                                <div key={segment.sequence} className="flex-[0_0_100%] min-w-0 px-2">
                                    {/* Loading state */}
                                    {isGenerating && !hasImage ? (
                                        <GalleryLoadingCard
                                            sequence={segment.sequence}
                                            promptText={shotPrompt?.prompt}
                                            color={segment.color}
                                        />
                                    ) : (
                                        <div className="group relative">
                                            <div
                                                className="aspect-video rounded-lg border bg-muted/20 relative overflow-hidden"
                                                style={{ borderColor: segment.color }}
                                            >
                                                {hasImage ? (
                                                    <img
                                                        src={genImage!.imageUrl!}
                                                        alt={`Shot ${segment.sequence}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        {isFailed ? (
                                                            <AlertCircle className="w-10 h-10 text-destructive" />
                                                        ) : (
                                                            <CheckCircle className="w-10 h-10 text-green-500" />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Shot badge */}
                                                <Badge
                                                    className="absolute top-2 left-2 text-sm"
                                                    style={{ backgroundColor: segment.color }}
                                                >
                                                    Shot {segment.sequence}
                                                </Badge>

                                                {/* Status badges */}
                                                {genImage?.videoStatus === 'completed' && genImage?.videoUrl && (
                                                    <Badge
                                                        className="absolute top-2 right-2 text-xs bg-indigo-600/80 text-white border-0 cursor-pointer"
                                                        onClick={() => onVideoPreview(genImage.videoUrl!, segment.sequence)}
                                                    >
                                                        <Film className="w-3 h-3 mr-1" />
                                                        Video
                                                    </Badge>
                                                )}
                                                {isAnimating && (
                                                    <Badge className="absolute top-2 right-2 text-xs bg-indigo-600/80 text-white border-0">
                                                        <LoadingSpinner size="xs" color="current" className="mr-1" />
                                                        Animating
                                                    </Badge>
                                                )}

                                                {/* Failed overlay */}
                                                {isFailed && (
                                                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => onRegenerate(segment.sequence)}
                                                            disabled={regeneratingShots.has(segment.sequence)}
                                                        >
                                                            {regeneratingShots.has(segment.sequence) ? (
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
                                                        {genImage?.error && (
                                                            <p className="text-xs text-red-300 text-center px-4">{genImage.error}</p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action bar for completed shots */}
                                                {hasImage && !isFailed && (
                                                    <GalleryActionBar
                                                        sequence={segment.sequence}
                                                        imageUrl={genImage!.imageUrl!}
                                                        videoStatus={genImage?.videoStatus}
                                                        videoUrl={genImage?.videoUrl}
                                                        isAnimating={isAnimating}
                                                        isGeneratingBRoll={generatingBRollId === segment.sequence}
                                                        onShotLab={() => onShotLab(segment.sequence)}
                                                        onPreview={() => onPreview(genImage!.imageUrl!)}
                                                        onContactSheet={() => onContactSheet(segment.sequence)}
                                                        onBRoll={() => onBRoll(genImage!.imageUrl!, segment.sequence)}
                                                        onAnimate={() => onAnimate(segment.sequence)}
                                                        onDownload={() => onDownload(segment.sequence)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5">
                {filteredSegments.map((segment, index) => (
                    <button
                        key={segment.sequence}
                        className={`w-2 h-2 rounded-full transition-all ${
                            index === selectedIndex
                                ? 'w-6 bg-primary'
                                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                        }`}
                        onClick={() => emblaApi?.scrollTo(index)}
                    />
                ))}
            </div>

            {/* Prompt editor for current shot */}
            {currentSegment && currentPrompt && currentImage?.status !== 'pending' && (
                <GalleryPromptEditor
                    prompt={currentPrompt.prompt}
                    sequence={currentSegment.sequence}
                    isRegenerating={regeneratingShots.has(currentSegment.sequence)}
                    onRegenerate={(newPrompt) => {
                        if (newPrompt !== currentPrompt.prompt) {
                            onRegenerateWithPrompt(currentSegment.sequence, newPrompt)
                        } else {
                            onRegenerate(currentSegment.sequence)
                        }
                    }}
                />
            )}

            {/* Shot info */}
            {currentSegment && (
                <div className="text-xs text-muted-foreground text-center">
                    Shot {selectedIndex + 1} of {filteredSegments.length}
                    {currentPrompt?.shotType && (
                        <span className="ml-2 text-muted-foreground/70">({currentPrompt.shotType})</span>
                    )}
                </div>
            )}
        </div>
    )
}
