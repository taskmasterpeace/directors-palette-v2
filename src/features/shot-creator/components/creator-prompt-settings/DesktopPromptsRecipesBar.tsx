'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronLeft, ChevronDown, ChevronUp, BookOpen, FlaskConical, Save, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useRecipeStore } from '../../store/recipe.store'
import { usePromptLibraryStore } from '../../store/prompt-library-store'
import { PROMPT_CATEGORIES } from '../../constants/prompt-library-presets'
import { AddPromptDialog } from '../prompt-library/dialogs/AddPromptDialog'
import { logger } from '@/lib/logger'

type ActiveTab = 'prompts' | 'recipes'
type PromptView = 'categories' | 'prompts'

interface DesktopPromptsRecipesBarProps {
    onSelectPrompt: (prompt: string) => void
    onSelectRecipe: (recipeId: string) => void
    currentPrompt?: string
    className?: string
}

// Inline rename input component
function InlineRenameInput({
    value,
    onSave,
    onCancel,
}: {
    value: string
    onSave: (newValue: string) => void
    onCancel: () => void
}) {
    const [text, setText] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const trimmed = text.trim()
            if (trimmed) onSave(trimmed)
            else onCancel()
        } else if (e.key === 'Escape') {
            onCancel()
        }
    }

    return (
        <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
                const trimmed = text.trim()
                if (trimmed && trimmed !== value) onSave(trimmed)
                else onCancel()
            }}
            className="h-8 px-2 text-xs bg-card border border-primary rounded w-28 text-white outline-none"
        />
    )
}

export function DesktopPromptsRecipesBar({
    onSelectPrompt,
    onSelectRecipe,
    currentPrompt = '',
    className
}: DesktopPromptsRecipesBarProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<ActiveTab>('prompts')
    const [promptView, setPromptView] = useState<PromptView>('categories')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [showAddPromptDialog, setShowAddPromptDialog] = useState(false)

    // Inline rename state
    const [renamingPromptId, setRenamingPromptId] = useState<string | null>(null)
    const [renamingRecipeId, setRenamingRecipeId] = useState<string | null>(null)

    // Recipe store
    const { quickAccessItems, setActiveRecipe, removeFromQuickAccess, updateQuickAccessLabel, deleteRecipe } = useRecipeStore()
    const recipeItems = quickAccessItems
        .filter((item) => item.type === 'recipe' && item.recipeId)
        .sort((a, b) => a.order - b.order)

    // Prompt library store
    const { prompts, categories, addPrompt, updatePrompt, deletePrompt } = usePromptLibraryStore()

    // Get prompts by category
    const getPromptsByCategory = (categoryId: string) => {
        return prompts.filter(p => p.categoryId === categoryId)
    }

    // Handle tab change
    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab)
        if (tab === 'prompts') {
            setPromptView('categories')
            setSelectedCategory(null)
        }
    }

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId)
        setPromptView('prompts')
    }

    const handlePromptSelect = (promptText: string) => {
        onSelectPrompt(promptText)
    }

    const handleRecipeSelect = (recipeId: string) => {
        setActiveRecipe(recipeId)
        onSelectRecipe(recipeId)
    }

    const handleBackToCategories = () => {
        setPromptView('categories')
        setSelectedCategory(null)
    }

    // Prompt rename/delete
    const handleRenamePrompt = async (id: string, newTitle: string) => {
        await updatePrompt(id, { title: newTitle })
        setRenamingPromptId(null)
    }

    const handleDeletePrompt = async (id: string) => {
        await deletePrompt(id)
    }

    // Recipe rename/delete
    const handleRenameRecipeLabel = async (quickAccessId: string, newLabel: string) => {
        await updateQuickAccessLabel(quickAccessId, newLabel)
        setRenamingRecipeId(null)
    }

    const handleRemoveRecipeFromQuickAccess = async (quickAccessId: string) => {
        await removeFromQuickAccess(quickAccessId)
    }

    const handleDeleteRecipeFull = async (recipeId: string, quickAccessId: string) => {
        await removeFromQuickAccess(quickAccessId)
        await deleteRecipe(recipeId)
    }

    // Handle adding a new prompt
    const handleAddPrompt = async (promptData: {
        title: string
        prompt: string
        categoryId: string
        tags: string
        isQuickAccess: boolean
    }) => {
        try {
            await addPrompt({
                title: promptData.title,
                prompt: promptData.prompt,
                categoryId: promptData.categoryId,
                tags: promptData.tags.split(',').map(t => t.trim()).filter(Boolean),
                isQuickAccess: promptData.isQuickAccess,
                metadata: {
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    source: 'save-current'
                }
            })
            setShowAddPromptDialog(false)
        } catch (error) {
            logger.shotCreator.error('Failed to add prompt', { error: error instanceof Error ? error.message : String(error) })
        }
    }

    const getCategoryName = (categoryId: string) => {
        const cat = PROMPT_CATEGORIES.find(c => c.id === categoryId)
        return cat ? `${cat.icon} ${cat.name}` : 'Prompts'
    }

    const promptCount = prompts.length
    const recipeCount = recipeItems.length

    return (
        <div className={cn(className)}>
            {/* Collapsed Bar */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-card border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                            Prompts
                            {promptCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-medium">
                                    {promptCount}
                                </span>
                            )}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <FlaskConical className="w-4 h-4" />
                            Recipes
                            {recipeCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-500 rounded text-[10px] font-medium">
                                    {recipeCount}
                                </span>
                            )}
                        </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
            )}

            {/* Expanded Tab Bar */}
            {isExpanded && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Tab Buttons with Collapse */}
                    <div className="flex border-b border-border">
                        <button
                            onClick={() => handleTabChange('prompts')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                                activeTab === 'prompts'
                                    ? 'text-white bg-secondary border-b-2 border-primary'
                                    : 'text-muted-foreground hover:text-white hover:bg-secondary/50'
                            )}
                        >
                            <BookOpen className="w-4 h-4" />
                            Prompts
                        </button>
                        <button
                            onClick={() => handleTabChange('recipes')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                                activeTab === 'recipes'
                                    ? 'text-white bg-secondary border-b-2 border-amber-500'
                                    : 'text-muted-foreground hover:text-white hover:bg-secondary/50'
                            )}
                        >
                            <FlaskConical className="w-4 h-4" />
                            Recipes
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="px-3 text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                            title="Collapse"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-3 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="flex items-center gap-2 flex-nowrap lg:flex-wrap min-w-max lg:min-w-0">
                            {/* PROMPTS TAB - Categories View */}
                            {activeTab === 'prompts' && promptView === 'categories' && (
                                <>
                                    {PROMPT_CATEGORIES.map((cat) => {
                                        const categoryPrompts = getPromptsByCategory(cat.id)
                                        return (
                                            <Button
                                                key={cat.id}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCategorySelect(cat.id)}
                                                className={cn(
                                                    'h-10 lg:h-8 px-4 lg:px-3 text-sm lg:text-xs whitespace-nowrap',
                                                    'bg-card hover:bg-secondary border-border',
                                                    'flex items-center gap-1.5'
                                                )}
                                            >
                                                <span>{cat.icon}</span>
                                                <span>{cat.name}</span>
                                                {categoryPrompts.length > 0 && (
                                                    <span className="ml-1 px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                                                        {categoryPrompts.length}
                                                    </span>
                                                )}
                                            </Button>
                                        )
                                    })}

                                    {currentPrompt.trim().length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAddPromptDialog(true)}
                                            className={cn(
                                                'h-10 lg:h-8 px-4 lg:px-3 text-sm lg:text-xs ml-auto whitespace-nowrap',
                                                'bg-primary/10 hover:bg-primary/20 border-primary/30',
                                                'text-primary flex items-center gap-1.5'
                                            )}
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Save Prompt
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* PROMPTS TAB - Prompts in Category View */}
                            {activeTab === 'prompts' && promptView === 'prompts' && selectedCategory && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleBackToCategories}
                                        className="h-10 lg:h-8 px-3 lg:px-2 text-sm lg:text-xs text-muted-foreground hover:text-white"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        {getCategoryName(selectedCategory)}
                                    </Button>

                                    <div className="w-px h-6 bg-border mx-1" />

                                    {getPromptsByCategory(selectedCategory).map((prompt) => (
                                        <div key={prompt.id} className="group relative flex items-center">
                                            {renamingPromptId === prompt.id ? (
                                                <InlineRenameInput
                                                    value={prompt.title}
                                                    onSave={(val) => handleRenamePrompt(prompt.id, val)}
                                                    onCancel={() => setRenamingPromptId(null)}
                                                />
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handlePromptSelect(prompt.prompt)}
                                                        className={cn(
                                                            'h-10 lg:h-8 px-4 lg:px-3 pr-8 lg:pr-7 text-sm lg:text-xs whitespace-nowrap',
                                                            'bg-card hover:bg-primary/20 border-border',
                                                            'border-l-2 border-l-primary'
                                                        )}
                                                    >
                                                        {prompt.title}
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-opacity p-0.5 rounded">
                                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-36">
                                                            <DropdownMenuItem onClick={() => setRenamingPromptId(prompt.id)}>
                                                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                                                Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeletePrompt(prompt.id)}
                                                                className="text-red-400 focus:text-red-400"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {getPromptsByCategory(selectedCategory).length === 0 && (
                                        <span className="text-xs text-muted-foreground px-2">
                                            No prompts in this category
                                        </span>
                                    )}

                                    {currentPrompt.trim().length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAddPromptDialog(true)}
                                            className={cn(
                                                'h-10 lg:h-8 px-4 lg:px-3 text-sm lg:text-xs ml-auto whitespace-nowrap',
                                                'bg-primary/10 hover:bg-primary/20 border-primary/30',
                                                'text-primary flex items-center gap-1.5'
                                            )}
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Save Prompt
                                        </Button>
                                    )}
                                </>
                            )}

                            {/* RECIPES TAB */}
                            {activeTab === 'recipes' && (
                                <>
                                    {recipeItems.length === 0 ? (
                                        <span className="text-xs text-muted-foreground px-2">
                                            No recipes in quick access. Add recipes from Prompt Tools.
                                        </span>
                                    ) : (
                                        recipeItems.map((item) => (
                                            <div key={item.id} className="group relative flex items-center">
                                                {renamingRecipeId === item.id ? (
                                                    <InlineRenameInput
                                                        value={item.label}
                                                        onSave={(val) => handleRenameRecipeLabel(item.id, val)}
                                                        onCancel={() => setRenamingRecipeId(null)}
                                                    />
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => item.recipeId && handleRecipeSelect(item.recipeId)}
                                                            className={cn(
                                                                'h-10 lg:h-8 px-4 lg:px-3 pr-8 lg:pr-7 text-sm lg:text-xs whitespace-nowrap',
                                                                'bg-card hover:bg-amber-500/20 border-border',
                                                                'border-l-2 border-l-amber-500'
                                                            )}
                                                        >
                                                            {item.label}
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-white transition-opacity p-0.5 rounded">
                                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-44">
                                                                <DropdownMenuItem onClick={() => setRenamingRecipeId(item.id)}>
                                                                    <Pencil className="w-3.5 h-3.5 mr-2" />
                                                                    Rename Label
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleRemoveRecipeFromQuickAccess(item.id)}
                                                                    className="text-yellow-400 focus:text-yellow-400"
                                                                >
                                                                    <FlaskConical className="w-3.5 h-3.5 mr-2" />
                                                                    Remove from Bar
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => item.recipeId && handleDeleteRecipeFull(item.recipeId, item.id)}
                                                                    className="text-red-400 focus:text-red-400"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                                    Delete Recipe
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Prompt Dialog */}
            <AddPromptDialog
                open={showAddPromptDialog}
                onOpenChange={setShowAddPromptDialog}
                categories={categories}
                onAdd={handleAddPrompt}
                initialPrompt={currentPrompt}
            />
        </div>
    )
}
