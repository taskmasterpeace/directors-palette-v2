'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    Search,
    Pencil,
    Save,
    X,
    BookOpen,
    Star
} from 'lucide-react'
import { toast } from 'sonner'
import {
    NANO_BANANA_PROMPTS,
    PROMPT_CATEGORIES,
    PromptPreset
} from '../../constants/prompt-library-presets'
import { clipboardManager } from '@/utils/clipboard-manager'
import { usePromptLibraryStore } from '../../store/prompt-library-store'
import { cn } from '@/utils/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { Textarea } from '@/components/ui/textarea'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface PromptBrowserProps {
    onSelectPrompt?: (prompt: string) => void
}

export function PromptBrowser({ onSelectPrompt }: PromptBrowserProps) {
    const { user } = useAuth()
    const isAdmin = user?.email ? isAdminEmail(user.email) : false
    const { toggleQuickAccess, prompts: savedPrompts, addPrompt } = usePromptLibraryStore()

    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [editingPrompt, setEditingPrompt] = useState<PromptPreset | null>(null)
    const [editedText, setEditedText] = useState('')

    // Filter prompts based on search
    const filteredPrompts = useMemo(() => {
        if (!searchQuery.trim()) return NANO_BANANA_PROMPTS

        const query = searchQuery.toLowerCase()
        return NANO_BANANA_PROMPTS.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.prompt.toLowerCase().includes(query) ||
            p.tags.some(tag => tag.toLowerCase().includes(query))
        )
    }, [searchQuery])

    // Group prompts by category
    const promptsByCategory = useMemo(() => {
        const grouped: Record<string, PromptPreset[]> = {}

        PROMPT_CATEGORIES.forEach(cat => {
            grouped[cat.id] = filteredPrompts.filter(p => p.categoryId === cat.id)
        })

        return grouped
    }, [filteredPrompts])

    // Toggle category expansion
    const toggleCategory = (categoryId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev)
            if (next.has(categoryId)) {
                next.delete(categoryId)
            } else {
                next.add(categoryId)
            }
            return next
        })
    }

    // Expand all categories
    const expandAll = () => {
        setExpandedCategories(new Set(PROMPT_CATEGORIES.map(c => c.id)))
    }

    // Collapse all categories
    const collapseAll = () => {
        setExpandedCategories(new Set())
    }

    // Copy prompt to clipboard
    const copyPrompt = async (prompt: PromptPreset) => {
        try {
            await clipboardManager.writeText(prompt.prompt)
            setCopiedId(prompt.id)
            toast.success(`Copied: ${prompt.title}`)
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error('Failed to copy')
        }
    }

    // Use prompt (insert into prompt field)
    const applyPrompt = (prompt: PromptPreset) => {
        if (onSelectPrompt) {
            onSelectPrompt(prompt.prompt)
            toast.success(`Using: ${prompt.title}`)
        } else {
            copyPrompt(prompt)
        }
    }

    // Start editing a prompt (admin only)
    const startEditing = (prompt: PromptPreset) => {
        setEditingPrompt(prompt)
        setEditedText(prompt.prompt)
    }

    // Save edited prompt (admin only) - for now just show what would be saved
    const savePrompt = () => {
        if (!editingPrompt) return

        // TODO: Implement actual save to database
        toast.info('Prompt editing will be saved to database (coming soon)')
        console.log('Would save prompt:', {
            id: editingPrompt.id,
            originalPrompt: editingPrompt.prompt,
            newPrompt: editedText
        })
        setEditingPrompt(null)
    }

    // Check if a preset prompt is in quick access
    const isInQuickAccess = (promptId: string) => {
        return savedPrompts.some(p => p.id === promptId && p.isQuickAccess)
    }

    // Toggle quick access for a preset - adds to store if not exists
    const handleToggleQuickAccess = async (preset: PromptPreset) => {
        const existingPrompt = savedPrompts.find(p => p.id === preset.id)

        if (existingPrompt) {
            // Prompt exists in store, just toggle quick access
            await toggleQuickAccess(preset.id)
            toast.success(existingPrompt.isQuickAccess
                ? `Removed "${preset.title}" from Quick Presets`
                : `Added "${preset.title}" to Quick Presets`
            )
        } else {
            // Prompt doesn't exist in store, add it with isQuickAccess: true
            try {
                await addPrompt({
                    id: preset.id,
                    title: preset.title,
                    prompt: preset.prompt,
                    categoryId: preset.categoryId,
                    tags: preset.tags,
                    isQuickAccess: true,
                    reference: preset.reference,
                    metadata: {
                        source: 'prompt-library',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }
                })
                toast.success(`Added "${preset.title}" to Quick Presets`)
            } catch (error) {
                console.error('Failed to add prompt:', error)
                toast.error('Failed to add to Quick Presets')
            }
        }
    }

    return (
        <div className="space-y-3">
            {/* Toggle Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-between bg-card border-border hover:bg-secondary text-foreground"
            >
                <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Prompt Library ({NANO_BANANA_PROMPTS.length} prompts)
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>

            {/* Expanded Content */}
            {isOpen && (
                <div className="border border-border rounded-lg bg-card/50 overflow-hidden">
                    {/* Search and Controls */}
                    <div className="p-3 border-b border-border space-y-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search prompts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background border-border"
                            />
                        </div>
                        <div className="flex gap-2 text-xs">
                            <Button variant="ghost" size="sm" onClick={expandAll} className="h-6 px-2 text-xs">
                                Expand All
                            </Button>
                            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-6 px-2 text-xs">
                                Collapse All
                            </Button>
                            {isAdmin && (
                                <Badge variant="outline" className="ml-auto text-amber-400 border-amber-600">
                                    Admin Mode
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Categories and Prompts */}
                    <div className="max-h-96 overflow-y-auto">
                        {PROMPT_CATEGORIES.map(category => {
                            const prompts = promptsByCategory[category.id] || []
                            if (prompts.length === 0) return null

                            const isExpanded = expandedCategories.has(category.id)

                            return (
                                <Collapsible
                                    key={category.id}
                                    open={isExpanded}
                                    onOpenChange={() => toggleCategory(category.id)}
                                >
                                    <CollapsibleTrigger className="w-full px-3 py-2 flex items-center justify-between hover:bg-secondary/50 border-b border-border/50">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <span>{category.icon}</span>
                                            <span>{category.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {prompts.length}
                                            </Badge>
                                        </span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <div className="divide-y divide-border/30">
                                            {prompts.map(prompt => (
                                                <div
                                                    key={prompt.id}
                                                    className="px-3 py-2 hover:bg-secondary/30 group"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm font-medium text-foreground">
                                                                    {prompt.title}
                                                                </span>
                                                                {prompt.isQuickAccess && (
                                                                    <Badge variant="outline" className="text-xs text-amber-400 border-amber-600">
                                                                        Quick
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                                {prompt.prompt}
                                                            </p>
                                                            {prompt.reference && (
                                                                <p className="text-xs text-blue-400 mt-1">
                                                                    📷 {prompt.reference}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleToggleQuickAccess(prompt)}
                                                                className={cn(
                                                                    "h-7 w-7 p-0",
                                                                    isInQuickAccess(prompt.id)
                                                                        ? "text-amber-400 hover:text-amber-500"
                                                                        : "text-muted-foreground hover:text-foreground"
                                                                )}
                                                                title={isInQuickAccess(prompt.id) ? "Remove from Quick Presets" : "Add to Quick Presets"}
                                                            >
                                                                <Star className={cn("w-3 h-3", isInQuickAccess(prompt.id) && "fill-current")} />
                                                            </Button>
                                                            {isAdmin && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => startEditing(prompt)}
                                                                    className="h-7 w-7 p-0"
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => copyPrompt(prompt)}
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                {copiedId === prompt.id ? (
                                                                    <Check className="w-3 h-3 text-green-500" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                            {onSelectPrompt && (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => applyPrompt(prompt)}
                                                                    className="h-7 px-2 text-xs"
                                                                >
                                                                    Use
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Tags */}
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {prompt.tags.slice(0, 4).map(tag => (
                                                            <Badge
                                                                key={tag}
                                                                variant="secondary"
                                                                className="text-xs px-1.5 py-0 h-4"
                                                            >
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )
                        })}
                    </div>

                    {/* Results count */}
                    <div className="px-3 py-2 border-t border-border text-xs text-muted-foreground">
                        {searchQuery ? (
                            <span>Found {filteredPrompts.length} prompts</span>
                        ) : (
                            <span>{NANO_BANANA_PROMPTS.length} prompts in {PROMPT_CATEGORIES.length} categories</span>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Dialog (Admin only) */}
            <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Prompt: {editingPrompt?.title}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <Textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            rows={6}
                            className="font-mono text-sm"
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                            </Button>
                            <Button onClick={savePrompt}>
                                <Save className="w-4 h-4 mr-1" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default PromptBrowser
