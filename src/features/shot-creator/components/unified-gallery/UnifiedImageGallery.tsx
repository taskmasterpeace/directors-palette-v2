'use client'

import { useEffect, useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useReferenceNamePrompt } from '@/components/providers/PromptProvider'
import { useToast } from '@/hooks/use-toast'
import { autoExtractFrames } from '@/features/layout-annotation/services/grid-detector'
import { LoadMoreButton } from './LoadMoreButton'
import { useGalleryLogic } from "../../hooks/useGalleryLogic"
import { ImageCard } from "./ImageCard"
import { GalleryHeader } from "./GalleryHeader"
import FullscreenModal from "./FullScreenModal"
import { FolderSidebar } from "./FolderSidebar"
import { MobileFolderMenu } from "./MobileFolderMenu"
import { FolderManagerModal } from "./FolderManagerModal"
import { BulkDownloadModal } from "./BulkDownloadModal"
import { useFolderManager } from "../../hooks/useFolderManager"
import { GeneratedImage, useUnifiedGalleryStore, GridSize } from '../../store/unified-gallery-store'

export interface UnifiedImageGalleryProps {
    currentTab?: 'shot-creator' | 'shot-animator' | 'layout-annotation' | 'gallery' | 'story-creator'
    mode?: 'minimal' | 'full'
    isLoading?: boolean
    onSendToTab?: (imageUrl: string, targetTab: string) => void
    onUseAsReference?: (imageUrl: string) => void
    onSendToLibrary?: (imageUrl: string, galleryId: string) => void
    onSendToLayoutAnnotation?: (imageUrl: string) => void
    onSendToShotAnimator?: (imageUrl: string) => void
    onImageSelect?: (imageUrl: string) => void
    className?: string
}

export function UnifiedImageGallery({
    currentTab,
    mode = 'full',
    isLoading = false,
    onSendToTab,
    onUseAsReference,
    onSendToShotAnimator,
    onSendToLayoutAnnotation,
    onSendToLibrary,
    onImageSelect,
    className
}: UnifiedImageGalleryProps) {
    const {
        images,
        paginatedImages,
        filters,
        fullscreenImage,
        totalImages,
        totalCredits,
        handleCopyImage,
        handleDownloadImage,
        handleDeleteImage,
        handleSendTo,
        handleSearchChange,
        setFullscreenImage,
        selectedImages,
        handleSelectAll,
        handleClearSelection,
        handleDeleteSelected,
        handleImageSelect,
        updateImageReference,
        downloadModalOpen,
        downloadProgress,
        handleBulkDownload,
        setDownloadModalOpen
    } = useGalleryLogic(onSendToTab, onUseAsReference, onSendToShotAnimator, onSendToLayoutAnnotation, onSendToLibrary, onImageSelect)

    const showReferenceNamePrompt = useReferenceNamePrompt()
    const { toast } = useToast()

    // Get grid size, pagination, and database count from store
    const gridSize = useUnifiedGalleryStore(state => state.gridSize)
    const setGridSize = useUnifiedGalleryStore(state => state.setGridSize)
    const totalDatabaseCount = useUnifiedGalleryStore(state => state.totalDatabaseCount)
    const useNativeAspectRatio = useUnifiedGalleryStore(state => state.useNativeAspectRatio)
    const setUseNativeAspectRatio = useUnifiedGalleryStore(state => state.setUseNativeAspectRatio)

    // Get infinite scroll state from store
    const hasMore = useUnifiedGalleryStore(state => state.hasMore)
    const isLoadingMore = useUnifiedGalleryStore(state => state.isLoadingMore)
    const loadMoreImages = useUnifiedGalleryStore(state => state.loadMoreImages)

    // Folder state from store
    const folders = useUnifiedGalleryStore(state => state.folders)
    const currentFolderId = useUnifiedGalleryStore(state => state.currentFolderId)
    const isFoldersLoading = useUnifiedGalleryStore(state => state.isFoldersLoading)
    const setCurrentFolder = useUnifiedGalleryStore(state => state.setCurrentFolder)
    const getUncategorizedCount = useUnifiedGalleryStore(state => state.getUncategorizedCount)

    // Folder manager hook
    const {
        modalMode,
        selectedFolder,
        openCreateModal,
        closeModal,
        handleCreateFolder,
        handleUpdateFolder,
        handleDeleteFolder,
        handleMoveImages,
    } = useFolderManager()

    // Local UI state
    const [isMobileFolderMenuOpen, setIsMobileFolderMenuOpen] = useState(false)
    const [removingBackgroundId, setRemovingBackgroundId] = useState<string | null>(null)
    const [generatingCinematicId, setGeneratingCinematicId] = useState<string | null>(null)

    // Handle background removal
    const handleRemoveBackground = useCallback(async (image: GeneratedImage) => {
        if (removingBackgroundId) return // Prevent multiple concurrent removals

        setRemovingBackgroundId(image.id)
        toast({
            title: "Removing Background",
            description: "Processing image... (3 pts)"
        })

        try {
            const response = await fetch('/api/tools/remove-background', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: image.url,
                    galleryId: image.id
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to remove background')
            }

            toast({
                title: "Background Removed!",
                description: "New image saved to gallery. Refreshing..."
            })

            // Refresh gallery to show the new image
            setTimeout(async () => {
                await useUnifiedGalleryStore.getState().refreshGallery()
            }, 500)
        } catch (error) {
            console.error('Background removal error:', error)
            toast({
                title: "Remove Background Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive"
            })
        } finally {
            setRemovingBackgroundId(null)
        }
    }, [removingBackgroundId, toast])

    // Handle 9-Shot Cinematic Grid generation
    const handleGenerateCinematicGrid = useCallback(async (image: GeneratedImage) => {
        if (generatingCinematicId) return // Prevent multiple concurrent generations

        setGeneratingCinematicId(image.id)
        toast({
            title: "Generating 9-Shot Cinematic",
            description: "Creating cinematic grid... This may take a moment."
        })

        try {
            // Build the 9-shot cinematic prompt
            const cinematicPrompt = `9-shot visual breakdown, cinematic contact sheet:

Top row - WIDE SHOTS establishing environment/scale:
Bird's Eye aerial view | Wide Establishing shot | Wide Master full body

Middle row - MEDIUM SHOTS for context/relationship:
Medium Full cowboy shot | Medium waist up | Medium Close upper body

Bottom row - CLOSE-UPS for detail/emotion:
Close-up face focus | Extreme Close-up detailed | Macro detail shot

One unified 3x3 grid image with consistent style matching the reference image.`

            const response = await fetch('/api/generation/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-image-1', // Use GPT Image for best results
                    prompt: cinematicPrompt,
                    referenceImages: [{ url: image.url, weight: 0.8 }],
                    modelSettings: {
                        aspectRatio: '1:1', // Square for 3x3 grid
                        resolution: '2K',
                        quality: 'high'
                    }
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate cinematic grid')
            }

            toast({
                title: "9-Shot Cinematic Generated!",
                description: "Grid saved to gallery. Use 'Extract to Gallery' to split into individual shots."
            })

            // Refresh gallery to show the new image
            setTimeout(async () => {
                await useUnifiedGalleryStore.getState().refreshGallery()
            }, 1000)
        } catch (error) {
            console.error('Cinematic grid generation error:', error)
            toast({
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive"
            })
        } finally {
            setGeneratingCinematicId(null)
        }
    }, [generatingCinematicId, toast])

    // Sidebar collapsed state from store (persisted)
    const isSidebarCollapsed = useUnifiedGalleryStore(state => state.isSidebarCollapsed)
    const setIsSidebarCollapsed = useUnifiedGalleryStore(state => state.setIsSidebarCollapsed)

    // Hydrate UI preferences from localStorage after mount (SSR compatibility)
    useEffect(() => {
        useUnifiedGalleryStore.getState().hydrateFromStorage()
    }, [])

    // Get uncategorized count
    const uncategorizedCount = getUncategorizedCount()

    // Handle moving single image to folder
    const handleMoveToFolder = async (imageId: string, folderId: string | null) => {
        await handleMoveImages([imageId], folderId)
    }

    // Handle extracting frames from a composite image
    const handleExtractFrames = useCallback(async (imageUrl: string) => {
        toast({
            title: "Extracting Frames",
            description: "Analyzing image for 3×3 grid..."
        })

        try {
            const result = await autoExtractFrames(imageUrl, '16:9')

            if (!result.success) {
                toast({
                    title: "Detection Failed",
                    description: "Could not detect grid separators. Use Layout tab for manual extraction.",
                    variant: "destructive"
                })
                return
            }

            if (result.confidence === 'low') {
                toast({
                    title: "Low Confidence",
                    description: "Grid detection uncertain. Consider using Layout tab for manual adjustment.",
                    variant: "destructive"
                })
                return
            }

            // Download the extracted frames
            result.frames.forEach((frame, index) => {
                const link = document.createElement('a')
                link.href = frame.dataUrl
                link.download = `frame_${index + 1}_r${frame.row + 1}_c${frame.col + 1}.png`
                link.click()
            })

            toast({
                title: "Frames Extracted",
                description: `Successfully extracted ${result.frames.length} frames (gutter: ${result.detectedGutter}px)`
            })
        } catch (error) {
            console.error('Frame extraction error:', error)
            toast({
                title: "Extraction Failed",
                description: "An error occurred during frame extraction.",
                variant: "destructive"
            })
        }
    }, [toast])

    // Handle extracting frames and saving to gallery
    const handleExtractFramesToGallery = useCallback(async (imageUrl: string, parentImageId?: string) => {
        toast({
            title: "Extracting Frames",
            description: "Analyzing image and saving to gallery..."
        })

        try {
            const result = await autoExtractFrames(imageUrl, '16:9')

            if (!result.success) {
                toast({
                    title: "Detection Failed",
                    description: "Could not detect grid separators. Use Layout tab for manual extraction.",
                    variant: "destructive"
                })
                return
            }

            if (result.confidence === 'low') {
                toast({
                    title: "Low Confidence",
                    description: "Grid detection uncertain. Consider using Layout tab for manual adjustment.",
                    variant: "destructive"
                })
                return
            }

            // Save each frame to the gallery via API
            let savedCount = 0
            for (const frame of result.frames) {
                try {
                    const response = await fetch('/api/gallery/save-frame', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            imageData: frame.dataUrl,
                            metadata: {
                                parentId: parentImageId,
                                row: frame.row,
                                col: frame.col,
                                aspectRatio: '16:9',
                                width: 1920,
                                height: 1080
                            }
                        })
                    })

                    if (response.ok) {
                        savedCount++
                    }
                } catch (err) {
                    console.error('Failed to save frame:', err)
                }
            }

            if (savedCount > 0) {
                toast({
                    title: "Frames Saved to Gallery",
                    description: `Successfully saved ${savedCount} of ${result.frames.length} frames. Refreshing...`
                })

                // Give the toast a moment to show, then refresh to show new images
                setTimeout(async () => {
                    await useUnifiedGalleryStore.getState().refreshGallery()
                    toast({
                        title: "Gallery Updated",
                        description: `${savedCount} new frames are now in your gallery`
                    })
                }, 1000)
            } else {
                toast({
                    title: "Save Failed",
                    description: "Could not save frames to gallery. Please try again.",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Frame extraction error:', error)
            toast({
                title: "Extraction Failed",
                description: "An error occurred during frame extraction.",
                variant: "destructive"
            })
        }
    }, [toast])

    // Grid size to CSS classes mapping
    // Mobile: small=3cols, medium=2cols, large=1col for clear differentiation
    const getGridClasses = (size: GridSize): string => {
        switch (size) {
            case 'small':
                return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
            case 'medium':
                return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            case 'large':
                return 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            default:
                return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }
    }

    // Keyboard navigation for fullscreen modal
    const navigateToImage = useCallback((direction: 'next' | 'previous') => {
        if (!fullscreenImage || images.length <= 1) return

        const currentIndex = images.findIndex((img: GeneratedImage) => img.url === fullscreenImage.url)
        if (currentIndex === -1) return

        let newIndex: number
        if (direction === 'next') {
            newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
        } else {
            newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
        }

        setFullscreenImage(images[newIndex])
    }, [fullscreenImage, images, setFullscreenImage])

    // Keyboard event handler
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!fullscreenImage) return

            switch (event.key) {
                case 'ArrowRight':
                    event.preventDefault()
                    navigateToImage('next')
                    break
                case 'ArrowLeft':
                    event.preventDefault()
                    navigateToImage('previous')
                    break
                case 'Escape':
                    event.preventDefault()
                    setFullscreenImage(null)
                    break
            }
        }

        if (fullscreenImage) {
            document.addEventListener('keydown', handleKeyDown)
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [fullscreenImage, navigateToImage, setFullscreenImage])

    // Minimal mode for embedded use
    if (mode === 'minimal') {
        return (
            <div className={cn("w-full", className)}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {images.slice(0, 8).map((image: GeneratedImage) => (
                        <ImageCard
                            key={image.id}
                            image={image}
                            isSelected={false}
                            onSelect={() => onImageSelect?.(image.url)}
                            onZoom={() => setFullscreenImage(image)}
                            onCopy={() => handleCopyImage(image.url)}
                            onDownload={() => handleDownloadImage(image.url)}
                            onDelete={() => handleDeleteImage(image.url)}
                            onSendTo={currentTab ? (target) => handleSendTo(image.url, target) : undefined}
                            onSetReference={async () => {
                                const newRef = await showReferenceNamePrompt()
                                if (newRef) {
                                    await updateImageReference(image.id, newRef)
                                }
                            }}
                            onEditReference={async () => {
                                const newRef = await showReferenceNamePrompt(image.reference)
                                if (newRef !== null) {
                                    await updateImageReference(image.id, newRef)
                                    toast({
                                        title: newRef ? "Reference Updated" : "Reference Cleared",
                                        description: newRef ? `Image tagged as ${newRef}` : "Reference tag removed"
                                    })
                                }
                            }}
                            onAddToLibrary={() => onSendToLibrary?.(image.url, image.id)}
                            onMoveToFolder={(folderId) => handleMoveToFolder(image.id, folderId)}
                            onExtractFrames={() => handleExtractFrames(image.url)}
                            onExtractFramesToGallery={() => handleExtractFramesToGallery(image.url, image.id)}
                            onRemoveBackground={() => handleRemoveBackground(image)}
                            isRemovingBackground={removingBackgroundId === image.id}
                            currentFolderId={image.folderId}
                            folders={folders}
                            showActions={true}
                            useNativeAspectRatio={useNativeAspectRatio}
                            gridSize={gridSize}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Get current folder name for display
    const currentFolderName = currentFolderId
        ? folders.find(f => f.id === currentFolderId)?.name || 'Uncategorized'
        : undefined

    return (
        <>
            {/* Mobile Folder Menu */}
            <MobileFolderMenu
                open={isMobileFolderMenuOpen}
                folders={folders}
                currentFolderId={currentFolderId}
                uncategorizedCount={uncategorizedCount}
                totalImages={totalDatabaseCount}
                isLoading={isFoldersLoading}
                onOpenChange={setIsMobileFolderMenuOpen}
                onFolderSelect={setCurrentFolder}
                onCreateFolder={openCreateModal}
            />

            {/* Folder Manager Modal */}
            <FolderManagerModal
                mode={modalMode}
                folder={selectedFolder}
                onClose={closeModal}
                onCreate={handleCreateFolder}
                onUpdate={handleUpdateFolder}
                onDelete={handleDeleteFolder}
            />

            {/* Main Gallery Layout */}
            <div className="flex h-full w-full">
                {/* Desktop Folder Sidebar */}
                <div className="hidden md:block">
                    <FolderSidebar
                        folders={folders}
                        currentFolderId={currentFolderId}
                        uncategorizedCount={uncategorizedCount}
                        totalImages={totalDatabaseCount}
                        isLoading={isFoldersLoading}
                        onFolderSelect={setCurrentFolder}
                        onCreateFolder={openCreateModal}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                </div>

                {/* Gallery Content */}
                <Card className={cn("flex-1 h-full flex flex-col", className)}>
                    <GalleryHeader
                        totalImages={totalImages}
                        totalDatabaseCount={totalDatabaseCount}
                        totalCredits={totalCredits}
                        searchQuery={filters.searchQuery}
                        currentFolderName={currentFolderName}
                        onSearchChange={handleSearchChange}
                        selectedCount={selectedImages.length}
                        gridSize={gridSize}
                        useNativeAspectRatio={useNativeAspectRatio}
                        onSelectAll={handleSelectAll}
                        onClearSelection={handleClearSelection}
                        onDeleteSelected={handleDeleteSelected}
                        onGridSizeChange={setGridSize}
                        onAspectRatioChange={setUseNativeAspectRatio}
                        onOpenMobileMenu={() => setIsMobileFolderMenuOpen(true)}
                        onBulkDownload={handleBulkDownload}
                    />

            <CardContent className="flex-1 flex flex-col overflow-hidden">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-border border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-muted-foreground">Loading gallery...</p>
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-12">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No images generated yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Start creating images in Shot Creator or Shot Editor
                        </p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1">
                            <div className={cn("grid gap-4", getGridClasses(gridSize))}>
                                {paginatedImages.map((image: GeneratedImage) => (
                                    <ImageCard
                                        key={image.id}
                                        image={image}
                                        isSelected={selectedImages.includes(image.url)}
                                        onSelect={() => handleImageSelect(image.url)}
                                        onZoom={() => setFullscreenImage(image)}
                                        onCopy={() => handleCopyImage(image.url)}
                                        onDownload={() => handleDownloadImage(image.url)}
                                        onDelete={() => handleDeleteImage(image.url)}
                                        onSendTo={currentTab ? (target) => handleSendTo(image.url, target) : undefined}
                                        onSetReference={async () => {
                                            const newRef = await showReferenceNamePrompt()
                                            if (newRef) {
                                                await updateImageReference(image.id, newRef)
                                            }
                                        }}
                                        onEditReference={async () => {
                                            const newRef = await showReferenceNamePrompt(image.reference)
                                            if (newRef !== null) {
                                                await updateImageReference(image.id, newRef)
                                                toast({
                                                    title: newRef ? "Reference Updated" : "Reference Cleared",
                                                    description: newRef ? `Image tagged as ${newRef}` : "Reference tag removed"
                                                })
                                            }
                                        }}
                                        onAddToLibrary={() => {
                                            if (onSendToLibrary) {
                                                // Pass gallery ID along with the image URL
                                                onSendToLibrary(image.url, image.id)
                                            }
                                        }}
                                        onMoveToFolder={(folderId) => handleMoveToFolder(image.id, folderId)}
                                        onExtractFrames={() => handleExtractFrames(image.url)}
                                        onExtractFramesToGallery={() => handleExtractFramesToGallery(image.url, image.id)}
                                        onRemoveBackground={() => handleRemoveBackground(image)}
                                        isRemovingBackground={removingBackgroundId === image.id}
                                        currentFolderId={image.folderId}
                                        folders={folders}
                                        showActions={true}
                                        useNativeAspectRatio={useNativeAspectRatio}
                                        gridSize={gridSize}
                                    />
                                ))}
                            </div>
                        </ScrollArea>

                        {hasMore && (
                            <div className="flex justify-center py-8">
                                <LoadMoreButton
                                    onClick={() => loadMoreImages()}
                                    loading={isLoadingMore}
                                    hasMore={hasMore}
                                />
                            </div>
                        )}

                        {!hasMore && images.length > 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                All images loaded ({images.length} total)
                            </div>
                        )}
                    </>
                )}
            </CardContent>

                    {/* Fullscreen Image Modal */}
                    {fullscreenImage && (
                        <FullscreenModal
                            fullscreenImage={fullscreenImage}
                            images={images}
                            setFullscreenImage={setFullscreenImage}
                            onClose={() => setFullscreenImage(null)}
                            onNavigate={(direction: 'next' | 'previous') => navigateToImage(direction)}
                            onCopyImage={handleCopyImage}
                            onDownloadImage={handleDownloadImage}
                            onDeleteImage={handleDeleteImage}
                            onSendTo={currentTab ? (url: string, target: string) => handleSendTo(url, target) : (() => { })}
                            onSetReference={async () => {
                                const newRef = await showReferenceNamePrompt()
                                if (newRef) {
                                    await updateImageReference(fullscreenImage.id, newRef)
                                }
                            }}
                            onAddToLibrary={onSendToLibrary && fullscreenImage ? () => onSendToLibrary(fullscreenImage.url, fullscreenImage.id) : undefined}
                            onExtractFrames={() => handleExtractFrames(fullscreenImage.url)}
                            onExtractFramesToGallery={() => handleExtractFramesToGallery(fullscreenImage.url, fullscreenImage.id)}
                            onRemoveBackground={() => handleRemoveBackground(fullscreenImage)}
                            isRemovingBackground={removingBackgroundId === fullscreenImage.id}
                            onGenerateCinematicGrid={() => handleGenerateCinematicGrid(fullscreenImage)}
                            isGeneratingCinematic={generatingCinematicId === fullscreenImage.id}
                            showReferenceNamePrompt={showReferenceNamePrompt}
                        />
                    )}

                    {/* Bulk Download Modal */}
                    <BulkDownloadModal
                        open={downloadModalOpen}
                        onOpenChange={setDownloadModalOpen}
                        imageCount={selectedImages.length}
                        current={downloadProgress?.current || 0}
                        status={downloadProgress?.status || 'downloading'}
                        error={downloadProgress?.error}
                    />
                </Card>
            </div>
        </>
    )
}