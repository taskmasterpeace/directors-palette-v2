'use client'

import { useEffect, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { SavedPrompt, usePromptLibraryStore } from "../store/prompt-library-store"
import { getClient } from "@/lib/db/client"
import { clipboardManager } from '@/utils/clipboard-manager'
import { logger } from '@/lib/logger'

export interface NewPromptData {
    title: string
    prompt: string
    categoryId: string
    tags: string
    isQuickAccess: boolean
}

export function usePromptLibraryManager(onSelectPrompt?: (prompt: string) => void) {
    const { toast } = useToast()

    const {
        prompts,
        categories,
        quickPrompts,
        searchQuery,
        selectedCategory,
        isLoading,
        addPrompt,
        updatePrompt,
        deletePrompt,
        toggleQuickAccess,
        addCategory,
        updateCategory,
        deleteCategory,
        clearAllPrompts,
        setSearchQuery,
        setSelectedCategory,
        loadUserPrompts,
        getPromptsByCategory
    } = usePromptLibraryStore()

    // Load user prompts on mount
    useEffect(() => {
        const loadPrompts = async () => {
            try {
                const supabase = await getClient()
                if (supabase) {
                    const { data: { user }, error } = await supabase.auth.getUser()
                    if (!error && user) {
                        await loadUserPrompts(user.id)
                    } else {
                        await loadUserPrompts('guest')
                    }
                } else {
                    await loadUserPrompts('guest')
                }
            } catch (error) {
                logger.shotCreator.warn('Prompt Library: Failed to check auth status, working offline', { error: error instanceof Error ? error.message : String(error) })
                await loadUserPrompts('guest')
            }
        }
        loadPrompts()
    }, [loadUserPrompts])

    // Filter prompts based on search query and category
    const filteredPrompts = useMemo(() => {
        let filtered = prompts

        // Filter by category
        if (selectedCategory) {
            filtered = filtered.filter(p => p.categoryId === selectedCategory)
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(query) ||
                p.prompt.toLowerCase().includes(query) ||
                (Array.isArray(p.tags) ? p.tags : []).some(tag => tag.toLowerCase().includes(query)) ||
                p.reference?.toLowerCase().includes(query)
            )
        }

        return filtered
    }, [prompts, searchQuery, selectedCategory])

    const categoryPrompts = useMemo(() =>
        selectedCategory ? getPromptsByCategory(selectedCategory) : [],
        [selectedCategory, getPromptsByCategory]
    )

    // Add prompt - takes prompt data as parameter
    const handleAddPrompt = async (promptData: NewPromptData) => {
        if (!promptData.title || !promptData.prompt) {
            toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' })
            return false
        }

        try {
            await addPrompt({
                title: promptData.title,
                prompt: promptData.prompt,
                categoryId: promptData.categoryId,
                tags: promptData.tags.split(',').map(t => t.trim()).filter(t => t),
                isQuickAccess: promptData.isQuickAccess,
                reference: `@${promptData.title.toLowerCase().replace(/\s+/g, '_')}`,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            })

            toast({ title: 'Success', description: 'Prompt added to library' })
            return true
        } catch (error) {
            logger.shotCreator.error('Failed to add prompt', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Error', description: 'Failed to add prompt', variant: 'destructive' })
            return false
        }
    }

    // Update prompt
    const handleUpdatePrompt = async (promptToUpdate: SavedPrompt) => {
        if (!promptToUpdate) return false

        try {
            await updatePrompt(promptToUpdate.id, promptToUpdate)
            toast({ title: 'Success', description: 'Prompt updated successfully' })
            return true
        } catch (error) {
            logger.shotCreator.error('Failed to update prompt', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Error', description: 'Failed to update prompt', variant: 'destructive' })
            return false
        }
    }

    // Copy prompt
    const handleCopyPrompt = async (prompt: string) => {
        try {
            await clipboardManager.writeText(prompt)
            toast({ title: 'Copied', description: 'Prompt copied to clipboard' })
        } catch (error) {
            logger.shotCreator.error('Copy failed', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Copy Failed', description: 'Unable to copy prompt', variant: 'destructive' })
        }
    }

    // Random prompt from category
    const getRandomFromCategory = (categoryId: string): string => {
        const prompts = getPromptsByCategory(categoryId)
        if (!prompts.length) return `@${categoryId}`
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]
        const snippet = randomPrompt.prompt.split(',')[0].trim()
        return snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet
    }

    // Replace @ placeholders
    const processPromptReplacements = (prompt: string) => {
        let processed = prompt
        const mappings: Record<string, string> = {
            '@cinematic': 'cinematic',
            '@characters': 'characters',
            '@character': 'characters',
            '@lighting': 'lighting',
            '@environments': 'environments',
            '@environment': 'environments',
            '@location': 'environments',
            '@effects': 'effects',
            '@effect': 'effects',
            '@moods': 'moods',
            '@mood': 'moods',
            '@camera': 'camera',
            '@styles': 'styles',
            '@style': 'styles'
        }

        Object.entries(mappings).forEach(([placeholder, categoryId]) => {
            const regex = new RegExp(placeholder.replace('@', '\\@'), 'gi')
            processed = processed.replace(regex, () => getRandomFromCategory(categoryId))
        })

        return processed
    }

    const handleSelectPrompt = (prompt: SavedPrompt) => {
        const processed = processPromptReplacements(prompt.prompt)
        if (onSelectPrompt) onSelectPrompt(processed)
        handleCopyPrompt(processed)
    }

    // Export prompts
    const handleExportPrompts = () => {
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                prompts: prompts.map(p => ({
                    id: p.id,
                    title: p.title,
                    prompt: p.prompt,
                    categoryId: p.categoryId,
                    tags: p.tags,
                    reference: p.reference,
                    isQuickAccess: p.isQuickAccess,
                    metadata: p.metadata
                })),
                categories: categories.filter(c => c.isEditable).map(c => ({
                    id: c.id,
                    name: c.name,
                    icon: c.icon,
                    color: c.color,
                    order: c.order
                }))
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `prompt-library-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast({ title: 'Export Successful', description: `Exported ${prompts.length} prompts` })
        } catch (error) {
            logger.shotCreator.error('Prompt Library: Failed to export prompts', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Export Failed', description: 'Failed to export prompts', variant: 'destructive' })
        }
    }

    // Import prompts
    const handleImportPrompts = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            const text = await file.text()
            const data = JSON.parse(text)

            if (!data.prompts || !Array.isArray(data.prompts)) throw new Error('Invalid import file format')

            if (data.categories && Array.isArray(data.categories)) {
                for (const cat of data.categories) {
                    if (!categories.find(c => c.id === cat.id)) {
                        await addCategory({ name: cat.name, icon: cat.icon, color: cat.color, isEditable: true, order: cat.order })
                    }
                }
            }

            let importedCount = 0
            let skippedCount = 0

            for (const p of data.prompts) {
                // Check for duplicates before attempting to add
                if (prompts.find(existing => existing.title === p.title && existing.categoryId === p.categoryId)) {
                    skippedCount++
                    continue
                }

                try {
                    await addPrompt({
                        title: p.title,
                        prompt: p.prompt,
                        categoryId: p.categoryId,
                        tags: p.tags || [],
                        reference: p.reference,
                        isQuickAccess: p.isQuickAccess || false,
                        metadata: {
                            createdAt: p.metadata?.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                    })
                    importedCount++
                } catch (error) {
                    logger.shotCreator.warn('Failed to import prompt "[title]"', { title: p.title, error: error instanceof Error ? error.message : String(error) })
                    skippedCount++
                }
            }

            const message = skippedCount > 0
                ? `Imported ${importedCount} prompts, skipped ${skippedCount} duplicates`
                : `Imported ${importedCount} new prompts`

            toast({
                title: 'Import Successful',
                description: message
            })
            event.target.value = ''
        } catch (error) {
            toast({ title: 'Import Failed', description: error instanceof Error ? error.message : 'Failed to import prompts', variant: 'destructive' })
            event.target.value = ''
        }
    }

    // Update category
    const handleUpdateCategory = async (id: string, updates: { name: string; icon: string }) => {
        try {
            await updateCategory(id, updates)
            toast({ title: 'Success', description: 'Category updated' })
        } catch (error) {
            logger.shotCreator.error('Failed to update category', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' })
        }
    }

    // Delete category
    const handleDeleteCategory = async (id: string) => {
        try {
            await deleteCategory(id)
            toast({ title: 'Success', description: 'Category deleted' })
        } catch (error) {
            logger.shotCreator.error('Failed to delete category', { error: error instanceof Error ? error.message : String(error) })
            toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' })
        }
    }

    // Clear all prompts
    const handleClearAllPrompts = () => {
        clearAllPrompts()
        toast({ title: 'Cleared', description: 'All prompts have been removed' })
    }

    return {
        prompts,
        categories,
        quickPrompts,
        searchQuery,
        selectedCategory,
        filteredPrompts,
        categoryPrompts,
        isLoading,
        handleAddPrompt,
        handleUpdatePrompt,
        handleCopyPrompt,
        handleSelectPrompt,
        handleExportPrompts,
        handleImportPrompts,
        handleUpdateCategory,
        handleDeleteCategory,
        handleClearAllPrompts,
        setSearchQuery,
        setSelectedCategory,
        toggleQuickAccess,
        deletePrompt,
        getPromptsByCategory,
        processPromptReplacements
    }
}
