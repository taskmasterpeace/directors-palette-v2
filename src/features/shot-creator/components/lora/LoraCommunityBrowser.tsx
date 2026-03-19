'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Layers, Plus, Check, Star, Camera } from 'lucide-react'
import { COMMUNITY_LORAS, useLoraStore } from '../../store/lora.store'
import { cn } from '@/utils/utils'
import { toast } from 'sonner'

type FilterType = 'all' | 'character' | 'style'

export function LoraCommunityBrowser() {
    const [filter, setFilter] = useState<FilterType>('all')
    // Subscribe to `loras` directly for proper reactivity (not just methods)
    const loras = useLoraStore(s => s.loras)
    const loraThumbnails = useLoraStore(s => s.loraThumbnails)
    const addFromCommunity = useLoraStore(s => s.addFromCommunity)
    const removeFromCollection = useLoraStore(s => s.removeFromCollection)
    const isLoraUsed = useLoraStore(s => s.isLoraUsed)
    const getLoraRating = useLoraStore(s => s.getLoraRating)
    const rateLora = useLoraStore(s => s.rateLora)
    const setLoraThumbnail = useLoraStore(s => s.setLoraThumbnail)

    // Compute collection membership reactively from loras array
    const collectionIds = useMemo(() => new Set(loras.map(l => l.id)), [loras])

    const filtered = COMMUNITY_LORAS.filter((lora) => {
        if (filter === 'all') return true
        return (lora.type ?? 'style') === filter
    })

    const characterCount = COMMUNITY_LORAS.filter(l => (l.type ?? 'style') === 'character').length
    const styleCount = COMMUNITY_LORAS.filter(l => (l.type ?? 'style') === 'style').length

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-3">
                <h3 className="text-sm font-medium text-white mb-1">Community LoRAs</h3>
                <p className="text-xs text-muted-foreground">
                    Browse and add LoRAs to your collection for use during generation
                </p>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mb-3">
                <FilterPill
                    label="All"
                    count={COMMUNITY_LORAS.length}
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                />
                <FilterPill
                    label="Characters"
                    count={characterCount}
                    active={filter === 'character'}
                    onClick={() => setFilter('character')}
                />
                <FilterPill
                    label="Styles"
                    count={styleCount}
                    active={filter === 'style'}
                    onClick={() => setFilter('style')}
                />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Layers className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">No LoRAs in this category yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {filtered.map((lora) => {
                            const added = collectionIds.has(lora.id)
                            const used = isLoraUsed(lora.id)
                            const rating = getLoraRating(lora.id)
                            const customThumb = loraThumbnails[lora.id]
                            return (
                                <CommunityLoraCard
                                    key={lora.id}
                                    name={lora.name}
                                    type={lora.type ?? 'style'}
                                    thumbnailUrl={customThumb || lora.thumbnailUrl}
                                    referenceTag={lora.referenceTag}
                                    added={added}
                                    used={used}
                                    rating={rating?.rating ?? null}
                                    onToggle={() => {
                                        if (added) {
                                            removeFromCollection(lora.id)
                                            toast.success(`Removed "${lora.name}" from collection`)
                                        } else {
                                            addFromCommunity(lora.id)
                                            toast.success(`Added "${lora.name}" to collection`)
                                        }
                                    }}
                                    onRate={(stars) => {
                                        rateLora(lora.id, stars)
                                        toast.success(`Rated "${lora.name}" ${stars}/5`)
                                    }}
                                    onSetThumbnail={(url) => {
                                        setLoraThumbnail(lora.id, url)
                                        toast.success(`Thumbnail set for "${lora.name}"`)
                                    }}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

function FilterPill({ label, count, active, onClick }: {
    label: string
    count: number
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                active
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-card/50 text-muted-foreground border border-border hover:border-border/80 hover:text-foreground'
            )}
        >
            {label}
            {count > 0 && (
                <span className={cn(
                    'ml-1 tabular-nums',
                    active ? 'text-cyan-400/70' : 'text-muted-foreground/60'
                )}>
                    {count}
                </span>
            )}
        </button>
    )
}

function CommunityLoraCard({ name, type, thumbnailUrl, referenceTag, added, used, rating, onToggle, onRate, onSetThumbnail }: {
    name: string
    type: 'character' | 'style'
    thumbnailUrl?: string
    referenceTag?: string
    added: boolean
    used: boolean
    rating: number | null
    onToggle: () => void
    onRate: (stars: number) => void
    onSetThumbnail: (url: string) => void
}) {
    const [showRating, setShowRating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleThumbnailPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }
        // Read as data URL and save — small enough for localStorage
        const reader = new FileReader()
        reader.onload = () => {
            // Create a canvas to crop to square
            const img = new Image()
            img.onload = () => {
                const size = Math.min(img.width, img.height)
                const canvas = document.createElement('canvas')
                canvas.width = 256
                canvas.height = 256
                const ctx = canvas.getContext('2d')!
                const sx = (img.width - size) / 2
                const sy = (img.height - size) / 2
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
                onSetThumbnail(dataUrl)
            }
            img.src = reader.result as string
        }
        reader.readAsDataURL(file)
        // Reset input so same file can be picked again
        e.target.value = ''
    }, [onSetThumbnail])

    return (
        <div className={cn(
            'rounded-lg border transition-all group relative overflow-hidden',
            added
                ? 'border-cyan-500/40 bg-cyan-950/20'
                : 'border-border bg-card/50 hover:border-border/80'
        )}>
            {/* Thumbnail area */}
            <div className="aspect-square relative bg-card/80 flex items-center justify-center">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-cyan-950/20">
                        <Layers className="w-8 h-8 text-cyan-500/40" />
                    </div>
                )}

                {/* Type badge */}
                <span className={cn(
                    'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                    type === 'character'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                )}>
                    {type}
                </span>

                {/* Set Thumbnail button — bottom-right, shows on hover */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center bg-black/60 text-white/80 hover:bg-cyan-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    title="Set thumbnail"
                >
                    <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailPick}
                    className="hidden"
                />

                {/* "Rate" badge for used but unrated */}
                {used && rating === null && (
                    <button
                        onClick={() => setShowRating(true)}
                        className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                    >
                        Rate
                    </button>
                )}

                {/* Add/Remove button */}
                <button
                    onClick={onToggle}
                    className={cn(
                        'absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center transition-all',
                        added
                            ? 'bg-cyan-500 text-white hover:bg-red-500'
                            : 'bg-black/60 text-white/80 hover:bg-cyan-500 hover:text-white opacity-0 group-hover:opacity-100'
                    )}
                    title={added ? 'Remove from collection' : 'Add to collection'}
                >
                    {added ? (
                        <Check className="w-3.5 h-3.5" />
                    ) : (
                        <Plus className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>

            {/* Info + rating */}
            <div className="px-2.5 py-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    {/* Show rating stars if rated */}
                    {rating !== null && (
                        <button
                            onClick={() => setShowRating(true)}
                            className="flex items-center gap-0.5 text-amber-400 flex-shrink-0"
                            title={`Rated ${rating}/5 - click to change`}
                        >
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span className="text-[10px] font-medium tabular-nums">{rating}</span>
                        </button>
                    )}
                </div>
                {referenceTag && (
                    <p className="text-[11px] text-muted-foreground font-mono">@{referenceTag}</p>
                )}
                {/* Inline star picker */}
                {showRating && (
                    <div className="flex items-center gap-0.5 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => {
                                    onRate(star)
                                    setShowRating(false)
                                }}
                                className="p-0.5 transition-colors"
                            >
                                <Star className={cn(
                                    'w-3.5 h-3.5 transition-colors hover:fill-amber-400 hover:text-amber-400',
                                    rating !== null && star <= rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-muted-foreground/40'
                                )} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
