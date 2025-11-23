'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, ImageIcon } from 'lucide-react'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'
import { useState } from 'react'
import { GalleryService } from '@/features/shot-creator/services/gallery.service'
import { toast } from '@/hooks/use-toast'

interface ReferenceSelectionModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entityTag: string
    entityName: string
    entityType?: 'character' | 'location' | 'prop' // Optional - for future use
}

/**
 * Modal for selecting a reference image from gallery for a character/location
 */
export function ReferenceSelectionModal({
    open,
    onOpenChange,
    entityTag,
    entityName,
    entityType: _entityType
}: ReferenceSelectionModalProps) {
    const galleryImages = useUnifiedGalleryStore(state => state.images)
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState(false)

    // Filter to images that either have no reference or have any reference
    // (allowing re-assignment)
    const availableImages = galleryImages

    const handleAssign = async () => {
        if (!selectedImageId) return

        setIsAssigning(true)
        try {
            const normalizedTag = entityTag.startsWith('@') ? entityTag : `@${entityTag}`

            // Update the reference tag in the database
            const result = await GalleryService.updateReference(selectedImageId, normalizedTag)

            if (!result.success) {
                throw new Error(result.error || 'Failed to assign reference')
            }

            // Update local store
            const updateImageReference = useUnifiedGalleryStore.getState().updateImageReference
            await updateImageReference(selectedImageId, normalizedTag)

            toast({
                title: 'Reference Assigned',
                description: `Image tagged as ${normalizedTag} for ${entityName}`
            })

            onOpenChange(false)
            setSelectedImageId(null)
        } catch (error) {
            console.error('Error assigning reference:', error)
            toast({
                title: 'Assignment Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            })
        } finally {
            setIsAssigning(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        Select Reference Image for {entityName}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Choose an image from your gallery to use as a reference for{' '}
                        <code className="text-xs bg-slate-800 px-2 py-0.5 rounded text-green-400">
                            @{entityTag}
                        </code>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {/* Gallery Grid */}
                    <ScrollArea className="h-[50vh] rounded-lg border border-slate-700">
                        {availableImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <ImageIcon className="w-12 h-12 text-slate-600 mb-3" />
                                <p className="text-slate-400">No images in gallery</p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Generate some images first in Shot Creator
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                                {availableImages.map((image) => (
                                    <div
                                        key={image.id}
                                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                                            selectedImageId === image.id
                                                ? 'ring-4 ring-blue-500 scale-95'
                                                : 'hover:ring-2 hover:ring-slate-500'
                                        }`}
                                        onClick={() => setSelectedImageId(image.id)}
                                    >
                                        <img
                                            src={image.url}
                                            alt={image.prompt}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Current reference badge */}
                                        {image.reference && (
                                            <Badge
                                                variant="secondary"
                                                className="absolute top-1 right-1 text-xs bg-slate-900/90"
                                            >
                                                {image.reference}
                                            </Badge>
                                        )}
                                        {/* Selection indicator */}
                                        {selectedImageId === image.id && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                <div className="bg-blue-500 rounded-full p-2">
                                                    <svg
                                                        className="w-6 h-6 text-white"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={3}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false)
                                setSelectedImageId(null)
                            }}
                        >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssign}
                            disabled={!selectedImageId || isAssigning}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isAssigning ? 'Assigning...' : 'Assign Reference'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
