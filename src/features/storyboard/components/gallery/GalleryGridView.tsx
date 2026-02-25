'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { GalleryShotCard } from './GalleryShotCard'
import type { GeneratedImageData, GeneratedShotPrompt, ShotBreakdownSegment } from '../../types/storyboard.types'
import type { ContactSheetVariant } from '../../types/storyboard.types'

interface GalleryGridViewProps {
    segments: ShotBreakdownSegment[]
    generatedImages: Record<number, GeneratedImageData>
    generatedPrompts: GeneratedShotPrompt[]
    contactSheetVariants: ContactSheetVariant[]
    showCompletedOnly: boolean
    animatingShots: Set<number>
    regeneratingShots: Set<number>
    generatingBRollId: number | null
    onPreview: (imageUrl: string) => void
    onContactSheet: (sequence: number) => void
    onBRoll: (imageUrl: string, sequence: number) => void
    onAnimate: (sequence: number) => void
    onRegenerate: (sequence: number) => void
    onDownload: (sequence: number) => void
    onVideoPreview: (url: string, sequence: number) => void
}

export function GalleryGridView({
    segments,
    generatedImages,
    generatedPrompts,
    contactSheetVariants,
    showCompletedOnly,
    animatingShots,
    regeneratingShots,
    generatingBRollId,
    onPreview,
    onContactSheet,
    onBRoll,
    onAnimate,
    onRegenerate,
    onDownload,
    onVideoPreview,
}: GalleryGridViewProps) {
    const filteredSegments = showCompletedOnly
        ? segments.filter(segment => {
            const img = generatedImages[segment.sequence]
            return img?.status === 'completed' && img?.imageUrl
          })
        : segments

    return (
        <ScrollArea className="h-[500px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredSegments.map((segment) => {
                    const shotId = `shot-${segment.sequence}`
                    const hasVariants = contactSheetVariants.some(v => v.storyboard_shot_id === shotId)
                    const generatedImage = generatedImages[segment.sequence]
                    const shotPrompt = generatedPrompts.find(p => p.sequence === segment.sequence)
                    const isAnimating = animatingShots.has(segment.sequence) || generatedImage?.videoStatus === 'generating'

                    return (
                        <GalleryShotCard
                            key={segment.sequence}
                            segment={segment}
                            generatedImage={generatedImage}
                            shotPrompt={shotPrompt}
                            hasVariants={hasVariants}
                            isAnimating={isAnimating}
                            isRegenerating={regeneratingShots.has(segment.sequence)}
                            isGeneratingBRoll={generatingBRollId === segment.sequence}
                            onPreview={() => onPreview(generatedImage?.imageUrl || '')}
                            onContactSheet={() => onContactSheet(segment.sequence)}
                            onBRoll={() => onBRoll(generatedImage?.imageUrl || '', segment.sequence)}
                            onAnimate={() => onAnimate(segment.sequence)}
                            onRegenerate={() => onRegenerate(segment.sequence)}
                            onDownload={() => onDownload(segment.sequence)}
                            onVideoPreview={(url) => onVideoPreview(url, segment.sequence)}
                        />
                    )
                })}
            </div>
        </ScrollArea>
    )
}
