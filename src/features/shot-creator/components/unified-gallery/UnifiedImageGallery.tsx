'use client'

import { useEffect, useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useReferenceNamePrompt } from '@/components/providers/PromptProvider'
import { useIsMobile } from '@/hooks/use-mobile'
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
        openEditModal,
        openDeleteModal,
        closeModal,
        handleCreateFolder,
        handleUpdateFolder,
        handleDeleteFolder,
        handleMoveImages,
    } = useFolderManager()

    // Mobile detection for responsive scroll behavior
    const isMobile = useIsMobile()

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
            // Template image for 9-shot cinematic layout
            // Use NEXT_PUBLIC_SITE_URL for public access, fallback to production URL
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://directorspalette.app'
            const cinematicTemplateUrl = `${siteUrl}/templates/cinematic-reference.png`

            // Proper cinematic grid prompt with detailed instructions
            const cinematicPrompt = `<instruction> Analyze the entire composition of the input image. Identify all key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship or interaction. Generate a cohesive 3x3 cinematic contact sheet featuring 9 distinct camera shots of exactly these subjects in the same environment. These shots must cover the full range from wide environmental framing to intimate close detail. Adapt the framing to fit the content: if the subject is a group, keep the group together; if the subject is an object, frame the entire object appropriately. Row 1 should consist of three progressively closer environmental/context shots, beginning with a very distant wide view, followed by a full-body view, and then a slightly tighter long-framing view. Row 2 should cover the core subject area: a waist-up framing, a chest-up framing, and a tight facial or frontal framing. Row 3 should focus on intimate details and angle variations: a macro detail shot, a dramatic low-angle upward shot, and a high-angle downward shot. Ensure strict consistency across all 9 frames: identical subjects, identical outfits, identical environment, identical lighting, and coherent scene continuity. Depth of field should become increasingly shallow as the framing moves closer, especially in the final row. </instruction> A professional 3x3 cinematic storyboard grid containing 9 panels, covering the entire visual range from wide environmental shots to macro detail. No labels, text, overlays, icons, or shot-type captions in any frame. Only clean cinematic imagery. Top row: wide environment, full-body, medium-long view. Middle row: waist-up, chest-up, tight face/front framing. Bottom row: macro detail, low-angle, high-angle. All frames must feature consistent photorealistic textures, cinematic color grading, and faithful continuity of subjects and scene. maintain the provided style`

            // Send BOTH the user's selected image AND the template image
            const response = await fetch('/api/generation/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nano-banana-pro', // Use Nano Banana Pro for best quality
                    prompt: cinematicPrompt,
                    referenceImages: [
                        { url: image.url, weight: 0.8 },          // User's selected image
                        { url: cinematicTemplateUrl, weight: 0.5 } // 9-shot layout template
                    ],
                    modelSettings: {
                        aspectRatio: '16:9', // Widescreen for cinematic output
                        resolution: '2K'
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
        useUnifiedGalleryStore.getState().loadFolders()
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

    // Handle retry for failed generations
    // Copies the prompt to clipboard and removes the failed entry
    const handleRetryGeneration = useCallback(async (image: GeneratedImage) => {
        // Copy prompt to clipboard for easy regeneration
        if (image.prompt) {
            try {
                await navigator.clipboard.writeText(image.prompt)
                toast({
                    title: "Prompt Copied",
                    description: "Paste the prompt in Shot Creator to regenerate. Failed entry removed."
                })
            } catch {
                toast({
                    title: "Retry Ready",
                    description: `Failed entry removed. Original prompt: "${image.prompt.slice(0, 100)}${image.prompt.length > 100 ? '...' : ''}"`
                })
            }
        }

        // Delete the failed entry
        await handleDeleteImage(image.url || image.id)
    }, [handleDeleteImage, toast])

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
                            onRetry={() => handleRetryGeneration(image)}
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
            <div className="flex flex-col md:flex-row md:h-full w-full">
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
                        onEditFolder={openEditModal}
                        onDeleteFolder={openDeleteModal}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                </div>

                {/* Gallery Content */}
                <Card className={cn("flex-1 md:h-full flex flex-col", className)}>
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
                        folders={folders}
                        onSelectAll={handleSelectAll}
                        onClearSelection={handleClearSelection}
                        onDeleteSelected={handleDeleteSelected}
                        onGridSizeChange={setGridSize}
                        onAspectRatioChange={setUseNativeAspectRatio}
                        onOpenMobileMenu={() => setIsMobileFolderMenuOpen(true)}
                        onMoveToFolder={async (folderId) => {
                            // Convert selected image URLs to IDs
                            const imageIds = selectedImages
                                .map(url => images.find(img => img.url === url)?.id)
                                .filter((id): id is string => !!id)
                            if (imageIds.length > 0) {
                                await handleMoveImages(imageIds, folderId)
                                handleClearSelection()
                                toast({
                                    title: "Images Moved",
                                    description: `${imageIds.length} images moved to ${folderId ? folders.find(f => f.id === folderId)?.name || 'folder' : 'Uncategorized'}`
                                })
                            }
                        }}
                        onBulkDownload={handleBulkDownload}
                        onCreateFolder={openCreateModal}
                    />

                    <CardContent className="flex-1 flex flex-col overflow-y-auto md:overflow-hidden">
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
                                {isMobile ? (
                                    <div className={cn("grid gap-4 pb-4", getGridClasses(gridSize))}>
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
                                                onRetry={() => handleRetryGeneration(image)}
                                            />
                                        ))}
                                    </div>
                                ) : (
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
                                                    onRetry={() => handleRetryGeneration(image)}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}

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
                                    <div className="text-center py-8">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/50 text-muted-foreground text-sm">
                                            <span className="text-emerald-400">✓</span>
                                            All {images.length} images loaded
                                        </div>
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