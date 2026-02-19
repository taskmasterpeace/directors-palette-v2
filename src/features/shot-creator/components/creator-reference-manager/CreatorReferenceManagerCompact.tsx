import React, { ReactNode, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Clipboard, Plus, Trash2, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { useShotCreatorSettings } from "../../hooks"
import { QuickModeIcons, QuickModePanel } from "../quick-modes"
import { shotImageToLibraryReference } from "../../helpers/type-adapters"

// Anchor Transform limit - max images when anchor mode is enabled (1 anchor + 15 transforms)
const ANCHOR_TRANSFORM_MAX_IMAGES = 16

interface CreatorReferenceManagerCompactProps {
    editingMode?: boolean
    maxImages?: number
    modelSelector?: ReactNode
}

const CreatorReferenceManagerCompact = ({ maxImages = 3, modelSelector }: CreatorReferenceManagerCompactProps) => {
    const { shotCreatorReferenceImages, setFullscreenImage } = useShotCreatorStore()
    const { settings } = useShotCreatorSettings()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragOver, setIsDragOver] = useState(false)

    // When anchor mode is enabled, use the anchor transform limit
    const isAnchorMode = settings.enableAnchorTransform
    const effectiveMaxImages = isAnchorMode
        ? Math.min(maxImages, ANCHOR_TRANSFORM_MAX_IMAGES)
        : maxImages

    const {
        visibleSlots,
        handleMultipleImageUpload,
        handlePasteImage,
        removeShotCreatorImage
    } = useReferenceImageManager(effectiveMaxImages)

    const quickMode = settings.quickMode || 'none'

    // Calculate remaining slots for anchor mode display
    const currentCount = shotCreatorReferenceImages.length
    const transformCount = isAnchorMode && currentCount > 0 ? currentCount - 1 : 0

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true)
        }
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            // Filter to only image files
            const imageFiles = Array.from(files).filter(file =>
                file.type.startsWith('image/')
            )
            if (imageFiles.length > 0) {
                const dt = new DataTransfer()
                imageFiles.forEach(file => dt.items.add(file))
                handleMultipleImageUpload(dt.files)
            }
        }
    }, [handleMultipleImageUpload])

    // For text-only models (maxImages === 0), show simplified UI
    if (maxImages === 0) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    {modelSelector}
                </div>
                <div className="text-xs text-muted-foreground italic">
                    This model generates from text only
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {/* Model selector, Quick Mode Icons, and Paste button */}
            <div className="flex items-center justify-between gap-2">
                {modelSelector}
                <div className="flex items-center gap-1">
                    <QuickModeIcons />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handlePasteImage(e)}
                        className="h-7 px-2 border-border hover:border-border"
                    >
                        <Clipboard className="h-3 w-3 mr-1" />
                        Paste
                    </Button>
                </div>
            </div>

            {/* Quick mode panel (only when active) */}
            {quickMode !== 'none' && (
                <QuickModePanel mode={quickMode} />
            )}

            {/* Hidden file input - always in DOM for reliable triggering */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                    const files = e.target.files
                    if (files && files.length > 0) {
                        handleMultipleImageUpload(files)
                    }
                    // Reset input so same file can be selected again
                    e.target.value = ''
                }}
            />

            {/* Anchor mode indicator */}
            {isAnchorMode && currentCount >= 2 && (
                <div className="text-xs text-orange-400 flex items-center gap-1">
                    <span className="font-mono font-bold">¡</span>
                    <span>Anchor mode: {transformCount} generation{transformCount !== 1 ? 's' : ''}</span>
                    <span className="text-muted-foreground">(max 15)</span>
                </div>
            )}

            {/* Drop zone wrapper for drag & drop images */}
            <div
                data-drop-zone="true"
                className={`relative rounded-lg transition-all ${
                    isDragOver
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5'
                        : ''
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drop overlay */}
                {isDragOver && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center z-20 pointer-events-none">
                        <div className="text-primary font-medium text-sm">Drop images here</div>
                    </div>
                )}

                {/* Horizontal compact layout */}
                <div className="flex gap-2">
                {Array.from({ length: visibleSlots }, (_, index: number) => index).map((index: number) => {
                    const image = shotCreatorReferenceImages[index]
                    const isEmpty = !image
                    const isAnchorImage = isAnchorMode && index === 0 && image

                    return (
                        <div key={index} className="flex-1 max-w-[100px] min-w-[60px]">
                            <div
                                className={`relative aspect-square border border-dashed rounded-md overflow-hidden ${isEmpty
                                    ? 'border-border bg-card/50 hover:border-primary hover:bg-primary/10 cursor-pointer'
                                    : isAnchorImage
                                        ? 'border-orange-500 bg-orange-500/15'
                                        : 'border-primary bg-primary/15'
                                    }`}
                                onClick={isEmpty ? () => fileInputRef.current?.click() : undefined}
                            >
                                {image ? (
                                    <div
                                        className="w-full h-full cursor-pointer group"
                                        onClick={() => setFullscreenImage(shotImageToLibraryReference(image))}
                                    >
                                        <Image
                                            src={image.preview}
                                            alt={`Ref ${index + 1}`}
                                            className="w-full h-full object-cover transition-all duration-200 group-hover:brightness-75"
                                            width={250}
                                            height={250}
                                        />
                                        {/* Anchor badge for first image in anchor mode */}
                                        {isAnchorImage && (
                                            <div className="absolute top-0.5 left-0.5 bg-orange-500 text-white text-[8px] font-bold px-1 rounded z-10">
                                                ANCHOR
                                            </div>
                                        )}
                                        {/* Magnifying glass overlay on hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            <div className="bg-black/60 rounded-full p-2 backdrop-blur-sm">
                                                <ZoomIn className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        {/* Delete button */}
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="absolute top-0.5 right-0.5 h-4 w-4 p-0 z-10"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeShotCreatorImage(image.id)
                                            }}
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 hover:bg-primary/10"
                                    >
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
                </div>
            </div>
        </div>
    )
}

export default CreatorReferenceManagerCompact