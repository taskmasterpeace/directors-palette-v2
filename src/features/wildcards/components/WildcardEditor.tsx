'use client'

import { useState } from 'react'
import { Save, Trash2, Copy, Wand2, AlertCircle, Plus, X, Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useWildCardStore } from '@/features/shot-creator/store/wildcard.store'
import { useWildcardsBrowserStore } from '../store'
import { validateWildCardName, validateWildCardContent } from '@/features/shot-creator/services/wildcard.service'
import { WildcardAIGenerator } from './WildcardAIGenerator'
import { cn } from '@/utils/utils'

export function WildcardEditor() {
    const { toast } = useToast()
    const { createWildCard, updateWildCard, deleteWildCard: deleteWildCardStore, wildcards } = useWildCardStore()
    const {
        selectedWildcardId,
        isCreatingNew,
        draftName,
        draftContent,
        draftCategory,
        draftDescription,
        setDraftName,
        setDraftContent,
        setDraftCategory,
        setDraftDescription,
        resetDraft,
    } = useWildcardsBrowserStore()

    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [newEntry, setNewEntry] = useState('')
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editValue, setEditValue] = useState('')

    // Get current wildcard if editing
    const currentWildcard = selectedWildcardId
        ? wildcards.find(w => w.id === selectedWildcardId)
        : null

    // Validation
    const nameValidation = validateWildCardName(draftName)
    const contentValidation = validateWildCardContent(draftContent)

    // Parse entries from content
    const entries = draftContent.split('\n').filter(l => l.trim())
    const lineCount = entries.length

    // Entry management helpers
    const handleAddEntry = () => {
        const trimmed = newEntry.trim()
        if (!trimmed) return
        const newContent = draftContent ? `${draftContent}\n${trimmed}` : trimmed
        setDraftContent(newContent)
        setNewEntry('')
    }

    const handleDeleteEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index)
        setDraftContent(newEntries.join('\n'))
    }

    const handleStartEdit = (index: number) => {
        setEditingIndex(index)
        setEditValue(entries[index])
    }

    const handleSaveEdit = () => {
        if (editingIndex === null) return
        const trimmed = editValue.trim()
        if (!trimmed) {
            // If empty, delete the entry
            handleDeleteEntry(editingIndex)
        } else {
            // Update the entry
            const newEntries = [...entries]
            newEntries[editingIndex] = trimmed
            setDraftContent(newEntries.join('\n'))
        }
        setEditingIndex(null)
        setEditValue('')
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditValue('')
    }

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSaveEdit()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            handleCancelEdit()
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddEntry()
        }
    }

    // Check if form is valid
    const isValid = nameValidation.isValid && contentValidation.isValid

    // Check if there are changes
    const hasChanges = isCreatingNew || (
        currentWildcard && (
            currentWildcard.name !== draftName ||
            currentWildcard.content !== draftContent ||
            (currentWildcard.category || '') !== draftCategory ||
            (currentWildcard.description || '') !== draftDescription
        )
    )

    const handleSave = async () => {
        if (!isValid) return

        setIsSaving(true)
        try {
            if (isCreatingNew) {
                await createWildCard({
                    name: draftName,
                    content: draftContent,
                    category: draftCategory || undefined,
                    description: draftDescription || undefined,
                })
                toast({
                    title: 'Wildcard Created',
                    description: `"${draftName}" is ready to use as _${draftName}_`,
                })
                resetDraft()
            } else if (selectedWildcardId) {
                await updateWildCard(selectedWildcardId, {
                    name: draftName,
                    content: draftContent,
                    category: draftCategory || undefined,
                    description: draftDescription || undefined,
                })
                toast({
                    title: 'Wildcard Updated',
                    description: `"${draftName}" has been saved.`,
                })
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to save wildcard',
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedWildcardId) return

        setIsDeleting(true)
        try {
            await deleteWildCardStore(selectedWildcardId)
            toast({
                title: 'Wildcard Deleted',
                description: `"${draftName}" has been removed.`,
            })
            resetDraft()
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to delete wildcard',
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleCopyName = () => {
        navigator.clipboard.writeText(`_${draftName}_`)
        toast({
            title: 'Copied',
            description: `_${draftName}_ copied to clipboard`,
        })
    }

    // Empty state
    if (!isCreatingNew && !selectedWildcardId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Wand2 className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-lg">Select a wildcard or create a new one</p>
                <p className="text-sm mt-1">Wildcards let you add randomization to prompts</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        {isCreatingNew ? 'Create New Wildcard' : `Edit: ${currentWildcard?.name || ''}`}
                    </h2>
                    {!isCreatingNew && draftName && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopyName}
                            title="Copy wildcard syntax"
                        >
                            <Copy className="w-4 h-4 mr-1" />
                            _{draftName}_
                        </Button>
                    )}
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Name Field */}
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="e.g. black_girl_hairstyles"
                        className={!nameValidation.isValid && draftName ? 'border-destructive' : ''}
                    />
                    {!nameValidation.isValid && draftName && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {nameValidation.error}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Use letters, numbers, and underscores only
                    </p>
                </div>

                {/* Category Field */}
                <div className="space-y-2">
                    <Label htmlFor="category">Category (optional)</Label>
                    <Input
                        id="category"
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                        placeholder="e.g. fashion, cinematography"
                    />
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input
                        id="description"
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        placeholder="Brief description of this wildcard"
                    />
                </div>

                {/* Entries List */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Entries *</Label>
                        <span className="text-xs text-muted-foreground">
                            {lineCount} {lineCount === 1 ? 'entry' : 'entries'}
                        </span>
                    </div>

                    {/* Numbered List View */}
                    <div className="border border-border rounded-lg overflow-hidden">
                        {entries.length > 0 ? (
                            <div className="max-h-[250px] overflow-y-auto">
                                {entries.map((entry, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 group",
                                            index % 2 === 0 ? "bg-background" : "bg-muted/30"
                                        )}
                                    >
                                        <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                                            {index + 1}.
                                        </span>
                                        {editingIndex === index ? (
                                            <>
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={handleEditKeyDown}
                                                    onBlur={handleSaveEdit}
                                                    autoFocus
                                                    className="flex-1 h-7 text-sm font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleSaveEdit}
                                                    className="p-1 hover:bg-green-500/20 rounded"
                                                    title="Save (Enter)"
                                                >
                                                    <Check className="w-3.5 h-3.5 text-green-500" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEdit}
                                                    className="p-1 hover:bg-destructive/20 rounded"
                                                    title="Cancel (Esc)"
                                                >
                                                    <X className="w-3.5 h-3.5 text-destructive" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span
                                                    className="flex-1 text-sm font-mono truncate cursor-pointer hover:text-primary"
                                                    onClick={() => handleStartEdit(index)}
                                                    title="Click to edit"
                                                >
                                                    {entry}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEdit(index)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/20 rounded transition-opacity"
                                                    title="Edit entry"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-primary" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteEntry(index)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded transition-opacity"
                                                    title="Remove entry"
                                                >
                                                    <X className="w-3.5 h-3.5 text-destructive" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="px-3 py-6 text-center text-muted-foreground text-sm">
                                No entries yet. Add your first one below.
                            </div>
                        )}

                        {/* Add New Entry Input */}
                        <div className="flex items-center gap-2 p-2 border-t border-border bg-muted/20">
                            <Input
                                value={newEntry}
                                onChange={(e) => setNewEntry(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type new entry and press Enter..."
                                className="flex-1 h-8 text-sm font-mono bg-background"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={handleAddEntry}
                                disabled={!newEntry.trim()}
                                className="h-8 px-2"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {!contentValidation.isValid && draftContent && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {contentValidation.error}
                        </p>
                    )}
                </div>

                {/* AI Generator */}
                <WildcardAIGenerator />
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-border flex items-center gap-2">
                <Button
                    onClick={handleSave}
                    disabled={!isValid || !hasChanges || isSaving}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            {isCreatingNew ? 'Create Wildcard' : 'Save Changes'}
                        </>
                    )}
                </Button>

                {!isCreatingNew && selectedWildcardId && (
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}
