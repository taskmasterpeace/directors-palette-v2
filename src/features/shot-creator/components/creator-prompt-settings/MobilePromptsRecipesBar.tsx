'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/utils/utils'
import { useRecipeStore } from '../../store/recipe.store'
import { usePromptLibraryStore } from '../../store/prompt-library-store'
import { PROMPT_CATEGORIES } from '../../constants/prompt-library-presets'

type ActivePanel = 'none' | 'prompts' | 'recipes'
type PromptView = 'categories' | 'prompts'

interface MobilePromptsRecipesBarProps {
    onSelectPrompt: (prompt: string) => void
    onSelectRecipe: (recipeId: string) => void
    className?: string
}

export function MobilePromptsRecipesBar({
    onSelectPrompt,
    onSelectRecipe,
    className
}: MobilePromptsRecipesBarProps) {
    const [activePanel, setActivePanel] = useState<ActivePanel>('none')
    const [promptView, setPromptView] = useState<PromptView>('categories')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Recipe store
    const { quickAccessItems, setActiveRecipe } = useRecipeStore()
    const recipeItems = quickAccessItems
        .filter((item) => item.type === 'recipe' && item.recipeId)
        .sort((a, b) => a.order - b.order)

    // Prompt library store
    const { prompts } = usePromptLibraryStore()

    // Get prompts by category
    const getPromptsByCategory = (categoryId: string) => {
        return prompts.filter(p => p.categoryId === categoryId)
    }

    // Toggle panel
    const handleToggle = (panel: 'prompts' | 'recipes') => {
        if (activePanel === panel) {
            // If clicking the same panel, close it (or go back in prompts)
            if (panel === 'prompts' && promptView === 'prompts') {
                setPromptView('categories')
                setSelectedCategory(null)
            } else {
                setActivePanel('none')
                setPromptView('categories')
                setSelectedCategory(null)
            }
        } else {
            setActivePanel(panel)
            setPromptView('categories')
            setSelectedCategory(null)
        }
    }

    // Handle category selection
    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId)
        setPromptView('prompts')
    }

    // Handle prompt selection
    const handlePromptSelect = (promptText: string) => {
        onSelectPrompt(promptText)
        setActivePanel('none')
        setPromptView('categories')
        setSelectedCategory(null)
    }

    // Handle recipe selection
    const handleRecipeSelect = (recipeId: string) => {
        setActiveRecipe(recipeId)
        onSelectRecipe(recipeId)
        setActivePanel('none')
    }

    // Reset scroll position when content changes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = 0
        }
    }, [activePanel, promptView, selectedCategory])

    return (
        <div className={cn('lg:hidden', className)}>
            {/* Toggle Buttons Row - Centered */}
            <div className="flex items-center justify-center gap-3 mb-2">
                <Button
                    variant={activePanel === 'prompts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggle('prompts')}
                    className={cn(
                        'h-8 px-4 text-sm font-medium transition-all',
                        activePanel === 'prompts'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border-border hover:bg-secondary'
                    )}
                >
                    Prompts
                </Button>
                <Button
                    variant={activePanel === 'recipes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggle('recipes')}
                    className={cn(
                        'h-8 px-4 text-sm font-medium transition-all',
                        activePanel === 'recipes'
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-card border-border hover:bg-secondary'
                    )}
                >
                    Recipes
                </Button>
            </div>

            {/* Horizontal Scrollable Content Row */}
            {activePanel !== 'none' && (
                <div
                    ref={scrollRef}
                    className="overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                >
                    <div className="flex gap-2 min-w-max">
                        {/* PROMPTS PANEL */}
                        {activePanel === 'prompts' && promptView === 'categories' && (
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
                                                'h-10 px-4 text-sm whitespace-nowrap',
                                                'bg-card border-border hover:bg-secondary',
                                                'flex items-center gap-2'
                                            )}
                                        >
                                            <span>{cat.icon}</span>
                                            <span>{cat.name}</span>
                                            {categoryPrompts.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    ({categoryPrompts.length})
                                                </span>
                                            )}
                                        </Button>
                                    )
                                })}
                            </>
                        )}

                        {/* PROMPTS - Show prompts in selected category */}
                        {activePanel === 'prompts' && promptView === 'prompts' && selectedCategory && (
                            <>
                                {/* Back button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setPromptView('categories')
                                        setSelectedCategory(null)
                                    }}
                                    className="h-10 px-3 text-sm text-muted-foreground hover:text-white"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Back
                                </Button>

                                {getPromptsByCategory(selectedCategory).map((prompt) => (
                                    <Button
                                        key={prompt.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePromptSelect(prompt.prompt)}
                                        className={cn(
                                            'h-10 px-4 text-sm whitespace-nowrap',
                                            'bg-card border-border hover:bg-primary/20',
                                            'border-l-2 border-l-primary'
                                        )}
                                    >
                                        {prompt.title}
                                    </Button>
                                ))}

                                {getPromptsByCategory(selectedCategory).length === 0 && (
                                    <span className="text-sm text-muted-foreground px-4 py-2">
                                        No prompts in this category
                                    </span>
                                )}
                            </>
                        )}

                        {/* RECIPES PANEL */}
                        {activePanel === 'recipes' && (
                            <>
                                {recipeItems.length === 0 ? (
                                    <span className="text-sm text-muted-foreground px-4 py-2">
                                        No recipes added. Go to Prompt Tools to create recipes.
                                    </span>
                                ) : (
                                    recipeItems.map((item) => (
                                        <Button
                                            key={item.id}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => item.recipeId && handleRecipeSelect(item.recipeId)}
                                            className={cn(
                                                'h-10 px-4 text-sm whitespace-nowrap',
                                                'bg-card border-border hover:bg-amber-500/20',
                                                'border-l-2 border-l-amber-500'
                                            )}
                                        >
                                            {item.label}
                                        </Button>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
