'use client'

import { X, Tag, Download, Copy, Film, Layout, Eraser, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
            <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-background border-border overflow-hidden">
                {/* Hidden title for accessibility */}
                <DialogTitle className="sr-only">Image Preview</DialogTitle>

                {/* Close button - fixed positioning for iOS */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="fixed top-[calc(env(safe-area-inset-top,0rem)+3rem)] right-[calc(env(safe-area-inset-right,0rem)+1rem)] md:absolute md:top-4 md:right-4 text-white hover:bg-white/20 z-20 bg-black/20 backdrop-blur-sm"
                    onClick={() => onOpenChange(false)}
                >
                    <X className="w-6 h-6" />
                </Button>

                <div className="flex flex-col h-full">
                    {/* Image container - takes up most space */}
                    {fullscreenImage && (fullscreenImage.imageData || fullscreenImage.preview) && (
                        <div className="relative flex-1 flex items-center justify-center bg-black/20 p-2 min-h-0 overflow-hidden">
                            <Image
                                src={fullscreenImage.preview || fullscreenImage.imageData}
                                alt=""
                                className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                width={500}
                                height={300}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto'
                                }}
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

                    {/* Information panel - minimal height */}
                    <div className="flex-shrink-0 bg-card/90 backdrop-blur-sm border-t border-border">
                        <div className="p-3 space-y-3">

                            {/* Tags section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium text-foreground">Tags</span>
                                </div>
                                <div className="flex gap-2 flex-wrap ml-6">
                                    {fullscreenImage.tags && fullscreenImage.tags.length > 0 ? (
                                        fullscreenImage.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-accent/80 hover:bg-accent text-white transition-colors">
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">No tags assigned</span>
                                    )}
                                </div>
                            </div>

                            {/* Metadata and Reference Tag section */}
                            <div className="grid grid-cols-1 lg:grid-cols-1 gap-2 items-start">
                                {/* Category and Source */}
                                <div className="lg:col-span-1 space-y-1">
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">Category:</span>
                                            <Badge variant="outline" className="text-foreground border-border bg-secondary/50">
                                                {fullscreenImage.category}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-foreground">Source:</span>
                                            <Badge variant="outline" className="text-foreground border-border bg-secondary/50">
                                                {fullscreenImage.source}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Prompt section */}
                            {fullscreenImage.prompt && (
                                <div className="border-t border-border pt-4">
                                    <div className="space-y-2">
                                        <span className="text-sm font-medium text-foreground">Generation Prompt</span>
                                        <p className="text-sm text-foreground leading-relaxed bg-secondary/30 rounded-lg p-3 border border-border">
                                            {fullscreenImage.prompt}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}