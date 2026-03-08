'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLoraStore, type LoraItem } from '../../store/lora.store'
import { Plus, Trash2, Upload, X, Layers, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/utils'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

// ── LoRA Card ──────────────────────────────────────────────────────

function LoraCard({ lora, isActive, isAdmin, onToggle, onDelete, onUpdateScale, onEdit }: {
    lora: LoraItem
    isActive: boolean
    isAdmin: boolean
    onToggle: () => void
    onDelete: () => void
    onUpdateScale: (scale: number) => void
    onEdit: () => void
}) {
    const cardRef = useRef<HTMLDivElement>(null)

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
                ? 'border-purple-500/50 bg-purple-950/20'
                : 'border-border bg-card/50 hover:border-border/80'
        )}>
            <div className="flex items-center gap-2 px-2 py-1.5">
                {/* Toggle - moved to front for visibility */}
                <Switch
                    checked={isActive}
                    onCheckedChange={handleToggle}
                    className={cn(
                        'flex-shrink-0',
                        isActive
                            ? 'data-[state=checked]:bg-purple-500'
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
                    <div className="w-7 h-7 rounded bg-purple-900/30 border border-purple-800/30 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-3 h-3 text-purple-400" />
                    </div>
                )}

                {/* Name */}
                <span className="text-sm font-medium text-foreground truncate min-w-0 flex-shrink">{lora.name}</span>

                {/* Scale slider - inline when active */}
                {isActive && (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={lora.defaultLoraScale}
                            onChange={(e) => onUpdateScale(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 accent-purple-500 touch-none min-w-[60px]"
                            style={{ WebkitAppearance: 'none', padding: '8px 0' }}
                        />
                        <span className="text-xs text-purple-400 font-medium tabular-nums flex-shrink-0">
                            {lora.defaultLoraScale.toFixed(1)}
                        </span>
                    </div>
                )}

                {/* Spacer when not active */}
                {!isActive && <div className="flex-1" />}

                {/* Admin actions */}
                {isAdmin && (
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
            </div>
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

            const { weightsUrl } = await res.json()

            addLora({
                name: name.trim(),
                triggerWord: triggerWord.trim(),
                weightsUrl,
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
    }, [name, triggerWord, file, thumbnailPreview, defaultScale, defaultGuidance, addLora, updateLora, onClose, isEditing, editingLora])

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
                                    className="w-14 h-14 rounded-lg bg-purple-900/20 border border-dashed border-purple-700/40 flex items-center justify-center cursor-pointer hover:bg-purple-900/30 transition-colors"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                >
                                    <Layers className="w-6 h-6 text-purple-500/60" />
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
                            <span className="text-sm text-purple-400 font-medium tabular-nums">{defaultScale.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={2}
                            step={0.1}
                            value={defaultScale}
                            onChange={(e) => setDefaultScale(parseFloat(e.target.value))}
                            className="w-full h-1.5 accent-purple-500"
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

export function LoraSection() {
    const { loras, activeLoraId, setActiveLora, removeLora, updateLora } = useLoraStore()
    const { isAdmin } = useAdminAuth()
    const [showDialog, setShowDialog] = useState(false)
    const [editingLora, setEditingLora] = useState<LoraItem | null>(null)
    const [expanded, setExpanded] = useState(false)

    const visibleLoras = expanded || loras.length <= COLLAPSED_MAX
        ? loras
        : loras.slice(0, COLLAPSED_MAX)
    const hiddenCount = loras.length - COLLAPSED_MAX

    // No LoRAs and not admin — nothing to show
    if (loras.length === 0 && !isAdmin) return null

    if (loras.length === 0 && !showDialog) {
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
                    {loras.length > 0 && (
                        <span className="text-xs text-muted-foreground">({loras.length})</span>
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

            <div className="space-y-1.5">
                {visibleLoras.map((lora) => (
                    <LoraCard
                        key={lora.id}
                        lora={lora}
                        isActive={activeLoraId === lora.id}
                        isAdmin={isAdmin}
                        onToggle={() => {
                            setActiveLora(activeLoraId === lora.id ? null : lora.id)
                        }}
                        onEdit={() => {
                            setEditingLora(lora)
                            setShowDialog(true)
                        }}
                        onDelete={() => {
                            if (window.confirm(`Delete "${lora.name}"?`)) {
                                removeLora(lora.id)
                            }
                        }}
                        onUpdateScale={(scale) => {
                            updateLora(lora.id, { defaultLoraScale: scale })
                        }}
                    />
                ))}
            </div>

            {/* Show more / less toggle */}
            {loras.length > COLLAPSED_MAX && (
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
