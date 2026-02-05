import React, { ReactNode, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Clipboard, Plus, Trash2, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { useShotCreatorSettings } from "../../hooks"
import { QuickModeIcons, QuickModePanel } from "../quick-modes"
import { shotImageToLibraryReference } from "../../helpers/type-adapters"

interface CreatorReferenceManagerCompactProps {
    editingMode?: boolean
    maxImages?: number
    modelSelector?: ReactNode
}

const CreatorReferenceManagerCompact = ({ maxImages = 3, modelSelector }: CreatorReferenceManagerCompactProps) => {
    const { shotCreatorReferenceImages, setFullscreenImage } = useShotCreatorStore()
    const { settings } = useShotCreatorSettings()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const {
        visibleSlots,
        handleMultipleImageUpload,
        handlePasteImage,
        removeShotCreatorImage
    } = useReferenceImageManager(maxImages)

    const quickMode = settings.quickMode || 'none'

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
            {/* Model selector, Quick Mode Icons, and Paste on same row */}
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

            {/* Horizontal compact layout */}
            <div className="flex gap-2">
                {Array.from({ length: visibleSlots }, (_, index: number) => index).map((index: number) => {
                    const image = shotCreatorReferenceImages[index]
                    const isEmpty = !image

                    return (
                        <div key={index} className="flex-1 max-w-[100px] min-w-[60px]">
                            <div
                                className={`relative aspect-square border border-dashed rounded-md overflow-hidden ${isEmpty
                                    ? 'border-border bg-card/50 hover:border-primary hover:bg-primary/10 cursor-pointer'
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
                                        onClick={() => fileInputRef.current?.click()}
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
    )
}

export default CreatorReferenceManagerCompact