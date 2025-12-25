"use client"

import * as React from "react"
import Image from "next/image"
import { Upload, Clipboard, Expand, Trash2, Edit, Camera, Eraser, Download } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import InlineTagEditor from "./InlineTagEditor"
import { Capacitor } from '@capacitor/core'
import { cn } from "@/utils/utils"

// ImageData type can be extended
export interface ShotImage {
    id: string
    preview: string
    tags: string[]
    detectedAspectRatio?: string // e.g., "16:9", "4:3", "1:1"
}

// Helper to convert aspect ratio string to CSS aspect-ratio value
function getAspectRatioStyle(aspectRatio?: string): React.CSSProperties | undefined {
    if (!aspectRatio) return undefined
    const [w, h] = aspectRatio.split(':').map(Number)
    if (w && h) {
        return { aspectRatio: `${w} / ${h}` }
    }
    return undefined
}

interface ReferenceImageCardProps {
    index: number
    image?: ShotImage
    isEmpty?: boolean
    editingTagsId: string | null
    setEditingTagsId: React.Dispatch<React.SetStateAction<string | null>>
    shotCreatorReferenceImages: ShotImage[]
    setShotCreatorReferenceImages: React.Dispatch<React.SetStateAction<ShotImage[]>>
    handleShotCreatorImageUpload: (file: File) => void
    handleMultipleImageUpload?: (files: FileList | null) => void
    handlePasteImage: (e: React.MouseEvent<HTMLButtonElement>) => void
    handleCameraCapture?: () => void
    removeShotCreatorImage: (id: string) => void
    setFullscreenImage: (img: ShotImage) => void
    useNativeAspectRatio?: boolean
    // Action callbacks
    onRemoveBackground?: (image: ShotImage) => Promise<void>
    onSaveToGallery?: (image: ShotImage) => Promise<void>
    isRemovingBackground?: boolean
    isSavingToGallery?: boolean
}

export function ReferenceImageCard({
    index,
    image,
    isEmpty = false,
    editingTagsId,
    setEditingTagsId,
    shotCreatorReferenceImages,
    setShotCreatorReferenceImages,
    handleShotCreatorImageUpload,
    handleMultipleImageUpload,
    handlePasteImage,
    handleCameraCapture,
    removeShotCreatorImage,
    setFullscreenImage,
    useNativeAspectRatio = false,
    onRemoveBackground,
    onSaveToGallery,
    isRemovingBackground = false,
    isSavingToGallery = false
}: ReferenceImageCardProps) {
    const isNative = Capacitor.isNativePlatform()
    return (
        <div key={index} className="space-y-3">
            {/* Upload / Preview Box */}
            <div
                className={`relative rounded-xl overflow-hidden transition-all ${isEmpty
                    ? "min-h-[240px] md:min-h-[160px] md:aspect-square bg-gradient-to-br from-card to-background border border-border hover:border-border cursor-pointer touch-manipulation"
                    : "border-2 border-primary bg-primary/15 shadow-lg shadow-primary/20"
                    }`}
                onClick={
                    isEmpty
                        ? () => {
                            const input = document.createElement("input")
                            input.type = "file"
                            input.accept = "image/*"
                            input.multiple = true
                            input.onchange = (e) => {
                                const files = (e.target as HTMLInputElement).files
                                if (files && files.length > 0) {
                                    if (handleMultipleImageUpload) {
                                        handleMultipleImageUpload(files)
                                    } else if (files[0]) {
                                        handleShotCreatorImageUpload(files[0])
                                    }
                                }
                            }
                            input.click()
                        }
                        : undefined
                }
            >
                {image ? (
                    <>
                        <div
                            className={cn(
                                "w-full relative",
                                !useNativeAspectRatio && "aspect-square"
                            )}
                            style={useNativeAspectRatio ? getAspectRatioStyle(image.detectedAspectRatio) || { aspectRatio: '16 / 9' } : undefined}
                        >
                            <Image
                                src={image.preview}
                                alt={`Reference ${index + 1}`}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 53vw"
                                className={cn(
                                    "w-full h-full cursor-pointer",
                                    useNativeAspectRatio ? "object-contain bg-black/20" : "object-cover"
                                )}
                                onClick={() => setFullscreenImage(image)}
                            />
                        </div>
                        {/* Action buttons row at bottom */}
                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                            <div className="flex gap-1">
                                {/* Fullscreen button */}
                                <TooltipProvider delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 md:h-6 md:w-6 bg-black/50 hover:bg-black/70"
                                                onClick={() => setFullscreenImage(image)}
                                            >
                                                <Expand className="h-4 w-4 md:h-3 md:w-3 text-white" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                            View fullscreen
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>

                                {/* Remove Background button */}
                                {onRemoveBackground && (
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 md:h-6 md:w-6 bg-black/50 hover:bg-black/70"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onRemoveBackground(image)
                                                    }}
                                                    disabled={isRemovingBackground}
                                                >
                                                    {isRemovingBackground ? (
                                                        <LoadingSpinner size="sm" color="current" className="md:h-3 md:w-3" />
                                                    ) : (
                                                        <Eraser className="h-4 w-4 md:h-3 md:w-3 text-white" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                                Remove background (3 pts)
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                {/* Save to Gallery button */}
                                {onSaveToGallery && (
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 md:h-6 md:w-6 bg-black/50 hover:bg-black/70"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onSaveToGallery(image)
                                                    }}
                                                    disabled={isSavingToGallery}
                                                >
                                                    {isSavingToGallery ? (
                                                        <LoadingSpinner size="sm" color="current" className="md:h-3 md:w-3" />
                                                    ) : (
                                                        <Download className="h-4 w-4 md:h-3 md:w-3 text-white" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">
                                                Save to gallery
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                        {/* Delete button */}
                        <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8 p-0 md:h-6 md:w-6"
                            onClick={(e) => {
                                e.stopPropagation()
                                removeShotCreatorImage(image.id)
                            }}
                        >
                            <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
                        </Button>
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-8">
                            <Upload className="h-12 w-12 md:h-8 md:w-8 text-muted-foreground mx-auto mb-3 md:mb-2" />
                            <p className="text-sm md:text-xs text-muted-foreground font-medium">
                                Tap to add Reference {index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 md:hidden">or use buttons below</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className={`grid gap-4 md:flex md:flex-row md:gap-2 ${isNative && handleCameraCapture ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <Button
                    size="lg"
                    variant="outline"
                    className="h-16 md:h-8 md:flex-1 border-border hover:border-border bg-card/50 hover:bg-card flex items-center justify-center"
                    onClick={handlePasteImage}
                >
                    <Clipboard className="h-6 w-6 md:h-4 md:w-4" />
                    <span className="ml-2 md:ml-1 text-sm md:text-xs">Paste</span>
                </Button>
                {isNative && handleCameraCapture && (
                    <Button
                        size="lg"
                        variant="outline"
                        className="h-16 md:h-8 md:flex-1 border-border hover:border-border bg-card/50 hover:bg-card flex items-center justify-center"
                        onClick={handleCameraCapture}
                    >
                        <Camera className="h-6 w-6 md:h-4 md:w-4" />
                        <span className="ml-2 md:ml-1 text-sm md:text-xs">Camera</span>
                    </Button>
                )}
                <Button
                    size="lg"
                    variant="outline"
                    className="h-16 md:h-8 md:flex-1 border-border hover:border-border bg-card/50 hover:bg-card flex items-center justify-center"
                    onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.multiple = true
                        input.onchange = (e) => {
                            const files = (e.target as HTMLInputElement).files
                            if (files && files.length > 0) {
                                if (handleMultipleImageUpload) {
                                    handleMultipleImageUpload(files)
                                } else if (files[0]) {
                                    handleShotCreatorImageUpload(files[0])
                                }
                            }
                        }
                        input.click()
                    }}
                >
                    <Upload className="h-6 w-6 md:h-4 md:w-4" />
                    <span className="ml-2 md:ml-1 text-sm md:text-xs">Browse</span>
                </Button>
            </div>

            {/* Tags section */}
            {image && (
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tags</Label>
                    {editingTagsId === image.id ? (
                        <InlineTagEditor
                            initialTags={image.tags}
                            onSave={(newTags: string[]) => {
                                const updatedImages = shotCreatorReferenceImages.map((img) =>
                                    img.id === image.id ? { ...img, tags: newTags } : img
                                )
                                setShotCreatorReferenceImages(updatedImages)
                                setEditingTagsId(null)
                            }}
                            onCancel={() => setEditingTagsId(null)}
                        />
                    ) : (
                        <div className="flex items-center gap-1">
                            <div className="flex-1">
                                {image.tags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {image.tags.map((tag, tagIndex) => (
                                            <Badge key={tagIndex} variant="outline" className="text-xs">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground">No tags</span>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => setEditingTagsId(image.id)}
                            >
                                <Edit className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
