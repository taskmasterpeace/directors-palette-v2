'use client'

import { X, Download, Copy, Film, Layout, Eraser, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useShotCreatorStore } from "../store"
import Image from "next/image"
import { clipboardManager } from '@/utils/clipboard-manager'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { ReferenceEditor, ReferenceEditorExport } from './reference-editor'
import { logger } from '@/lib/logger'

interface FullscreenImageModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSendToAnimator?: (imageUrl: string) => void
    onSendToLayout?: (imageUrl: string) => void
    onRemoveBackground?: (imageUrl: string) => Promise<void>
    onSaveToGallery?: (imageUrl: string) => Promise<void>
    onDelete?: (imageId: string) => void
    onEditComplete?: (result: ReferenceEditorExport) => void
}

export default function FullscreenImageModal({
    open,
    onOpenChange,
    onSendToAnimator,
    onSendToLayout,
    onRemoveBackground,
    onSaveToGallery,
    onDelete,
    onEditComplete,
}: FullscreenImageModalProps) {
    const { fullscreenImage } = useShotCreatorStore()
    const { toast } = useToast()
    const [removingBackground, setRemovingBackground] = useState(false)
    const [savingToGallery, setSavingToGallery] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    if (!fullscreenImage) return null

    const imageUrl = fullscreenImage.preview || fullscreenImage.imageData

    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `reference_${fullscreenImage.id}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(blobUrl)
        } catch (error) {
            logger.shotCreator.error('Failed to download image', { error: error instanceof Error ? error.message : String(error) })
            toast({
                title: 'Download failed',
                description: 'Could not download image.',
                variant: 'destructive'
            })
        }
    }

    const handleCopyUrl = async () => {
        try {
            await clipboardManager.writeText(fullscreenImage.imageData)
            toast({ title: 'Copied', description: 'Image URL copied to clipboard' })
        } catch (error) {
            logger.shotCreator.error('Failed to copy', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Copy failed', variant: 'destructive' })
        }
    }

    const handleEditExport = (result: ReferenceEditorExport) => {
        if (onEditComplete) {
            onEditComplete(result)
        }
        setIsEditing(false)
        onOpenChange(false)
        toast({
            title: 'Reference Updated',
            description: result.hasAnnotations
                ? 'Annotations added to reference'
                : 'Reference image updated'
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!w-screen !h-screen !max-w-none !max-h-none sm:!max-w-none p-0 bg-black border-none rounded-none overflow-hidden inset-0 translate-x-0 translate-y-0 top-0 left-0"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">Image Preview</DialogTitle>

                {/* Close button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="fixed top-4 right-4 text-white hover:bg-white/20 z-50 bg-black/50 backdrop-blur-sm rounded-full w-10 h-10 p-0"
                    onClick={() => {
                        setIsEditing(false)
                        onOpenChange(false)
                    }}
                >
                    <X className="w-6 h-6" />
                </Button>

                {isEditing ? (
                    /* Reference Editor Mode - fits viewport */
                    <div className="w-full h-full">
                        <ReferenceEditor
                            backgroundImageUrl={imageUrl}
                            onExport={handleEditExport}
                            onClose={() => setIsEditing(false)}
                        />
                    </div>
                ) : (
                    /* View Mode */
                    <div className="flex flex-col w-full h-full">
                        {fullscreenImage && imageUrl && (
                            <div className="relative flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
                                <Image
                                    src={imageUrl}
                                    alt=""
                                    className="object-contain"
                                    fill
                                    sizes="100vw"
                                    priority
                                />

                                {/* Compact action bar */}
                                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-center gap-2 z-20">
                                    {/* Edit button - PRIMARY */}
                                    <Button
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-white"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                        onClick={handleCopyUrl}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                        onClick={handleDownload}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>

                                    {onRemoveBackground && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={async () => {
                                                setRemovingBackground(true)
                                                try {
                                                    await onRemoveBackground(imageUrl)
                                                } finally {
                                                    setRemovingBackground(false)
                                                }
                                            }}
                                            disabled={removingBackground}
                                        >
                                            {removingBackground ? (
                                                <LoadingSpinner size="sm" color="current" />
                                            ) : (
                                                <Eraser className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}

                                    {onSaveToGallery && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={async () => {
                                                setSavingToGallery(true)
                                                try {
                                                    await onSaveToGallery(imageUrl)
                                                } finally {
                                                    setSavingToGallery(false)
                                                }
                                            }}
                                            disabled={savingToGallery}
                                        >
                                            {savingToGallery ? (
                                                <LoadingSpinner size="sm" color="current" />
                                            ) : (
                                                <>Save</>
                                            )}
                                        </Button>
                                    )}

                                    {onSendToAnimator && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={() => {
                                                onSendToAnimator(imageUrl)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Film className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {onSendToLayout && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-black/60 text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={() => {
                                                onSendToLayout(imageUrl)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Layout className="h-4 w-4" />
                                        </Button>
                                    )}

                                    {onDelete && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="bg-black/60 text-red-400 border-red-600/50 hover:bg-red-900/50"
                                            onClick={() => {
                                                onDelete(fullscreenImage.id)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
