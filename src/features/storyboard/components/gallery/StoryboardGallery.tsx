'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Images, Film, Grid3X3, CheckCircle, AlertCircle, Eye, Download, Clock, RefreshCw, Layers, FlaskConical, Archive, Users, Wand2, Play } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getClient } from '@/lib/db/client'
import { BRollGenerator } from '../broll/BRollGenerator'
import { ContactSheetModal } from '../contact-sheet/ContactSheetModal'
import { storyboardGenerationService } from '../../services/storyboard-generation.service'
import { toast } from 'sonner'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { TOKENS_PER_IMAGE } from '../../constants/generation.constants'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'
import { ShotAnimationService } from '../../services/shot-animation.service'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import JSZip from 'jszip'

interface StoryboardGalleryProps {
    chapterIndex?: number
}

export function StoryboardGallery({ chapterIndex = 0 }: StoryboardGalleryProps) {
    const {
        breakdownResult,
        brollShots,
        contactSheetVariants,
        generatedImages,
        generatedPrompts,
        chapters,
        setInternalTab,
        setGeneratedImage,
        currentStyleGuide,
        characters,
        locations,
        generationSettings,
        openShotLab,
        selectedDirectorId,
        setVideoStatus,
        setAnimationPrompt,
    } = useStoryboardStore()

    const { user } = useAuth()
    const { balance, fetchBalance } = useCreditsStore()
    const [regeneratingShots, setRegeneratingShots] = useState<Set<number>>(new Set())
    const [isRegeneratingFailed, setIsRegeneratingFailed] = useState(false)
    const [animatingShots, setAnimatingShots] = useState<Set<number>>(new Set())
    const [videoPreview, setVideoPreview] = useState<{ url: string; sequence: number } | null>(null)

    // Supabase realtime subscription for video status updates
    useEffect(() => {
        if (!user) return

        // Collect gallery IDs for shots with generating video status
        const generatingEntries: { sequence: number; predictionId: string }[] = []
        for (const [seq, img] of Object.entries(generatedImages)) {
            if (img.videoStatus === 'generating' && img.videoPredictionId) {
                generatingEntries.push({ sequence: Number(seq), predictionId: img.videoPredictionId })
            }
        }

        if (generatingEntries.length === 0) return

        let subscription: { unsubscribe: () => void } | null = null

        const setupSubscription = async () => {
            const supabase = await getClient()
            if (!supabase) return

            subscription = supabase
                .channel(`storyboard-videos-${Date.now()}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'gallery',
                    },
                    (payload) => {
                        const updatedRecord = payload.new as { id: string; public_url?: string; metadata?: Record<string, unknown> }

                        // Find which sequence this gallery record belongs to
                        for (const [seq, img] of Object.entries(generatedImages)) {
                            if (img.videoPredictionId && img.videoStatus === 'generating') {
                                // Match by checking metadata for prediction ID or by gallery record
                                const metadata = updatedRecord.metadata as Record<string, unknown> | undefined
                                const recordPredictionId = metadata?.prediction_id || metadata?.predictionId

                                if (recordPredictionId === img.videoPredictionId) {
                                    const sequence = Number(seq)
                                    if (updatedRecord.public_url) {
                                        setVideoStatus(sequence, 'completed', updatedRecord.public_url)
                                        toast.success(`Shot ${sequence} video ready!`)
                                    } else if (metadata?.error) {
                                        setVideoStatus(sequence, 'failed', undefined, String(metadata.error))
                                        toast.error(`Shot ${sequence} video failed`, { description: String(metadata.error) })
                                    }
                                    return
                                }
                            }
                        }
                    }
                )
                .subscribe()
        }

        setupSubscription()

        return () => {
            if (subscription) {
                subscription.unsubscribe()
            }
        }
    }, [user, generatedImages, setVideoStatus])

    // Filter segments by chapter
    // chapterIndex of -1 means "All Chapters" view - show all segments
    const filteredSegments = useMemo(() => {
        if (!breakdownResult?.segments) return []
        if (!chapters || chapters.length === 0) return breakdownResult.segments

        // "All Chapters" view - show all segments
        if (chapterIndex < 0) return breakdownResult.segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return breakdownResult.segments
        }

        return breakdownResult.segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex])

    const [selectedShot, setSelectedShot] = useState<GeneratedShotPrompt | null>(null)
    const [contactSheetOpen, setContactSheetOpen] = useState(false)
    const [generatingBRollId, setGeneratingBRollId] = useState<number | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isDownloadingAll, setIsDownloadingAll] = useState(false)
    const [showCompletedOnly, setShowCompletedOnly] = useState(true)

    const handleDownloadAll = async () => {
        const completedImages = Object.entries(generatedImages)
            .filter(([, img]) => img.status === 'completed' && img.imageUrl)
            .map(([seq, img]) => ({ sequence: Number(seq), url: img.imageUrl! }))

        if (completedImages.length === 0) {
            toast.info('No completed images to download')
            return
        }

        setIsDownloadingAll(true)
        try {
            const zip = new JSZip()
            let skipped = 0
            for (const { sequence, url } of completedImages) {
                try {
                    const response = await fetch(url)
                    if (!response.ok) throw new Error(`HTTP ${response.status}`)
                    const blob = await response.blob()
                    const ext = blob.type.includes('png') ? 'png' : 'jpg'
                    zip.file(`shot-${sequence}.${ext}`, blob)
                } catch {
                    skipped++
                }
            }
            if (skipped > 0) {
                toast.warning(`${skipped} image(s) failed to download and were skipped`)
            }
            const added = completedImages.length - skipped
            if (added === 0) {
                toast.error('No images could be downloaded')
                return
            }
            const content = await zip.generateAsync({ type: 'blob' })
            const link = document.createElement('a')
            link.href = URL.createObjectURL(content)
            link.download = 'storyboard-shots.zip'
            link.click()
            URL.revokeObjectURL(link.href)
            toast.success(`Downloaded ${added} shots as ZIP`)
        } catch (error) {
            console.error('ZIP download error:', error)
            toast.error('Failed to create ZIP download')
        } finally {
            setIsDownloadingAll(false)
        }
    }

    const handleOpenContactSheet = (sequence: number) => {
        const shot = generatedPrompts.find(p => p.sequence === sequence)
        if (shot) {
            setSelectedShot(shot)
            setContactSheetOpen(true)
        }
    }

    const handleGenerateBRollGrid = async (imageUrl: string, sequence: number) => {
        if (generatingBRollId !== null) return // Prevent concurrent generations

        setGeneratingBRollId(sequence)
        toast.info('Generating B-Roll Grid...', { description: 'Creating 9 complementary B-roll shots.' })

        try {
            const brollPrompt = `A 3x3 grid collage of 9 different B-roll shots that complement and extend the provided reference image.

IMPORTANT: Use the provided reference image to match the exact color palette, lighting conditions, and visual setting. All 9 cells should feel like they belong to the same scene.

The grid layout is:
TOP ROW (Environment): establishing wide shot with no people, foreground detail close-up, background element with depth
MIDDLE ROW (Details): key object/prop extreme close-up, texture/material macro shot, hands or action insert
BOTTOM ROW (Atmosphere): ambient background activity, symbolic/thematic element, architectural framing element

Each cell shows a different element from the same visual world - not different angles of the same subject, but different subjects that share the same look and feel. Clear separation between cells with thin borders. Professional cinematography B-roll reference sheet style.

The color temperature, lighting direction, and overall mood must match across all 9 cells, creating a cohesive visual palette.`

            const response = await fetch('/api/generation/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: generationSettings.imageModel || 'nano-banana-pro',
                    prompt: brollPrompt,
                    referenceImages: [{ url: imageUrl, weight: 0.8 }],
                    modelSettings: {
                        aspectRatio: '16:9',
                        resolution: '2K'
                    },
                    extraMetadata: {
                        source: 'storyboard',
                        assetType: 'b-roll-grid',
                        isGrid: true,
                        gridType: 'broll',
                    },
                })
            })

            const result = await safeJsonParse(response)

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate B-roll grid')
            }

            toast.success('B-Roll Grid Generated!', { description: "Use 'Extract to Gallery' to split into individual shots." })
        } catch (error) {
            console.error('B-Roll grid generation error:', error)
            toast.error('Generation Failed', { description: error instanceof Error ? error.message : 'An error occurred' })
        } finally {
            setGeneratingBRollId(null)
        }
    }

    // Animate a shot (build dual-layer prompt + dispatch video generation)
    const handleAnimateShot = async (sequence: number) => {
        const imageData = generatedImages[sequence]
        const shotPrompt = generatedPrompts.find(p => p.sequence === sequence)
        if (!imageData?.imageUrl || !shotPrompt) return

        // If video already exists, show it
        if (imageData.videoUrl && imageData.videoStatus === 'completed') {
            setVideoPreview({ url: imageData.videoUrl, sequence })
            return
        }

        if (animatingShots.has(sequence)) return

        const director = selectedDirectorId
            ? DIRECTORS.find(d => d.id === selectedDirectorId)
            : undefined

        // Build the dual-layer animation prompt
        const animPrompt = ShotAnimationService.buildAnimationPrompt(
            shotPrompt.originalText,
            shotPrompt.prompt,
            shotPrompt.shotType,
            director
        )

        setAnimatingShots(prev => new Set(prev).add(sequence))
        setAnimationPrompt(sequence, animPrompt)
        setVideoStatus(sequence, 'generating')

        try {
            const result = await ShotAnimationService.animateShot({
                sequence,
                imageUrl: imageData.imageUrl,
                animationPrompt: animPrompt,
                model: 'seedance-lite',
                duration: 5,
            })

            // Store prediction ID for polling (realtime subscription will update status)
            setGeneratedImage(sequence, {
                ...generatedImages[sequence],
                videoPredictionId: result.predictionId,
                videoStatus: 'generating',
                animationPrompt: animPrompt,
            })
            toast.success(`Shot ${sequence} animation started`, {
                description: 'Video will appear when rendering completes.'
            })
        } catch (error) {
            setVideoStatus(sequence, 'failed', undefined, error instanceof Error ? error.message : 'Animation failed')
            toast.error(`Animation failed for shot ${sequence}`, {
                description: error instanceof Error ? error.message : 'Unknown error'
            })
        } finally {
            setAnimatingShots(prev => {
                const next = new Set(prev)
                next.delete(sequence)
                return next
            })
        }
    }

    // Regenerate a single shot
    const handleRegenerateSingleShot = async (sequence: number) => {
        const shot = generatedPrompts.find(p => p.sequence === sequence)
        if (!shot) return

        // Credit check
        try {
            await fetchBalance()
        } catch {
            // Continue anyway
        }

        if (balance < TOKENS_PER_IMAGE) {
            toast.error(`Insufficient credits. Need ${TOKENS_PER_IMAGE} tokens.`)
            return
        }

        setRegeneratingShots(prev => new Set(prev).add(sequence))
        setGeneratedImage(sequence, { ...generatedImages[sequence], status: 'generating', error: undefined })

        try {
            const results = await storyboardGenerationService.generateShotsFromPrompts(
                [shot],
                {
                    model: generationSettings.imageModel || 'nano-banana-pro',
                    aspectRatio: generationSettings.aspectRatio,
                    resolution: generationSettings.resolution
                },
                currentStyleGuide || undefined,
                characters,
                locations
            )

            const result = results[0]
            if (result) {
                setGeneratedImage(sequence, {
                    predictionId: result.predictionId,
                    imageUrl: result.imageUrl,
                    status: result.error ? 'failed' : 'completed',
                    error: result.error,
                    generationTimestamp: new Date().toISOString()
                })
                if (!result.error) {
                    toast.success(`Shot ${sequence} regenerated successfully`)
                }
            }
        } catch (error) {
            setGeneratedImage(sequence, {
                ...generatedImages[sequence],
                status: 'failed',
                error: error instanceof Error ? error.message : 'Regeneration failed'
            })
            toast.error(`Failed to regenerate shot ${sequence}`)
        } finally {
            setRegeneratingShots(prev => {
                const next = new Set(prev)
                next.delete(sequence)
                return next
            })
        }
    }

    // Regenerate all failed shots
    const handleRegenerateFailedShots = async () => {
        const failedShots = generatedPrompts.filter(
            p => generatedImages[p.sequence]?.status === 'failed'
        )

        if (failedShots.length === 0) {
            toast.info('No failed shots to regenerate')
            return
        }

        // Credit check
        const totalCost = failedShots.length * TOKENS_PER_IMAGE
        try {
            await fetchBalance()
        } catch {
            // Continue anyway
        }

        if (balance < totalCost) {
            toast.error(`Insufficient credits. Need ${totalCost} tokens for ${failedShots.length} shots.`)
            return
        }

        const confirmed = confirm(
            `Regenerate ${failedShots.length} failed shots for approximately ${totalCost} tokens?`
        )
        if (!confirmed) return

        setIsRegeneratingFailed(true)

        for (const shot of failedShots) {
            setGeneratedImage(shot.sequence, { ...generatedImages[shot.sequence], status: 'generating', error: undefined })

            try {
                const results = await storyboardGenerationService.generateShotsFromPrompts(
                    [shot],
                    {
                        model: generationSettings.imageModel || 'nano-banana-pro',
                        aspectRatio: generationSettings.aspectRatio,
                        resolution: generationSettings.resolution
                    },
                    currentStyleGuide || undefined,
                    characters,
                    locations
                )

                const result = results[0]
                if (result) {
                    setGeneratedImage(shot.sequence, {
                        predictionId: result.predictionId,
                        imageUrl: result.imageUrl,
                        status: result.error ? 'failed' : 'completed',
                        error: result.error,
                        generationTimestamp: new Date().toISOString()
                    })
                }
            } catch (error) {
                setGeneratedImage(shot.sequence, {
                    ...generatedImages[shot.sequence],
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Regeneration failed'
                })
            }
        }

        setIsRegeneratingFailed(false)

        const stillFailed = Object.values(generatedImages).filter(img => img.status === 'failed').length
        if (stillFailed === 0) {
            toast.success('All shots regenerated successfully!')
        } else {
            toast.warning(`${stillFailed} shots still failed`)
        }
    }

    const generatedCount = Object.values(generatedImages).filter(img => img.status === 'completed').length
    const pendingCount = Object.values(generatedImages).filter(img => img.status === 'pending' || img.status === 'generating').length
    const failedCount = Object.values(generatedImages).filter(img => img.status === 'failed').length

    if (filteredSegments.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Images className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No shots in this chapter yet.</p>
                    <p className="text-sm">Go to the Generate tab to create your storyboard.</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setInternalTab('generation')}
                    >
                        Go to Generate
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="shots">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                    <TabsTrigger value="shots" className="flex items-center gap-2">
                        <Images className="w-4 h-4" />
                        Shots ({filteredSegments.length})
                        {generatedCount > 0 && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {generatedCount} ready
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="broll" className="flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        B-Roll ({brollShots.length})
                    </TabsTrigger>
                </TabsList>

                {/* Main Shots Tab */}
                <TabsContent value="shots" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Images className="w-5 h-5" />
                                    Generated Storyboard
                                </div>
                                {/* Status Summary */}
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
                                                onClick={handleRegenerateFailedShots}
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
                                </div>
                            </CardTitle>
                            <CardDescription className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span>Hover for actions.</span>
                                    <button
                                        onClick={() => setShowCompletedOnly(!showCompletedOnly)}
                                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${showCompletedOnly ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'}`}
                                    >
                                        {showCompletedOnly ? 'Completed only' : 'Show all'}
                                    </button>
                                </div>
                                {generatedCount > 0 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadAll}
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
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredSegments.filter(segment => {
                                        if (!showCompletedOnly) return true
                                        const img = generatedImages[segment.sequence]
                                        return img?.status === 'completed' && img?.imageUrl
                                    }).map((segment) => {
                                        const shotId = `shot-${segment.sequence}`
                                        const hasVariants = contactSheetVariants.some(
                                            v => v.storyboard_shot_id === shotId
                                        )
                                        const generatedImage = generatedImages[segment.sequence]
                                        const isAnimating = animatingShots.has(segment.sequence) || generatedImage?.videoStatus === 'generating'
                                        const isFailed = generatedImage?.status === 'failed'
                                        const hasImage = !!generatedImage?.imageUrl

                                        return (
                                            <div
                                                key={segment.sequence}
                                                className="group relative"
                                            >
                                                <div
                                                    className="aspect-video rounded-lg border bg-muted/20 flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
                                                    style={{ borderColor: segment.color }}
                                                >
                                                    {/* Show generated image or placeholder */}
                                                    {generatedImage?.imageUrl ? (
                                                        <>
                                                            <img
                                                                src={generatedImage.imageUrl}
                                                                alt={`Shot ${segment.sequence}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            {/* Prompt overlay on completed images */}
                                                            {(() => {
                                                                const shotPrompt = generatedPrompts.find(p => p.sequence === segment.sequence)
                                                                return shotPrompt ? (
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
                                                                ) : null
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <div className="text-center p-2">
                                                            {generatedImage?.status === 'generating' ? (
                                                                <LoadingSpinner size="md" className="mx-auto" />
                                                            ) : generatedImage?.status === 'failed' ? (
                                                                <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
                                                            ) : generatedImage?.status === 'completed' ? (
                                                                <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                                                            ) : (
                                                                <Images className="w-6 h-6 mx-auto text-muted-foreground/30" />
                                                            )}
                                                            <Badge
                                                                className="mt-2"
                                                                style={{ backgroundColor: segment.color }}
                                                            >
                                                                Shot {segment.sequence}
                                                            </Badge>
                                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                                {segment.text.slice(0, 50)}...
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Shot number badge always visible */}
                                                    <Badge
                                                        className="absolute top-1 left-1 text-xs"
                                                        style={{ backgroundColor: segment.color }}
                                                    >
                                                        {segment.sequence}
                                                    </Badge>

                                                    {/* Character badges */}
                                                    {(() => {
                                                        const shotPrompt = generatedPrompts.find(p => p.sequence === segment.sequence)
                                                        if (!shotPrompt?.characterRefs?.length) return null
                                                        const maxShow = 3
                                                        const refs = shotPrompt.characterRefs
                                                        const overflow = refs.length - maxShow
                                                        return (
                                                            <div className="absolute top-1 left-8 flex gap-0.5 group-hover:opacity-0 transition-opacity">
                                                                {refs.slice(0, maxShow).map(c => (
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
                                                                {overflow > 0 && (
                                                                    <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-black/60 text-white/90 border-none">
                                                                        +{overflow}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )
                                                    })()}

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
                                                                setVideoPreview({ url: generatedImage.videoUrl!, sequence: segment.sequence })
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

                                                    {/* FAILED SHOT: Centered retry overlay */}
                                                    {isFailed && (
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleRegenerateSingleShot(segment.sequence)}
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
                                                            {generatedImage?.error && (
                                                                <p className="text-xs text-red-300 text-center px-2 max-w-[90%]">
                                                                    {generatedImage.error}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* COMPLETED SHOT: Icon toolbar at bottom */}
                                                    {hasImage && !isFailed && (
                                                        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center justify-center gap-1 bg-black/80 backdrop-blur-sm px-2 py-1.5 rounded-b-lg">
                                                                <TooltipProvider delayDuration={200}>
                                                                    {/* Shot Lab */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                                                                                onClick={() => openShotLab(segment.sequence)}
                                                                            >
                                                                                <FlaskConical className="w-4 h-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">Shot Lab</TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Preview */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                                                                                onClick={() => setPreviewImage(generatedImage.imageUrl || null)}
                                                                            >
                                                                                <Eye className="w-4 h-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">Preview</TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Angles / Contact Sheet */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                                                                                onClick={() => handleOpenContactSheet(segment.sequence)}
                                                                            >
                                                                                <Grid3X3 className="w-4 h-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">Angles</TooltipContent>
                                                                    </Tooltip>

                                                                    {/* B-Roll */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors disabled:opacity-40"
                                                                                disabled={generatingBRollId === segment.sequence}
                                                                                onClick={() => handleGenerateBRollGrid(generatedImage.imageUrl!, segment.sequence)}
                                                                            >
                                                                                {generatingBRollId === segment.sequence ? (
                                                                                    <LoadingSpinner size="xs" color="current" />
                                                                                ) : (
                                                                                    <Layers className="w-4 h-4" />
                                                                                )}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">B-Roll</TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Animate / Play */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                                                                                    generatedImage.videoStatus === 'completed'
                                                                                        ? 'text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300'
                                                                                        : 'text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-300'
                                                                                }`}
                                                                                disabled={isAnimating}
                                                                                onClick={() => handleAnimateShot(segment.sequence)}
                                                                            >
                                                                                {isAnimating ? (
                                                                                    <LoadingSpinner size="xs" color="current" />
                                                                                ) : generatedImage.videoStatus === 'completed' && generatedImage.videoUrl ? (
                                                                                    <Play className="w-4 h-4" />
                                                                                ) : (
                                                                                    <Wand2 className="w-4 h-4" />
                                                                                )}
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">
                                                                            {isAnimating ? 'Animating...' : generatedImage.videoStatus === 'completed' ? 'Play Video' : 'Animate'}
                                                                        </TooltipContent>
                                                                    </Tooltip>

                                                                    {/* Download */}
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                                                                                onClick={() => {
                                                                                    const link = document.createElement('a')
                                                                                    link.href = generatedImage.imageUrl!
                                                                                    link.download = `shot-${segment.sequence}.png`
                                                                                    link.click()
                                                                                }}
                                                                            >
                                                                                <Download className="w-4 h-4" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="text-xs">Download</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* B-Roll Tab */}
                <TabsContent value="broll" className="mt-4">
                    <BRollGenerator />
                </TabsContent>
            </Tabs>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setPreviewImage(null)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}

            {/* Video Preview Modal */}
            {videoPreview && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setVideoPreview(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <video
                            src={videoPreview.url}
                            controls
                            autoPlay
                            loop
                            className="max-w-full max-h-[80vh] rounded-lg"
                        />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-white/80 text-sm">Shot {videoPreview.sequence} - Animation</span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setVideoPreview(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Sheet Modal */}
            <ContactSheetModal
                open={contactSheetOpen}
                onOpenChange={setContactSheetOpen}
                shot={selectedShot}
            />

        </div>
    )
}
