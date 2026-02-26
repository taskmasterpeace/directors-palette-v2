'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Images, Film } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getClient } from '@/lib/db/client'
import { BRollGenerator } from '../broll/BRollGenerator'
import { ContactSheetModal } from '../contact-sheet/ContactSheetModal'
import { storyboardGenerationService } from '../../services/storyboard-generation.service'
import { toast } from 'sonner'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { getImageCostTokens } from '../../constants/generation.constants'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'
import { ShotAnimationService } from '../../services/shot-animation.service'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import JSZip from 'jszip'

import { GalleryHeader, type GalleryViewMode } from './GalleryHeader'
import { GalleryGridView } from './GalleryGridView'
import { GalleryListView } from './GalleryListView'
import { GalleryCarouselView } from './GalleryCarouselView'
import { DocumentaryTimeline } from './DocumentaryTimeline'
import { logger } from '@/lib/logger'

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
        selectedDirectorId,
        setVideoStatus,
        setAnimationPrompt,
        storyText,
        shotNotes,
        globalPromptPrefix,
        globalPromptSuffix,
        setStoryText,
        setGeneratedPrompts,
        setGenerationSettings,
        setShotNote,
        setGlobalPromptPrefix,
        setGlobalPromptSuffix,
        isDocumentaryMode,
        documentaryChapters,
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
                        const updatedRecord = payload.new as { id: string; prediction_id?: string; public_url?: string; metadata?: Record<string, unknown> }

                        // Find which sequence this gallery record belongs to
                        for (const [seq, img] of Object.entries(generatedImages)) {
                            if (img.videoPredictionId && img.videoStatus === 'generating') {
                                // Match by prediction_id column first, then fallback to metadata
                                const metadata = updatedRecord.metadata as Record<string, unknown> | undefined
                                const recordPredictionId = updatedRecord.prediction_id || metadata?.prediction_id || metadata?.predictionId

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
    // Falls back to synthetic segments from generatedImages when breakdownResult is unavailable
    const filteredSegments = useMemo(() => {
        // Build segments from breakdownResult if available
        let segments = breakdownResult?.segments

        // Fallback: build synthetic segments from generatedImages keys
        if (!segments || segments.length === 0) {
            const imageKeys = Object.keys(generatedImages).map(Number).sort((a, b) => a - b)
            if (imageKeys.length === 0) return []

            const SHOT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
            segments = imageKeys.map(seq => {
                const prompt = generatedPrompts.find(p => p.sequence === seq)
                return {
                    sequence: seq,
                    text: prompt?.originalText || prompt?.prompt || `Shot ${seq}`,
                    start_index: 0,
                    end_index: 0,
                    color: SHOT_COLORS[(seq - 1) % SHOT_COLORS.length]
                }
            })
        }

        if (!chapters || chapters.length === 0) return segments

        // "All Chapters" view - show all segments
        if (chapterIndex < 0) return segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return segments
        }

        return segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex, generatedImages, generatedPrompts])

    const [selectedShot, setSelectedShot] = useState<GeneratedShotPrompt | null>(null)
    const [contactSheetOpen, setContactSheetOpen] = useState(false)
    const [generatingBRollId, setGeneratingBRollId] = useState<number | null>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [isDownloadingAll, setIsDownloadingAll] = useState(false)
    const [showCompletedOnly, setShowCompletedOnly] = useState(true)
    const [viewMode, setViewMode] = useState<GalleryViewMode>('list')
    const importFileRef = useRef<HTMLInputElement>(null)

    // ---- Export / Import JSON ----
    const handleExportJSON = () => {
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            storyText,
            generatedPrompts,
            generationSettings,
            selectedDirectorId,
            shotNotes,
            globalPromptPrefix,
            globalPromptSuffix,
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `storyboard-export-${Date.now()}.json`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Storyboard exported as JSON')
    }

    const handleImportJSON = () => {
        importFileRef.current?.click()
    }

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string)
                if (!data.version) {
                    toast.error('Invalid storyboard file', { description: 'Missing version field.' })
                    return
                }
                if (data.storyText) setStoryText(data.storyText)
                if (data.generatedPrompts) setGeneratedPrompts(data.generatedPrompts)
                if (data.generationSettings) setGenerationSettings(data.generationSettings)
                if (data.shotNotes) {
                    for (const [seq, note] of Object.entries(data.shotNotes)) {
                        setShotNote(Number(seq), note as string)
                    }
                }
                if (data.globalPromptPrefix != null) setGlobalPromptPrefix(data.globalPromptPrefix)
                if (data.globalPromptSuffix != null) setGlobalPromptSuffix(data.globalPromptSuffix)

                toast.success('Storyboard imported', {
                    description: `Loaded ${data.generatedPrompts?.length ?? 0} prompts.`
                })
            } catch {
                toast.error('Failed to parse JSON file')
            }
        }
        reader.readAsText(file)

        // Reset file input so same file can be re-imported
        e.target.value = ''
    }

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
            logger.storyboard.error('ZIP download error', { error: error instanceof Error ? error.message : String(error) })
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
            logger.storyboard.error('B-Roll grid generation error', { error: error instanceof Error ? error.message : String(error) })
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

        const costPerImage = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
        if (balance < costPerImage) {
            toast.error(`Insufficient credits. Need ${costPerImage} tokens.`)
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

    // Regenerate a single shot with a modified prompt
    const handleRegenerateWithPrompt = async (sequence: number, prompt: string) => {
        const shot = generatedPrompts.find(p => p.sequence === sequence)
        if (!shot) return

        // Credit check
        try {
            await fetchBalance()
        } catch {
            // Continue anyway
        }

        const costPerImage = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
        if (balance < costPerImage) {
            toast.error(`Insufficient credits. Need ${costPerImage} tokens.`)
            return
        }

        setRegeneratingShots(prev => new Set(prev).add(sequence))
        setGeneratedImage(sequence, { ...generatedImages[sequence], status: 'generating', error: undefined })

        try {
            const modifiedShot = { ...shot, prompt }
            const results = await storyboardGenerationService.generateShotsFromPrompts(
                [modifiedShot],
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
                    toast.success(`Shot ${sequence} regenerated with updated prompt`)
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
        const costPerImg = getImageCostTokens(generationSettings.imageModel, generationSettings.resolution)
        const totalCost = failedShots.length * costPerImg
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

    const handleDownloadSingleShot = (sequence: number) => {
        const img = generatedImages[sequence]
        if (!img?.imageUrl) return
        const link = document.createElement('a')
        link.href = img.imageUrl
        link.download = `shot-${sequence}.png`
        link.click()
    }

    const generatedCount = Object.values(generatedImages).filter(img => img.status === 'completed').length
    const pendingCount = Object.values(generatedImages).filter(img => img.status === 'pending' || img.status === 'generating').length
    const failedCount = Object.values(generatedImages).filter(img => img.status === 'failed').length

    if (isDocumentaryMode && documentaryChapters.length > 0) {
        return <DocumentaryTimeline />
    }

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
                        <GalleryHeader
                            generatedCount={generatedCount}
                            pendingCount={pendingCount}
                            failedCount={failedCount}
                            showCompletedOnly={showCompletedOnly}
                            isRegeneratingFailed={isRegeneratingFailed}
                            isDownloadingAll={isDownloadingAll}
                            viewMode={viewMode}
                            onToggleCompletedOnly={() => setShowCompletedOnly(!showCompletedOnly)}
                            onRegenerateFailed={handleRegenerateFailedShots}
                            onDownloadAll={handleDownloadAll}
                            onExportJSON={handleExportJSON}
                            onImportJSON={handleImportJSON}
                            onViewModeChange={setViewMode}
                        />
                        <input
                            ref={importFileRef}
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleImportFileChange}
                        />
                        <CardContent>
                            {viewMode === 'grid' ? (
                                <GalleryGridView
                                    segments={filteredSegments}
                                    generatedImages={generatedImages}
                                    generatedPrompts={generatedPrompts}
                                    contactSheetVariants={contactSheetVariants}
                                    showCompletedOnly={showCompletedOnly}
                                    animatingShots={animatingShots}
                                    regeneratingShots={regeneratingShots}
                                    generatingBRollId={generatingBRollId}

                                    onPreview={(imageUrl) => setPreviewImage(imageUrl)}
                                    onContactSheet={handleOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={handleAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={(url, seq) => setVideoPreview({ url, sequence: seq })}
                                />
                            ) : viewMode === 'list' ? (
                                <GalleryListView
                                    segments={filteredSegments}
                                    generatedImages={generatedImages}
                                    generatedPrompts={generatedPrompts}
                                    contactSheetVariants={contactSheetVariants}
                                    showCompletedOnly={showCompletedOnly}
                                    animatingShots={animatingShots}
                                    regeneratingShots={regeneratingShots}
                                    generatingBRollId={generatingBRollId}

                                    onPreview={(imageUrl) => setPreviewImage(imageUrl)}
                                    onContactSheet={handleOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={handleAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onRegenerateWithPrompt={handleRegenerateWithPrompt}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={(url, seq) => setVideoPreview({ url, sequence: seq })}
                                />
                            ) : (
                                <GalleryCarouselView
                                    segments={filteredSegments}
                                    generatedImages={generatedImages}
                                    generatedPrompts={generatedPrompts}
                                    showCompletedOnly={showCompletedOnly}
                                    animatingShots={animatingShots}
                                    regeneratingShots={regeneratingShots}
                                    generatingBRollId={generatingBRollId}

                                    onPreview={(imageUrl) => setPreviewImage(imageUrl)}
                                    onContactSheet={handleOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={handleAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onRegenerateWithPrompt={handleRegenerateWithPrompt}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={(url, seq) => setVideoPreview({ url, sequence: seq })}
                                />
                            )}
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
