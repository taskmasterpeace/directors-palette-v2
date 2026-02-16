'use client'

import { useEffect, useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
import { BulkActionsToolbar } from "./BulkActionsToolbar"
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
        handleImageSelectWithModifiers,
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
    const sourceFilter = useUnifiedGalleryStore(state => state.sourceFilter)
    const setSourceFilter = useUnifiedGalleryStore(state => state.setSourceFilter)

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

    // Helper to check if an image is a 3x3 grid (for Extract Cells feature)
    const isGridImage = useCallback((image: GeneratedImage): boolean => {
        // Check metadata flags
        if (image.metadata?.isGrid) return true
        if (image.metadata?.gridType) return true
        return false
    }, [])

    // Local UI state
    const [isMobileFolderMenuOpen, setIsMobileFolderMenuOpen] = useState(false)
    const [removingBackgroundId, setRemovingBackgroundId] = useState<string | null>(null)
    const [generatingCinematicId, setGeneratingCinematicId] = useState<string | null>(null)
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)


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

            // Cinematic 9-shot grid prompt - each cell MUST be a different camera angle
            const cinematicPrompt = `Create a 3x3 cinematic contact sheet grid showing the SAME SUBJECT from 9 COMPLETELY DIFFERENT camera angles. Each cell must be visually distinct - NO DUPLICATE ANGLES.

CRITICAL: Every single cell must show a DIFFERENT camera position and framing. The subject, lighting, and environment stay consistent, but the CAMERA ANGLE changes dramatically for each cell.

THE 9 REQUIRED SHOTS (in grid order, left to right, top to bottom):

ROW 1 - WIDE SHOTS:
Cell 1: ESTABLISHING SHOT - Extreme wide, subject tiny in frame, showing full environment
Cell 2: WIDE SHOT - Full body visible, environmental context, subject clearly seen
Cell 3: MEDIUM WIDE - Knee-up framing, closer but still showing surroundings

ROW 2 - MEDIUM SHOTS:
Cell 4: MEDIUM SHOT - Waist-up framing, conversational distance
Cell 5: MEDIUM CLOSE-UP - Chest and shoulders, more intimate
Cell 6: CLOSE-UP - Face/front fills most of frame, emotional connection

ROW 3 - DETAIL & ANGLE SHOTS:
Cell 7: EXTREME CLOSE-UP - Macro detail (eyes, hands, texture)
Cell 8: LOW ANGLE - Camera looking UP at subject, heroic/powerful perspective
Cell 9: HIGH ANGLE - Camera looking DOWN at subject, overhead view

RULES:
- Same subject, same outfit, same environment, same lighting in ALL 9 cells
- Each cell MUST be a distinctly different shot - if two cells look similar, you've failed
- Clear thin borders between cells
- No text, labels, or overlays
- Cinematic color grading throughout
- Maintain the visual style of the reference image`

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
                    },
                    // Mark as grid for Extract Cells feature
                    extraMetadata: {
                        source: 'shot-creator',
                        isGrid: true,
                        gridType: 'angles'
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

    // State for B-Roll generation
    const [generatingBRollId, setGeneratingBRollId] = useState<string | null>(null)

    // Handle B-Roll Grid generation (same pattern as Cinematic Grid)
    const handleGenerateBRollGrid = useCallback(async (image: GeneratedImage) => {
        if (generatingBRollId) return // Prevent multiple concurrent generations

        setGeneratingBRollId(image.id)
        toast({
            title: "Generating B-Roll Grid",
            description: "Creating 9 complementary B-roll shots... This may take a moment."
        })

        try {
            // B-Roll prompt - generates 9 different scene elements that match the reference
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
                    model: 'nano-banana-pro',
                    prompt: brollPrompt,
                    referenceImages: [
                        { url: image.url, weight: 0.8 } // User's selected image as reference
                    ],
                    modelSettings: {
                        aspectRatio: '16:9',
                        resolution: '2K'
                    },
                    // Mark as grid for Extract Cells feature
                    extraMetadata: {
                        source: 'shot-creator',
                        isGrid: true,
                        gridType: 'broll'
                    }
                })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to generate B-roll grid')
            }

            toast({
                title: "B-Roll Grid Generated!",
                description: "Grid saved to gallery. Use 'Extract to Gallery' to split into individual shots."
            })

            // Refresh gallery to show the new image
            setTimeout(async () => {
                await useUnifiedGalleryStore.getState().refreshGallery()
            }, 1000)
        } catch (error) {
            console.error('B-Roll grid generation error:', error)
            toast({
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive"
            })
        } finally {
            setGeneratingBRollId(null)
        }
    }, [generatingBRollId, toast])

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

    // Handle bulk moving selected images to folder (for BulkActionsToolbar)
    const handleBulkMoveToFolder = useCallback(async (folderId: string | null) => {
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
    }, [selectedImages, images, handleMoveImages, handleClearSelection, folders, toast])

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

    // Keyboard event handler for fullscreen modal
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

    // Keyboard shortcuts for gallery selection
    // Escape: clear selection, Delete/Backspace: trigger delete, Ctrl/Cmd+A: select all
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't handle shortcuts when fullscreen modal is open (it has its own handlers)
            if (fullscreenImage) return

            // Don't handle shortcuts when typing in an input or textarea
            const target = event.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return
            }

            // Don't handle shortcuts when a modal/dialog is open (except our delete confirm)
            if (modalMode !== null || downloadModalOpen) {
                return
            }

            // Escape: Clear selection
            if (event.key === 'Escape' && selectedImages.length > 0) {
                event.preventDefault()
                // If delete confirmation is open, close it instead of clearing selection
                if (showBulkDeleteConfirm) {
                    setShowBulkDeleteConfirm(false)
                } else {
                    handleClearSelection()
                }
                return
            }

            // Delete or Backspace: Trigger delete confirmation when images are selected
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedImages.length > 0) {
                event.preventDefault()
                setShowBulkDeleteConfirm(true)
                return
            }

            // Ctrl/Cmd+A: Select all visible images
            if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                handleSelectAll()
                return
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [
        fullscreenImage,
        selectedImages.length,
        showBulkDeleteConfirm,
        modalMode,
        downloadModalOpen,
        handleClearSelection,
        handleSelectAll
    ])

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
                            onExtractFrames={isGridImage(image) ? () => handleExtractFrames(image.url) : undefined}
                            onExtractFramesToGallery={isGridImage(image) ? () => handleExtractFramesToGallery(image.url, image.id) : undefined}
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

    // Determine if we're in selection mode (any images selected)
    const isSelectionMode = selectedImages.length > 0

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
            <div className="md:flex md:flex-row md:h-full w-full">
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
                <Card className={cn("md:flex-1 md:h-full flex flex-col", className)}>
                    <GalleryHeader
                        totalImages={totalImages}
                        totalDatabaseCount={totalDatabaseCount}
                        totalCredits={totalCredits}
                        searchQuery={filters.searchQuery}
                        currentFolderName={currentFolderName}
                        gridSize={gridSize}
                        useNativeAspectRatio={useNativeAspectRatio}
                        sourceFilter={sourceFilter}
                        onSearchChange={handleSearchChange}
                        onSelectAll={handleSelectAll}
                        onGridSizeChange={setGridSize}
                        onAspectRatioChange={setUseNativeAspectRatio}
                        onSourceFilterChange={setSourceFilter}
                        onOpenMobileMenu={() => setIsMobileFolderMenuOpen(true)}
                    />

                    <CardContent className={cn(
                        "flex-1 flex flex-col md:overflow-hidden transition-all duration-300",
                        isSelectionMode && "ring-2 ring-inset ring-primary/20 bg-primary/[0.02]"
                    )}>
                        {isLoading ? (
                            <div className="text-center py-12">
                                <LoadingSpinner size="xl" color="accent" className="mx-auto mb-4" />
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
                                                isSelectionMode={isSelectionMode}
                                                onSelect={(e) => e ? handleImageSelectWithModifiers(image.url, e) : handleImageSelect(image.url)}
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
                                                onExtractFrames={isGridImage(image) ? () => handleExtractFrames(image.url) : undefined}
                                                onExtractFramesToGallery={isGridImage(image) ? () => handleExtractFramesToGallery(image.url, image.id) : undefined}
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
                                                    isSelectionMode={isSelectionMode}
                                                    onSelect={(e) => e ? handleImageSelectWithModifiers(image.url, e) : handleImageSelect(image.url)}
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
                                                    onExtractFrames={isGridImage(image) ? () => handleExtractFrames(image.url) : undefined}
                                                    onExtractFramesToGallery={isGridImage(image) ? () => handleExtractFramesToGallery(image.url, image.id) : undefined}
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
                            onSetReference={async (id: string, ref: string) => {
                                await updateImageReference(id, ref)
                            }}
                            onAddToLibrary={onSendToLibrary && fullscreenImage ? () => onSendToLibrary(fullscreenImage.url, fullscreenImage.id) : undefined}
                            onExtractFrames={isGridImage(fullscreenImage) ? () => handleExtractFrames(fullscreenImage.url) : undefined}
                            onExtractFramesToGallery={isGridImage(fullscreenImage) ? () => handleExtractFramesToGallery(fullscreenImage.url, fullscreenImage.id) : undefined}
                            onRemoveBackground={() => handleRemoveBackground(fullscreenImage)}
                            isRemovingBackground={removingBackgroundId === fullscreenImage.id}
                            onGenerateCinematicGrid={() => handleGenerateCinematicGrid(fullscreenImage)}
                            isGeneratingCinematic={generatingCinematicId === fullscreenImage.id}
                            onGenerateBRollGrid={() => handleGenerateBRollGrid(fullscreenImage)}
                            isGeneratingBRoll={generatingBRollId === fullscreenImage.id}
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

                {/* Bulk Actions Toolbar - floating at bottom of viewport when items selected */}
                <BulkActionsToolbar
                    selectedCount={selectedImages.length}
                    folders={folders}
                    onClearSelection={handleClearSelection}
                    onDownloadZip={handleBulkDownload}
                    onMoveToFolder={handleBulkMoveToFolder}
                    onCreateFolder={openCreateModal}
                    onDelete={handleDeleteSelected}
                    deleteConfirmOpen={showBulkDeleteConfirm}
                    onDeleteConfirmChange={setShowBulkDeleteConfirm}
                />
            </div>
        </>
    )
}