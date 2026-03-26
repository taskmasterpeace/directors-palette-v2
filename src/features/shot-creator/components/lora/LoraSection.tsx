'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLoraStore, type LoraItem, BUILT_IN_LORA_IDS } from '../../store/lora.store'
import { Plus, Trash2, Upload, X, Layers, Pencil, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

// ── Star Rating (inline) ────────────────────────────────────────────

function InlineStarRating({ rating, onRate }: {
    rating: number | null
    onRate: (stars: number) => void
}) {
    const [hovering, setHovering] = useState<number | null>(null)

    return (
        <div className="flex items-center gap-0" onMouseLeave={() => setHovering(null)}>
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = hovering !== null ? star <= hovering : (rating !== null && star <= rating)
                return (
                    <button
                        key={star}
                        onClick={(e) => { e.stopPropagation(); onRate(star) }}
                        onMouseEnter={() => setHovering(star)}
                        className="p-0.5 transition-colors"
                        title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                        <Star className={cn(
                            'w-3 h-3 transition-colors',
                            filled
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40 hover:text-amber-400/60'
                        )} />
                    </button>
                )
            })}
        </div>
    )
}

// ── LoRA Card ──────────────────────────────────────────────────────

function LoraCard({ lora, isActive, isAdmin, isBuiltIn, isUsed, currentRating, onToggle, onDelete, onUpdateScale, onEdit, onRate }: {
    lora: LoraItem
    isActive: boolean
    isAdmin: boolean
    isBuiltIn: boolean
    isUsed: boolean
    currentRating: number | null
    onToggle: () => void
    onDelete: () => void
    onUpdateScale: (scale: number) => void
    onEdit: () => void
    onRate: (stars: number) => void
}) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [showRating, setShowRating] = useState(false)

    // Prevent auto-scroll when LoRA scale slider appears on mobile
    const handleToggle = useCallback(() => {
        const scrollY = window.scrollY
        onToggle()
        // Restore scroll position after React re-renders with the slider
        requestAnimationFrame(() => {
            window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior })
        })
    }, [onToggle])

    return (
        <div ref={cardRef} className={cn(
            'rounded-lg border transition-all',
            isActive
                ? 'border-cyan-500/50 bg-cyan-950/20'
                : 'border-border bg-card/50 hover:border-border/80'
        )}>
            {/* Top row: toggle, thumbnail, name, actions */}
            <div className="flex items-center gap-2 px-2 py-1.5">
                <Switch
                    checked={isActive}
                    onCheckedChange={handleToggle}
                    className={cn(
                        'flex-shrink-0',
                        isActive
                            ? 'data-[state=checked]:bg-cyan-500'
                            : 'data-[state=unchecked]:bg-slate-600'
                    )}
                />

                {/* Thumbnail */}
                {lora.thumbnailUrl ? (
                    <img
                        src={lora.thumbnailUrl}
                        alt={lora.name}
                        className="w-7 h-7 rounded object-cover flex-shrink-0 border border-border/50"
                    />
                ) : (
                    <div className="w-7 h-7 rounded bg-cyan-900/30 border border-cyan-800/30 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-3 h-3 text-cyan-400" />
                    </div>
                )}

                {/* Name */}
                <span className="text-sm font-medium text-foreground truncate min-w-0 flex-1">{lora.name}</span>

                {/* Star rating - show for used LoRAs */}
                {isUsed && !showRating && currentRating !== null && (
                    <button
                        onClick={() => setShowRating(true)}
                        className="flex items-center gap-0.5 p-1 text-amber-400 flex-shrink-0"
                        title={`Rated ${currentRating}/5 - click to change`}
                    >
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="text-[10px] font-medium tabular-nums">{currentRating}</span>
                    </button>
                )}
                {isUsed && !showRating && currentRating === null && (
                    <button
                        onClick={() => setShowRating(true)}
                        className="p-1 flex-shrink-0 animate-pulse"
                        title="Rate this LoRA"
                    >
                        <Star className="w-3 h-3 text-amber-400/50" />
                    </button>
                )}
                {showRating && (
                    <div className="flex-shrink-0">
                        <InlineStarRating
                            rating={currentRating}
                            onRate={(stars) => {
                                onRate(stars)
                                setShowRating(false)
                            }}
                        />
                    </div>
                )}

                {/* Edit action - admin on all, non-admin on community LoRAs */}
                {(isAdmin || !isBuiltIn) && (
                    <button
                        onClick={onEdit}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        title="Edit LoRA"
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={onDelete}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                        title="Delete LoRA"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
                {!isAdmin && !isBuiltIn && (
                    <button
                        onClick={onDelete}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors flex-shrink-0"
                        title="Remove from collection"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Scale slider - own row when active (better on mobile) */}
            {isActive && (
                <div className="flex items-center gap-2 px-3 pb-2">
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 uppercase tracking-wide">Scale</span>
                    <input
                        type="range"
                        min={0.1}
                        max={2}
                        step={0.1}
                        value={lora.defaultLoraScale || 1.0}
                        onChange={(e) => onUpdateScale(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 accent-cyan-500 touch-none"
                        style={{ WebkitAppearance: 'none', padding: '8px 0' }}
                    />
                    <span className="text-xs text-cyan-400 font-medium tabular-nums flex-shrink-0 w-6 text-right">
                        {lora.defaultLoraScale.toFixed(1)}
                    </span>
                </div>
            )}
        </div>
    )
}

// ── Shared dialog for Add + Edit ───────────────────────────────────

function LoraDialog({ onClose, editingLora }: {
    onClose: () => void
    editingLora?: LoraItem | null
}) {
    const isEditing = !!editingLora
    const [name, setName] = useState(editingLora?.name || '')
    const [triggerWord, setTriggerWord] = useState(editingLora?.triggerWord || '')
    const [file, setFile] = useState<File | null>(null)
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(editingLora?.thumbnailUrl || null)
    const [uploading, setUploading] = useState(false)
    const [defaultScale, setDefaultScale] = useState(editingLora?.defaultLoraScale ?? 1.0)
    const [defaultGuidance, setDefaultGuidance] = useState(editingLora?.defaultGuidanceScale ?? 1.0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const thumbnailInputRef = useRef<HTMLInputElement>(null)
    const { addLora, updateLora } = useLoraStore()

    const handleThumbnailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        const reader = new FileReader()
        reader.onload = () => setThumbnailPreview(reader.result as string)
        reader.readAsDataURL(f)
    }, [])

    const handleSubmit = useCallback(async () => {
        if (!name.trim() || !triggerWord.trim()) {
            toast.error('Name and trigger word are required')
            return
        }

        // Edit mode — no new weights file needed
        if (isEditing && editingLora) {
            updateLora(editingLora.id, {
                name: name.trim(),
                triggerWord: triggerWord.trim(),
                thumbnailUrl: thumbnailPreview || undefined,
                defaultLoraScale: defaultScale,
                defaultGuidanceScale: defaultGuidance,
            })
            toast.success(`"${name}" updated`)
            onClose()
            return
        }

        // Add mode — weights file required
        if (!file) {
            toast.error('Weights file is required')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('loraId', `lora_${Date.now()}`)

            const res = await fetch('/api/lora/upload', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Upload failed')
            }

            const { weightsUrl, storagePath } = await res.json()

            await useLoraStore.getState().addLoraToDb({
                name: name.trim(),
                triggerWord: triggerWord.trim(),
                weightsUrl,
                storagePath,
                thumbnailUrl: thumbnailPreview || undefined,
                defaultGuidanceScale: defaultGuidance,
                defaultLoraScale: defaultScale,
            })

            toast.success(`LoRA "${name}" added`)
            onClose()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Upload failed')
        } finally {
            setUploading(false)
        }
    }, [name, triggerWord, file, thumbnailPreview, defaultScale, defaultGuidance, updateLora, onClose, isEditing, editingLora])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="text-base font-semibold text-foreground">
                        {isEditing ? 'Edit LoRA' : 'Add LoRA'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Thumbnail */}
                    <div className="space-y-1.5">
                        <Label className="text-sm">Thumbnail</Label>
                        <input
                            ref={thumbnailInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailChange}
                            className="hidden"
                        />
                        <div className="flex items-center gap-3">
                            {thumbnailPreview ? (
                                <img
                                    src={thumbnailPreview}
                                    alt="Thumbnail"
                                    className="w-14 h-14 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                />
                            ) : (
                                <div
                                    className="w-14 h-14 rounded-lg bg-cyan-900/20 border border-dashed border-cyan-700/40 flex items-center justify-center cursor-pointer hover:bg-cyan-900/30 transition-colors"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                >
                                    <Layers className="w-6 h-6 text-cyan-500/60" />
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                    className="text-xs"
                                >
                                    {thumbnailPreview ? 'Change image' : 'Upload image'}
                                </Button>
                                {thumbnailPreview && (
                                    <button
                                        onClick={() => setThumbnailPreview(null)}
                                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors text-left"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label className="text-sm">Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Nava Style"
                            className="bg-background"
                        />
                    </div>

                    {/* Trigger Word */}
                    <div className="space-y-1.5">
                        <Label className="text-sm">Trigger Word</Label>
                        <Input
                            value={triggerWord}
                            onChange={(e) => setTriggerWord(e.target.value)}
                            placeholder="e.g. in the style of nava"
                            className="bg-background font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">Auto-prepended to prompt when active</p>
                    </div>

                    {/* Weights file (add mode only) */}
                    {!isEditing && (
                        <div className="space-y-1.5">
                            <Label className="text-sm">Weights File (.safetensors)</Label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".safetensors"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 bg-background"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4" />
                                {file ? file.name : 'Choose .safetensors file'}
                            </Button>
                            {file && (
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                            )}
                        </div>
                    )}

                    {/* Default Scale */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Default LoRA Scale</Label>
                            <span className="text-sm text-cyan-400 font-medium tabular-nums">{defaultScale.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={defaultScale}
                            onChange={(e) => setDefaultScale(parseFloat(e.target.value))}
                            className="w-full h-1.5 accent-cyan-500"
                        />
                    </div>

                    {/* Default Guidance */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Default Guidance Scale</Label>
                            <span className="text-sm text-muted-foreground font-medium tabular-nums">{defaultGuidance.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={20}
                            step={0.5}
                            value={defaultGuidance}
                            onChange={(e) => setDefaultGuidance(parseFloat(e.target.value))}
                            className="w-full h-1.5 accent-slate-500"
                        />
                    </div>
                </div>

                <div className="flex gap-2 px-5 py-4 border-t border-border bg-secondary/30">
                    <Button variant="outline" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={uploading || !name.trim() || !triggerWord.trim() || (!isEditing && !file)}
                        className="flex-1 gap-2"
                    >
                        {uploading ? 'Uploading...' : isEditing ? 'Save' : 'Add LoRA'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ── Main Section ───────────────────────────────────────────────────

const COLLAPSED_MAX = 3

export function LoraSection({ selectedModel }: { selectedModel?: string }) {
    const { loras, activeLoraIds, toggleActiveLora, removeLora, updateLora, rateLora, getLoraRating, isLoraUsed, loraThumbnails, ensureAdminLoras } = useLoraStore()
    const { isAdmin } = useAdminAuth()
    const [showDialog, setShowDialog] = useState(false)

    // Hydrate user LoRAs from database on mount
    useEffect(() => {
        const store = useLoraStore.getState()
        store.migrateFromLocalStorage().then(() => {
            store.fetchUserLoras()
        })
    }, [])

    // Admin gets all built-in LoRAs automatically
    useEffect(() => {
        if (isAdmin) ensureAdminLoras()
    }, [isAdmin, ensureAdminLoras])
    const [editingLora, setEditingLora] = useState<LoraItem | null>(null)
    const [expanded, setExpanded] = useState(false)

    // Filter LoRAs by model compatibility
    const filteredLoras = loras.filter(lora => {
        if (!lora.compatibleModels) return !selectedModel || selectedModel !== 'flux-2-klein-9b'
        return !selectedModel || lora.compatibleModels.includes(selectedModel)
    })

    const visibleLoras = expanded || filteredLoras.length <= COLLAPSED_MAX
        ? filteredLoras
        : filteredLoras.slice(0, COLLAPSED_MAX)
    const hiddenCount = filteredLoras.length - COLLAPSED_MAX

    // No LoRAs and not admin — nothing to show
    if (filteredLoras.length === 0 && !isAdmin) return null

    if (filteredLoras.length === 0 && !showDialog) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        LoRA
                    </label>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingLora(null); setShowDialog(true) }}
                    className="w-full gap-2 border-dashed"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add LoRA weights
                </Button>
                {showDialog && (
                    <LoraDialog
                        onClose={() => setShowDialog(false)}
                        editingLora={null}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    LoRA
                    {filteredLoras.length > 0 && (
                        <span className="text-xs text-muted-foreground">({filteredLoras.length})</span>
                    )}
                    {activeLoraIds.length > 0 && (
                        <span className="text-[10px] font-medium text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded-full">
                            {activeLoraIds.length} active
                        </span>
                    )}
                </label>
                {isAdmin && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingLora(null); setShowDialog(true) }}
                        className="h-7 px-2 text-xs gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Add
                    </Button>
                )}
            </div>

            {/* Horizontal scroll on mobile, vertical stack on desktop */}
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-x-visible sm:pb-0 sm:gap-1.5">
                {visibleLoras.map((lora) => (
                    <div key={lora.id} className="flex-shrink-0 min-w-[160px] sm:min-w-0 sm:flex-shrink">
                        <LoraCard
                            lora={loraThumbnails[lora.id] ? { ...lora, thumbnailUrl: loraThumbnails[lora.id] } : lora}
                            isActive={activeLoraIds.includes(lora.id)}
                            isAdmin={isAdmin}
                            isBuiltIn={BUILT_IN_LORA_IDS.has(lora.id)}
                            isUsed={isLoraUsed(lora.id)}
                            currentRating={getLoraRating(lora.id)?.rating ?? null}
                            onToggle={() => {
                                toggleActiveLora(lora.id)
                            }}
                            onEdit={() => {
                                setEditingLora(lora)
                                setShowDialog(true)
                            }}
                            onDelete={() => {
                                if (isAdmin) {
                                    if (window.confirm(`Delete "${lora.name}"?`)) {
                                        removeLora(lora.id)
                                    }
                                } else {
                                    removeLora(lora.id)
                                    toast.success(`Removed "${lora.name}" from collection`)
                                }
                            }}
                            onUpdateScale={(scale) => {
                                updateLora(lora.id, { defaultLoraScale: scale })
                            }}
                            onRate={(stars) => {
                                rateLora(lora.id, stars)
                                toast.success(`Rated "${lora.name}" ${stars}/5`)
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Show more / less toggle */}
            {filteredLoras.length > COLLAPSED_MAX && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            {hiddenCount} more LoRA{hiddenCount !== 1 ? 's' : ''}
                        </>
                    )}
                </button>
            )}

            {showDialog && (
                <LoraDialog
                    onClose={() => { setShowDialog(false); setEditingLora(null) }}
                    editingLora={editingLora}
                />
            )}
        </div>
    )
}
