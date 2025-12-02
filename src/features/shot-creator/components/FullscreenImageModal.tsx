'use client'

import { X, Tag, Download, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useShotCreatorStore } from "../store"
import Image from "next/image"
import { clipboardManager } from '@/utils/clipboard-manager'

interface FullscreenImageModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function FullscreenImageModal({
    open,
    onOpenChange,
}: FullscreenImageModalProps) {
    const { fullscreenImage } = useShotCreatorStore()

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
            alert('Could not download image. Please try again.')
        }
    }

    const handleCopyUrl = async () => {
        try {
            await clipboardManager.writeText(fullscreenImage.imageData)
            // Fallback for older browsers if needed
            const textArea = document.createElement('textarea')
            textArea.value = fullscreenImage.imageData
            textArea.style.position = 'fixed'
            textArea.style.left = '-999999px'
            textArea.style.top = '-999999px'
            document.body.appendChild(textArea)
            textArea.focus()
            textArea.select()

            try {
                document.execCommand('copy')
            } finally {
                document.body.removeChild(textArea)
            }
        } catch (error) {
            console.error('Failed to copy:', error)
            // Show user feedback
            alert('Could not copy to clipboard. Please manually copy the fullscreenImage URL.')
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
                            <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleCopyUrl}
                                    className="bg-card/70 hover:bg-secondary text-white border-border backdrop-blur-sm"
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleDownload}
                                    className="bg-card/70 hover:bg-secondary text-white border-border backdrop-blur-sm"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                </Button>
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