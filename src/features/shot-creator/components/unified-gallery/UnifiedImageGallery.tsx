'use client'

import { useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useReferenceNamePrompt } from '@/components/providers/PromptProvider'
import { useToast } from '@/hooks/use-toast'
import { Pagination } from './Pagination'
import { useGalleryLogic } from "../../hooks/useGalleryLogic"
import { ImageCard } from "./ImageCard"
import { GalleryHeader } from "./GalleryHeader"
import FullscreenModal from "./FullScreenModal"
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
        totalPages,
        filters,
        fullscreenImage,
        totalImages,
        totalCredits,
        handleCopyImage,
        handleDownloadImage,
        handleDeleteImage,
        handleSendTo,
        handleSearchChange,
        handlePageChange,
        setFullscreenImage,
        selectedImages,
        handleSelectAll,
        handleClearSelection,
        handleDeleteSelected,
        handleImageSelect,
        updateImageReference
    } = useGalleryLogic(onSendToTab, onUseAsReference, onSendToShotAnimator, onSendToLayoutAnnotation, onSendToLibrary, onImageSelect)

    const showReferenceNamePrompt = useReferenceNamePrompt()
    const { toast } = useToast()

    // Get grid size, pagination, and database count from store
    const gridSize = useUnifiedGalleryStore(state => state.gridSize)
    const setGridSize = useUnifiedGalleryStore(state => state.setGridSize)
    const totalDatabaseCount = useUnifiedGalleryStore(state => state.totalDatabaseCount)
    const currentPage = useUnifiedGalleryStore(state => state.currentPage)

    // Grid size to CSS classes mapping
    const getGridClasses = (size: GridSize): string => {
        switch (size) {
            case 'small':
                return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
            case 'medium':
                return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            case 'large':
                return 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            default:
                return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
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
                            showActions={true}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <Card className={cn("w-full h-full flex flex-col", className)}>
            <GalleryHeader
                totalImages={totalImages}
                totalDatabaseCount={totalDatabaseCount}
                totalCredits={totalCredits}
                searchQuery={filters.searchQuery}
                onSearchChange={handleSearchChange}
                selectedCount={selectedImages.length}
                gridSize={gridSize}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onDeleteSelected={handleDeleteSelected}
                onGridSizeChange={setGridSize}
            />

            <CardContent className="flex-1 flex flex-col overflow-hidden">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 mx-auto mb-4 border-4 border-slate-600 border-t-purple-500 rounded-full animate-spin" />
                        <p className="text-slate-400">Loading gallery...</p>
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-12">
                        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                        <p className="text-slate-400">No images generated yet</p>
                        <p className="text-sm text-slate-500 mt-2">
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
                                        showActions={true}
                                    />
                                ))}
                            </div>
                        </ScrollArea>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
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
                    showReferenceNamePrompt={showReferenceNamePrompt}
                />
            )}
        </Card>
    )
}