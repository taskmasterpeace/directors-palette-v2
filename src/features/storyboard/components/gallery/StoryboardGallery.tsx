'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Images, Film } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getClient } from '@/lib/db/client'
import { BRollGenerator } from '../broll/BRollGenerator'
import { ContactSheetModal } from '../contact-sheet/ContactSheetModal'
import { toast } from 'sonner'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'

import { GalleryHeader, type GalleryViewMode } from './GalleryHeader'
import { GalleryGridView } from './GalleryGridView'
import { GalleryListView } from './GalleryListView'
import { GalleryCarouselView } from './GalleryCarouselView'
import { DocumentaryTimeline } from './DocumentaryTimeline'
import { useGalleryActions } from '../../hooks/useGalleryActions'

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
        setVideoStatus,
        isDocumentaryMode,
        documentaryChapters,
    } = useStoryboardStore()

    const { user } = useAuth()

    const {
        regeneratingShots,
        isRegeneratingFailed,
        animatingShots,
        isDownloadingAll,
        generatingBRollId,
        importFileRef,
        handleExportJSON,
        handleImportJSON,
        handleImportFileChange,
        handleDownloadAll,
        handleOpenContactSheet,
        handleGenerateBRollGrid,
        handleAnimateShot,
        handleRegenerateSingleShot,
        handleRegenerateWithPrompt,
        handleRegenerateFailedShots,
        handleDownloadSingleShot,
    } = useGalleryActions()

    const [selectedShot, setSelectedShot] = useState<GeneratedShotPrompt | null>(null)
    const [contactSheetOpen, setContactSheetOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [videoPreview, setVideoPreview] = useState<{ url: string; sequence: number } | null>(null)
    const [showCompletedOnly, setShowCompletedOnly] = useState(true)
    const [viewMode, setViewMode] = useState<GalleryViewMode>('list')

    // Supabase realtime subscription for video status updates
    const monitoredIdsRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        if (!user) return

        // Collect current generating prediction IDs
        const currentIds = new Set<string>()
        Object.values(generatedImages).forEach(img => {
            if (img.videoStatus === 'generating' && img.videoPredictionId) {
                currentIds.add(img.videoPredictionId)
            }
        })

        // Only re-subscribe if the monitored set actually changed
        const currentKey = [...currentIds].sort().join(',')
        const prevKey = [...monitoredIdsRef.current].sort().join(',')
        if (currentKey === prevKey) return
        if (currentIds.size === 0) {
            monitoredIdsRef.current = currentIds
            return
        }

        monitoredIdsRef.current = currentIds

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

                        for (const [seq, img] of Object.entries(generatedImages)) {
                            if (img.videoPredictionId && img.videoStatus === 'generating') {
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

        // Add timeout for stuck generations
        const timeoutId = setTimeout(() => {
            currentIds.forEach(predictionId => {
                const img = Object.values(useStoryboardStore.getState().generatedImages).find(i => i.videoPredictionId === predictionId)
                if (img?.videoStatus === 'generating') {
                    const seq = Object.entries(useStoryboardStore.getState().generatedImages).find(([, i]) => i.videoPredictionId === predictionId)
                    if (seq) {
                        setVideoStatus(Number(seq[0]), 'failed', undefined, 'Video generation timed out. Click retry to try again.')
                    }
                }
            })
        }, 60000)

        return () => {
            clearTimeout(timeoutId)
            if (subscription) subscription.unsubscribe()
        }
    }, [user, generatedImages, setVideoStatus])

    // Filter segments by chapter
    const filteredSegments = useMemo(() => {
        let segments = breakdownResult?.segments

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
        if (chapterIndex < 0) return segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return segments
        }

        return segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex, generatedImages, generatedPrompts])

    const onOpenContactSheet = (sequence: number) => {
        const shot = handleOpenContactSheet(sequence)
        if (shot) {
            setSelectedShot(shot)
            setContactSheetOpen(true)
        }
    }

    const onVideoPreview = (url: string, seq: number) => {
        const imageData = generatedImages[seq]
        if (imageData?.videoUrl && imageData.videoStatus === 'completed') {
            setVideoPreview({ url: imageData.videoUrl, sequence: seq })
        } else {
            setVideoPreview({ url, sequence: seq })
        }
    }

    const onAnimateShot = async (sequence: number) => {
        const imageData = generatedImages[sequence]
        if (imageData?.videoUrl && imageData.videoStatus === 'completed') {
            setVideoPreview({ url: imageData.videoUrl, sequence })
            return
        }
        await handleAnimateShot(sequence)
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
                                    onContactSheet={onOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={onAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={onVideoPreview}
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
                                    onContactSheet={onOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={onAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onRegenerateWithPrompt={handleRegenerateWithPrompt}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={onVideoPreview}
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
                                    onContactSheet={onOpenContactSheet}
                                    onBRoll={handleGenerateBRollGrid}
                                    onAnimate={onAnimateShot}
                                    onRegenerate={handleRegenerateSingleShot}
                                    onRegenerateWithPrompt={handleRegenerateWithPrompt}
                                    onDownload={handleDownloadSingleShot}
                                    onVideoPreview={onVideoPreview}
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
