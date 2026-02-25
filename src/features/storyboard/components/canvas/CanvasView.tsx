'use client'

import { useState, useCallback, useMemo } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core'
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { Upload, Film, ImageIcon, Sparkles } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useStoryboardStore } from '../../store'
import { CanvasPanel, type CanvasVideoEntry } from './CanvasPanel'
import { CanvasToolbar } from './CanvasToolbar'
import { useCanvasDragDrop } from './useCanvasDragDrop'
import { useCanvasImport } from './useCanvasImport'
import { ShotAnimationService } from '../../services/shot-animation.service'
import { useGenerationOrchestration } from '../../hooks/useGenerationOrchestration'
import { DIRECTORS } from '@/features/music-lab/data/directors.data'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'

export function CanvasView() {
    const {
        generatedPrompts,
        generatedImages,
        openShotLab,
        chapters,
        activeChapterIndex,
        setActiveChapter,
        selectedDirectorId,
        setVideoStatus,
        setAnimationPrompt,
        setGeneratedImage,
    } = useStoryboardStore()

    const [selectedSequences, setSelectedSequences] = useState<Set<number>>(new Set())
    const [isDragOver, setIsDragOver] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [gridDensity, setGridDensity] = useState<'compact' | 'normal'>('normal')

    // Generation orchestration
    const {
        startGeneration,
        cancelGeneration,
        pauseGeneration,
        resumeGeneration,
        isGenerating,
        isPaused,
        progress,
    } = useGenerationOrchestration({
        chapterIndex: activeChapterIndex,
        selectedShots: selectedSequences,
        wildcardsEnabled: false,
        wildcards: [],
    })
    // Derive canvas video entries from generatedImages video fields
    const canvasVideos = useMemo(() => {
        const videos: Record<number, CanvasVideoEntry> = {}
        for (const [seqStr, img] of Object.entries(generatedImages)) {
            if (img.videoStatus && img.videoStatus !== 'idle') {
                const seq = Number(seqStr)
                videos[seq] = {
                    galleryId: img.videoPredictionId || '',
                    videoUrl: img.videoUrl,
                    status: img.videoStatus === 'generating' ? 'processing'
                        : img.videoStatus === 'completed' ? 'completed'
                        : img.videoStatus === 'failed' ? 'failed'
                        : 'pending',
                    error: img.videoError,
                }
            }
        }
        return videos
    }, [generatedImages])

    const { activeId, handleDragStart, handleDragEnd, handleDragCancel } = useCanvasDragDrop()
    const { isImporting, handleFileDrop } = useCanvasImport()

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // Filter prompts by active chapter
    const chapterFiltered = useMemo(() => {
        if (!chapters || chapters.length === 0 || activeChapterIndex < 0) {
            return generatedPrompts
        }
        const activeChapter = chapters[activeChapterIndex]
        if (!activeChapter) return generatedPrompts
        return generatedPrompts.filter(p =>
            activeChapter.segmentIndices.includes(p.sequence)
        )
    }, [generatedPrompts, chapters, activeChapterIndex])

    // Filter by search query
    const filteredPrompts = useMemo(() => {
        if (!searchQuery.trim()) return chapterFiltered
        const q = searchQuery.toLowerCase()
        return chapterFiltered.filter(p =>
            p.prompt.toLowerCase().includes(q) ||
            p.shotType.toLowerCase().includes(q) ||
            p.characterRefs.some(c => c.name.toLowerCase().includes(q)) ||
            `#${p.sequence}`.includes(q)
        )
    }, [chapterFiltered, searchQuery])

    const sortableIds = useMemo(
        () => filteredPrompts.map(p => p.sequence),
        [filteredPrompts]
    )

    // Active drag item for overlay
    const activeDragShot = activeId !== null
        ? filteredPrompts.find(p => p.sequence === activeId)
        : null

    const toggleSelect = useCallback((sequence: number) => {
        setSelectedSequences(prev => {
            const next = new Set(prev)
            if (next.has(sequence)) {
                next.delete(sequence)
            } else {
                next.add(sequence)
            }
            return next
        })
    }, [])

    const selectAll = useCallback(() => {
        setSelectedSequences(new Set(filteredPrompts.map(p => p.sequence)))
    }, [filteredPrompts])

    const deselectAll = useCallback(() => {
        setSelectedSequences(new Set())
    }, [])

    const handleGenerateSelected = useCallback(() => {
        if (selectedSequences.size === 0) return
        startGeneration()
    }, [selectedSequences, startGeneration])

    const handleAnimateSelected = useCallback(() => {
        const eligibleCount = Array.from(selectedSequences).filter(
            seq => generatedImages[seq]?.status === 'completed' && generatedImages[seq]?.imageUrl
        ).length

        if (eligibleCount === 0) {
            toast.error('No completed images selected. Generate images first, then animate.')
            return
        }

        toast.info(`${eligibleCount} shots ready for animation. Open Shot Animator to process.`)
    }, [selectedSequences, generatedImages])

    const handleAnimate = useCallback(async (sequence: number) => {
        const img = generatedImages[sequence]
        if (!img?.imageUrl || img.status !== 'completed') {
            toast.error('Generate the image first, then animate it.')
            return
        }

        // If video already completed, just notify
        if (img.videoStatus === 'completed' && img.videoUrl) {
            toast.info('Video already generated. Click to play in Gallery view.')
            return
        }

        if (img.videoStatus === 'generating') {
            toast.info('Animation is already in progress.')
            return
        }

        const shotPrompt = generatedPrompts.find(p => p.sequence === sequence)
        if (!shotPrompt) return

        const director = selectedDirectorId
            ? DIRECTORS.find(d => d.id === selectedDirectorId)
            : undefined

        const animPrompt = ShotAnimationService.buildAnimationPrompt(
            shotPrompt.originalText,
            shotPrompt.prompt,
            shotPrompt.shotType,
            director
        )

        setAnimationPrompt(sequence, animPrompt)
        setVideoStatus(sequence, 'generating')

        try {
            const result = await ShotAnimationService.animateShot({
                sequence,
                imageUrl: img.imageUrl,
                animationPrompt: animPrompt,
                model: 'seedance-lite',
                duration: 5,
            })

            setGeneratedImage(sequence, {
                ...generatedImages[sequence],
                videoPredictionId: result.predictionId,
                videoStatus: 'generating',
                animationPrompt: animPrompt,
            })
            toast.success(`Shot #${sequence} animation started`)
        } catch (error) {
            setVideoStatus(sequence, 'failed', undefined, error instanceof Error ? error.message : 'Animation failed')
            toast.error(`Animation failed for shot #${sequence}`)
        }
    }, [generatedImages, generatedPrompts, selectedDirectorId, setAnimationPrompt, setVideoStatus, setGeneratedImage])

    const handleExport = useCallback(async () => {
        const completedImages = Object.entries(generatedImages)
            .filter(([, img]) => img.status === 'completed' && img.imageUrl)
        if (completedImages.length === 0) {
            toast.info('No completed images to export')
            return
        }
        toast.info(`${completedImages.length} images available. Use Gallery tab for full export.`)
    }, [generatedImages])

    const handleRegenerate = useCallback((sequence: number) => {
        toast.info(`Regenerate shot #${sequence} from Generation tab`)
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        setIsDragOver(false)
        if (e.dataTransfer.files.length > 0) {
            handleFileDrop(e)
        }
    }, [handleFileDrop])

    const onDragOver = useCallback((e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault()
            setIsDragOver(true)
        }
    }, [])

    const onDragLeave = useCallback(() => {
        setIsDragOver(false)
    }, [])

    const toggleDensity = useCallback(() => {
        setGridDensity(prev => prev === 'compact' ? 'normal' : 'compact')
    }, [])

    const gridCols = gridDensity === 'compact'
        ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
        : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

    // Empty state
    if (generatedPrompts.length === 0) {
        return (
            <div
                data-drop-zone="true"
                className={cn(
                    'flex-1 flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-colors',
                    isDragOver ? 'border-primary bg-primary/5' : 'border-border/50'
                )}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
            >
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">Canvas View</h3>
                <p className="text-xs text-muted-foreground text-center max-w-[280px] mb-4">
                    Generate shots from the Shots tab to see them here as draggable panels. You can also drop images from your file system.
                </p>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Drop images</span>
                    <span className="flex items-center gap-1"><Film className="w-3 h-3" /> Animate shots</span>
                    <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> Reorder freely</span>
                </div>
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-3 h-full">
                <CanvasToolbar
                    selectedCount={selectedSequences.size}
                    totalCount={filteredPrompts.length}
                    onSelectAll={selectAll}
                    onDeselectAll={deselectAll}
                    onGenerateSelected={handleGenerateSelected}
                    onAnimateSelected={handleAnimateSelected}
                    onExport={handleExport}
                    isImporting={isImporting}
                    generatedImages={generatedImages}
                    videos={canvasVideos}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    gridDensity={gridDensity}
                    onToggleDensity={toggleDensity}
                    chapters={chapters}
                    activeChapterIndex={activeChapterIndex}
                    onChapterChange={setActiveChapter}
                    isGenerating={isGenerating}
                    isPaused={isPaused}
                    progress={progress}
                    onPause={pauseGeneration}
                    onResume={resumeGeneration}
                    onCancel={cancelGeneration}
                />

                {/* Search results info */}
                {searchQuery && (
                    <p className="text-xs text-muted-foreground px-1">
                        {filteredPrompts.length} of {chapterFiltered.length} shots matching &ldquo;{searchQuery}&rdquo;
                    </p>
                )}

                <div
                    data-drop-zone="true"
                    className={cn(
                        'flex-1 overflow-auto relative rounded-xl transition-colors',
                        isDragOver && 'ring-2 ring-primary bg-primary/5'
                    )}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                >
                    {/* File drop overlay */}
                    {isDragOver && (
                        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-xl backdrop-blur-sm">
                            <div className="text-center">
                                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-7 h-7 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-primary">Drop image to import</p>
                                <p className="text-xs text-primary/60 mt-1">PNG, JPG, or WebP</p>
                            </div>
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                            <div className={cn('grid gap-3 p-1', gridCols)}>
                                {filteredPrompts.map(shot => (
                                    <CanvasPanel
                                        key={shot.sequence}
                                        shot={shot}
                                        imageData={generatedImages[shot.sequence]}
                                        isSelected={selectedSequences.has(shot.sequence)}
                                        onToggleSelect={toggleSelect}
                                        onRegenerate={handleRegenerate}
                                        onOpenShotLab={openShotLab}
                                        onAnimate={handleAnimate}
                                        video={canvasVideos[shot.sequence]}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        {/* Drag overlay for visual feedback */}
                        <DragOverlay>
                            {activeDragShot ? (
                                <div className="rounded-xl border-2 border-primary bg-card/90 shadow-2xl opacity-90 w-[200px] overflow-hidden backdrop-blur-sm">
                                    <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                        {generatedImages[activeDragShot.sequence]?.imageUrl ? (
                                            <img
                                                src={generatedImages[activeDragShot.sequence].imageUrl}
                                                alt={`Shot ${activeDragShot.sequence}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                                        )}
                                    </div>
                                    <div className="p-1.5 text-center">
                                        <span className="text-[10px] font-medium">Shot #{activeDragShot.sequence}</span>
                                    </div>
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>
        </TooltipProvider>
    )
}
