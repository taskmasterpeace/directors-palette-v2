'use client'

import { X, Download, Copy, Film, Layout, Eraser, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useShotCreatorStore } from "../store"
import Image from "next/image"
import { clipboardManager } from '@/utils/clipboard-manager'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'

interface FullscreenImageModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSendToAnimator?: (imageUrl: string) => void
    onSendToLayout?: (imageUrl: string) => void
    onRemoveBackground?: (imageUrl: string) => Promise<void>
    onSaveToGallery?: (imageUrl: string) => Promise<void>
    onDelete?: (imageId: string) => void
}

export default function FullscreenImageModal({
    open,
    onOpenChange,
    onSendToAnimator,
    onSendToLayout,
    onRemoveBackground,
    onSaveToGallery,
    onDelete,
}: FullscreenImageModalProps) {
    const { fullscreenImage } = useShotCreatorStore()
    const { toast } = useToast()
    const [removingBackground, setRemovingBackground] = useState(false)
    const [savingToGallery, setSavingToGallery] = useState(false)

    if (!fullscreenImage) return null

    const handleDownload = async () => {
        try {
            const imageUrl = fullscreenImage.preview || fullscreenImage.imageData

            // Fetch the image as a blob
            const response = await fetch(imageUrl)
            const blob = await response.blob()

            // Create a temporary URL for the blob
            const blobUrl = URL.createObjectURL(blob)

            // Create and trigger download
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = `reference_${fullscreenImage.id}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            // Clean up the blob URL
            URL.revokeObjectURL(blobUrl)
        } catch (error) {
            console.error('Failed to download image:', error)
            toast({
                title: 'Download failed',
                description: 'Could not download image. Please try again.',
                variant: 'destructive'
            })
        }
    }

    const handleCopyUrl = async () => {
        try {
            await clipboardManager.writeText(fullscreenImage.imageData)
            toast({
                title: 'Copied',
                description: 'Image URL copied to clipboard'
            })
        } catch (error) {
            console.error('Failed to copy:', error)
            toast({
                title: 'Copy failed',
                description: 'Could not copy to clipboard. Please try again.',
                variant: 'destructive'
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!w-screen !h-screen !max-w-none !max-h-none sm:!max-w-none p-0 bg-black border-none rounded-none overflow-hidden inset-0 translate-x-0 translate-y-0 top-0 left-0"
                showCloseButton={false}
            >
                {/* Hidden title for accessibility */}
                <DialogTitle className="sr-only">Image Preview</DialogTitle>

                {/* Close button - fixed positioning */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="fixed top-4 right-4 text-white hover:bg-white/20 z-50 bg-black/50 backdrop-blur-sm rounded-full w-10 h-10 p-0"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="w-6 h-6" />
                </Button>

                <div className="flex flex-col w-full h-full">
                    {/* Image container - TRUE fullscreen */}
                    {fullscreenImage && (fullscreenImage.imageData || fullscreenImage.preview) && (
                        <div className="relative flex-1 flex items-center justify-center bg-black min-h-0 overflow-hidden">
                            <Image
                                src={fullscreenImage.preview || fullscreenImage.imageData}
                                alt=""
                                className="object-contain"
                                fill
                                sizes="100vw"
                                priority
                            />

                            {/* --- Action buttons overlay --- */}
                            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 z-20">
                                {/* Action buttons grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-white border-zinc-600 hover:bg-zinc-700"
                                        onClick={handleCopyUrl}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        Copy
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-white border-zinc-600 hover:bg-zinc-700"
                                        onClick={handleDownload}
                                    >
                                        <Download className="h-4 w-4 mr-1" />
                                        Download
                                    </Button>
                                    {onRemoveBackground && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={async () => {
                                                setRemovingBackground(true)
                                                try {
                                                    const imageUrl = fullscreenImage.preview || fullscreenImage.imageData
                                                    await onRemoveBackground(imageUrl)
                                                } finally {
                                                    setRemovingBackground(false)
                                                }
                                            }}
                                            disabled={removingBackground}
                                        >
                                            {removingBackground ? (
                                                <LoadingSpinner size="sm" color="current" className="mr-1" />
                                            ) : (
                                                <Eraser className="h-4 w-4 mr-1" />
                                            )}
                                            {removingBackground ? 'Removing...' : 'Remove BG'}
                                        </Button>
                                    )}
                                    {onSaveToGallery && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={async () => {
                                                setSavingToGallery(true)
                                                try {
                                                    const imageUrl = fullscreenImage.preview || fullscreenImage.imageData
                                                    await onSaveToGallery(imageUrl)
                                                } finally {
                                                    setSavingToGallery(false)
                                                }
                                            }}
                                            disabled={savingToGallery}
                                        >
                                            {savingToGallery ? (
                                                <LoadingSpinner size="sm" color="current" className="mr-1" />
                                            ) : (
                                                <Download className="h-4 w-4 mr-1" />
                                            )}
                                            {savingToGallery ? 'Saving...' : 'Save to Gallery'}
                                        </Button>
                                    )}
                                    {onSendToAnimator && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={() => {
                                                const imageUrl = fullscreenImage.preview || fullscreenImage.imageData
                                                onSendToAnimator(imageUrl)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Film className="h-4 w-4 mr-1" />
                                            Animator
                                        </Button>
                                    )}
                                    {onSendToLayout && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-white border-zinc-600 hover:bg-zinc-700"
                                            onClick={() => {
                                                const imageUrl = fullscreenImage.preview || fullscreenImage.imageData
                                                onSendToLayout(imageUrl)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Layout className="h-4 w-4 mr-1" />
                                            Layout
                                        </Button>
                                    )}
                                </div>

                                {/* Delete button - separate row */}
                                {onDelete && (
                                    <div className="mt-3 pt-3 border-t border-zinc-700">
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => {
                                                onDelete(fullscreenImage.id)
                                                onOpenChange(false)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Remove Reference
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    )
}