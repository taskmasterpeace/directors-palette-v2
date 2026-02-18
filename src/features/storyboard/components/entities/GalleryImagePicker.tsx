'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Images, Loader2 } from 'lucide-react'
import { useUnifiedGalleryStore, type GeneratedImage } from '@/features/shot-creator/store/unified-gallery-store'
import { GalleryService } from '@/features/shot-creator/services/gallery.service'

interface GalleryImagePickerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (url: string, galleryId?: string) => void
    defaultMetadataTypeFilter?: string
}

type SourceFilter = GeneratedImage['source'] | null

const SOURCE_OPTIONS: { label: string; value: SourceFilter }[] = [
    { label: 'All', value: null },
    { label: 'Storyboard', value: 'storyboard' },
    { label: 'Shot Creator', value: 'shot-creator' },
    { label: 'Storybook', value: 'storybook' },
    { label: 'Adhub', value: 'adhub' },
]

export function GalleryImagePicker({ open, onOpenChange, onSelect, defaultMetadataTypeFilter }: GalleryImagePickerProps) {
    const [images, setImages] = useState<GeneratedImage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>(null)
    const [metadataTypeFilter, setMetadataTypeFilter] = useState<string | null>(defaultMetadataTypeFilter ?? null)
    const [hasMore, setHasMore] = useState(true)
    const [page, setPage] = useState(1)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Also grab store images as a fallback for already-loaded content
    const storeImages = useUnifiedGalleryStore(s => s.images)

    const loadImages = useCallback(async (pageNum: number, replace: boolean) => {
        setIsLoading(true)
        try {
            const result = await GalleryService.loadUserGalleryPaginated(
                pageNum,
                30,
                null,
                {
                    searchQuery: searchQuery || undefined,
                    sourceFilter: sourceFilter || undefined,
                    metadataTypeFilter: metadataTypeFilter || undefined,
                }
            )
            const completed = result.images.filter(img => img.status === 'completed' && img.url)
            if (replace) {
                setImages(completed)
            } else {
                setImages(prev => {
                    const existingIds = new Set(prev.map(i => i.id))
                    const newImages = completed.filter(i => !existingIds.has(i.id))
                    return [...prev, ...newImages]
                })
            }
            setHasMore(completed.length >= 30 && pageNum < result.totalPages)
        } catch {
            // If DB load fails, fall back to store images
            if (replace) {
                const filtered = storeImages.filter(img => {
                    if (img.status !== 'completed' || !img.url) return false
                    if (sourceFilter && img.source !== sourceFilter) return false
                    if (searchQuery && !img.prompt?.toLowerCase().includes(searchQuery.toLowerCase())) return false
                    return true
                })
                setImages(filtered)
                setHasMore(false)
            }
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, sourceFilter, metadataTypeFilter, storeImages])

    // Load images when dialog opens or filters change
    useEffect(() => {
        if (open) {
            setPage(1)
            loadImages(1, true)
        }
    }, [open, searchQuery, sourceFilter, metadataTypeFilter, loadImages])

    const handleLoadMore = () => {
        const nextPage = page + 1
        setPage(nextPage)
        loadImages(nextPage, false)
    }

    const handleSelect = (image: GeneratedImage) => {
        onSelect(image.url, image.id)
        onOpenChange(false)
    }

    const handleScroll = () => {
        const el = scrollRef.current
        if (!el || isLoading || !hasMore) return
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            handleLoadMore()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Images className="w-5 h-5" />
                        Pick from Gallery
                    </DialogTitle>
                    <DialogDescription>
                        Select an existing image as a character reference.
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
                <div className="flex flex-col gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by prompt..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                    <div className="flex gap-1 flex-wrap items-center">
                        {SOURCE_OPTIONS.map(opt => (
                            <Badge
                                key={opt.label}
                                variant={sourceFilter === opt.value ? 'default' : 'outline'}
                                className="cursor-pointer text-xs"
                                onClick={() => setSourceFilter(opt.value)}
                            >
                                {opt.label}
                            </Badge>
                        ))}
                        <div className="w-px h-4 bg-border mx-1" />
                        <Badge
                            variant={metadataTypeFilter === 'character-turnaround' ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => setMetadataTypeFilter(
                                metadataTypeFilter === 'character-turnaround' ? null : 'character-turnaround'
                            )}
                        >
                            Character Sheets
                        </Badge>
                    </div>
                </div>

                {/* Image Grid */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto min-h-0"
                    onScroll={handleScroll}
                >
                    {images.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Images className="w-10 h-10 mb-2 opacity-40" />
                            <p className="text-sm">No images found.</p>
                            <p className="text-xs">Generate some images first, then pick them here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {images.map(image => (
                                <button
                                    key={image.id}
                                    className="group relative aspect-square rounded-md overflow-hidden border hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
                                    onClick={() => handleSelect(image)}
                                >
                                    <img
                                        src={image.url}
                                        alt={image.prompt?.slice(0, 60) || 'Gallery image'}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                                        <p className="text-[10px] text-white p-1 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {image.prompt?.slice(0, 80) || 'No prompt'}
                                        </p>
                                    </div>
                                    {image.source && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute top-1 right-1 text-[9px] px-1 py-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {image.source}
                                        </Badge>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {hasMore && !isLoading && images.length > 0 && (
                        <div className="flex justify-center py-3">
                            <Button variant="ghost" size="sm" onClick={handleLoadMore}>
                                Load more
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
