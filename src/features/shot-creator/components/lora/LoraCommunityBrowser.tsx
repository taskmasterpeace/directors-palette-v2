'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Layers, Plus, Check, Star, Camera, Trash2, User } from 'lucide-react'
import { COMMUNITY_LORAS, BUILT_IN_LORA_IDS, useLoraStore, type LoraItem } from '../../store/lora.store'
import { cn } from '@/utils/utils'
import { toast } from 'sonner'

type SectionFilter = 'all' | 'mine' | 'community'

export function LoraCommunityBrowser() {
    const [section, setSection] = useState<SectionFilter>('all')
    const loras = useLoraStore(s => s.loras)
    const loraThumbnails = useLoraStore(s => s.loraThumbnails)
    const addFromCommunity = useLoraStore(s => s.addFromCommunity)
    const removeFromCollection = useLoraStore(s => s.removeFromCollection)
    const removeLoraFromDb = useLoraStore(s => s.removeLoraFromDb)
    const isLoraUsed = useLoraStore(s => s.isLoraUsed)
    const getLoraRating = useLoraStore(s => s.getLoraRating)
    const rateLora = useLoraStore(s => s.rateLora)
    const setLoraThumbnail = useLoraStore(s => s.setLoraThumbnail)
    const fetchUserLoras = useLoraStore(s => s.fetchUserLoras)

    // Fetch user LoRAs on mount
    useEffect(() => {
        fetchUserLoras()
    }, [fetchUserLoras])

    const collectionIds = useMemo(() => new Set(loras.map(l => l.id)), [loras])
    const communityIds = useMemo(() => new Set(COMMUNITY_LORAS.map(l => l.id)), [])

    // User's personal LoRAs = in store, not built-in, not community
    const myLoras = useMemo(() =>
        loras.filter(l => !BUILT_IN_LORA_IDS.has(l.id) && !communityIds.has(l.id)),
        [loras, communityIds]
    )

    const showCommunity = section === 'all' || section === 'community'
    const showMine = section === 'all' || section === 'mine'

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="mb-3">
                <h3 className="text-sm font-medium text-white mb-1">LoRA Browser</h3>
                <p className="text-xs text-muted-foreground">
                    Browse community LoRAs and manage your personal collection
                </p>
            </div>

            {/* Section pills */}
            <div className="flex gap-1.5 mb-3">
                <FilterPill
                    label="All"
                    count={COMMUNITY_LORAS.length + myLoras.length}
                    active={section === 'all'}
                    onClick={() => setSection('all')}
                />
                <FilterPill
                    label="My LoRAs"
                    count={myLoras.length}
                    active={section === 'mine'}
                    onClick={() => setSection('mine')}
                    accent="amber"
                />
                <FilterPill
                    label="Community"
                    count={COMMUNITY_LORAS.length}
                    active={section === 'community'}
                    onClick={() => setSection('community')}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4">
                {/* My LoRAs section */}
                {showMine && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">My LoRAs</span>
                                {myLoras.length > 0 && (
                                    <span className="text-[10px] text-amber-400/60 tabular-nums">({myLoras.length})</span>
                                )}
                            </div>
                        </div>
                        {myLoras.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                                <User className="w-6 h-6 mb-2 opacity-40" />
                                <p className="text-xs">No personal LoRAs yet</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Upload from the LoRA section in settings</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {myLoras.map((lora) => {
                                    const used = isLoraUsed(lora.id)
                                    const rating = getLoraRating(lora.id)
                                    const customThumb = loraThumbnails[lora.id] || lora.thumbnailUrl
                                    return (
                                        <LoraCard
                                            key={lora.id}
                                            lora={lora}
                                            thumbnailUrl={customThumb}
                                            added={true}
                                            isPersonal={true}
                                            used={used}
                                            rating={rating?.rating ?? null}
                                            onToggle={async () => {
                                                if (window.confirm(`Delete "${lora.name}" permanently?`)) {
                                                    const ok = await removeLoraFromDb(lora.id)
                                                    if (ok) toast.success(`Deleted "${lora.name}"`)
                                                    else toast.error('Failed to delete')
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
                )}

                {/* Divider */}
                {showMine && showCommunity && (
                    <div className="border-t border-border/50" />
                )}

                {/* Community section */}
                {showCommunity && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wide">Community</span>
                            <span className="text-[10px] text-cyan-400/60 tabular-nums">({COMMUNITY_LORAS.length})</span>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {COMMUNITY_LORAS.map((lora) => {
                                const added = collectionIds.has(lora.id)
                                const used = isLoraUsed(lora.id)
                                const rating = getLoraRating(lora.id)
                                const userLora = loras.find(l => l.id === lora.id)
                                const customThumb = loraThumbnails[lora.id] || userLora?.thumbnailUrl
                                return (
                                    <LoraCard
                                        key={lora.id}
                                        lora={lora}
                                        thumbnailUrl={customThumb || lora.thumbnailUrl}
                                        added={added}
                                        isPersonal={false}
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
                    </div>
                )}
            </div>
        </div>
    )
}

function FilterPill({ label, count, active, onClick, accent }: {
    label: string
    count: number
    active: boolean
    onClick: () => void
    accent?: 'amber' | 'cyan'
}) {
    const color = accent === 'amber'
        ? { active: 'bg-amber-500/20 text-amber-400 border-amber-500/40', count: 'text-amber-400/70' }
        : { active: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', count: 'text-cyan-400/70' }

    return (
        <button
            onClick={onClick}
            className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                active
                    ? color.active
                    : 'bg-card/50 text-muted-foreground border-border hover:border-border/80 hover:text-foreground'
            )}
        >
            {label}
            {count > 0 && (
                <span className={cn(
                    'ml-1 tabular-nums',
                    active ? color.count : 'text-muted-foreground/60'
                )}>
                    {count}
                </span>
            )}
        </button>
    )
}

function LoraCard({ lora, thumbnailUrl, added, isPersonal, used, rating, onToggle, onRate, onSetThumbnail }: {
    lora: LoraItem
    thumbnailUrl?: string
    added: boolean
    isPersonal: boolean
    used: boolean
    rating: number | null
    onToggle: () => void
    onRate: (stars: number) => void
    onSetThumbnail: (url: string) => void
}) {
    const [showRating, setShowRating] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const loraType = lora.type ?? 'style'

    const handleThumbnailPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
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
        e.target.value = ''
    }, [onSetThumbnail])

    return (
        <div className={cn(
            'rounded-lg border transition-all group relative overflow-hidden',
            added
                ? isPersonal
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-cyan-500/40 bg-cyan-950/20'
                : 'border-border bg-card/50 hover:border-border/80'
        )}>
            {/* Thumbnail area */}
            <div className="aspect-square relative bg-card/80 flex items-center justify-center">
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={lora.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-cyan-950/20">
                        {isPersonal ? (
                            <User className="w-8 h-8 text-amber-500/40" />
                        ) : (
                            <Layers className="w-8 h-8 text-cyan-500/40" />
                        )}
                    </div>
                )}

                {/* Type badge */}
                <span className={cn(
                    'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                    loraType === 'character'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                )}>
                    {loraType}
                </span>

                {/* Set Thumbnail button */}
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

                {/* Add/Remove/Delete button */}
                <button
                    onClick={onToggle}
                    className={cn(
                        'absolute top-1.5 right-1.5 w-7 h-7 rounded-md flex items-center justify-center transition-all',
                        isPersonal
                            ? 'bg-red-500/80 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100'
                            : added
                                ? 'bg-cyan-500 text-white hover:bg-red-500'
                                : 'bg-black/60 text-white/80 hover:bg-cyan-500 hover:text-white opacity-0 group-hover:opacity-100'
                    )}
                    title={isPersonal ? 'Delete LoRA' : added ? 'Remove from collection' : 'Add to collection'}
                >
                    {isPersonal ? (
                        <Trash2 className="w-3.5 h-3.5" />
                    ) : added ? (
                        <Check className="w-3.5 h-3.5" />
                    ) : (
                        <Plus className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>

            {/* Info + rating */}
            <div className="px-2.5 py-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{lora.name}</p>
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
                {lora.referenceTag && (
                    <p className="text-[11px] text-muted-foreground font-mono">@{lora.referenceTag}</p>
                )}
                {lora.compatibleModels && lora.compatibleModels.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {lora.compatibleModels.map(m => m.replace('flux-2-', '').replace('-', ' ')).join(', ')}
                    </p>
                )}
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
