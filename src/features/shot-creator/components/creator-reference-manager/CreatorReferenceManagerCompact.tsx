import React, { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Clipboard, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useShotCreatorStore } from "../../store/shot-creator.store"
import { useReferenceImageManager } from "../../hooks/useReferenceImageManager"
import { useShotCreatorSettings } from "../../hooks"
import { QuickModeIcons, QuickModePanel } from "../quick-modes"

interface CreatorReferenceManagerCompactProps {
    editingMode?: boolean
    maxImages?: number
    modelSelector?: ReactNode
}

const CreatorReferenceManagerCompact = ({ maxImages = 3, modelSelector }: CreatorReferenceManagerCompactProps) => {
    const { shotCreatorReferenceImages } = useShotCreatorStore()
    const { settings } = useShotCreatorSettings()

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

            {/* Horizontal compact layout */}
            <div className="flex gap-2">
                {Array.from({ length: visibleSlots }, (_, index: number) => index).map((index: number) => {
                    const image = shotCreatorReferenceImages[index]
                    const isEmpty = !image

                    return (
                        <div key={index} className="flex-1 max-w-[100px]">
                            <div
                                className={`relative aspect-square border border-dashed rounded-md overflow-hidden ${isEmpty
                                    ? 'border-border bg-card/50 hover:border-border cursor-pointer'
                                    : 'border-primary bg-primary/15'
                                    }`}
                            >
                                {image ? (
                                    <>
                                        <Image
                                            src={image.preview}
                                            alt={`Ref ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            width={250}
                                            height={250}
                                        />
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="absolute top-0.5 right-0.5 h-4 w-4 p-0"
                                            onClick={() => removeShotCreatorImage(image.id)}
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </>
                                ) : (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center cursor-pointer"
                                        onClick={() => {
                                            const input = document.createElement('input')
                                            input.type = 'file'
                                            input.accept = 'image/*'
                                            input.multiple = true
                                            input.onchange = (e) => {
                                                const files = (e.target as HTMLInputElement).files
                                                if (files && files.length > 0) {
                                                    handleMultipleImageUpload(files)
                                                }
                                            }
                                            input.click()
                                        }}
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