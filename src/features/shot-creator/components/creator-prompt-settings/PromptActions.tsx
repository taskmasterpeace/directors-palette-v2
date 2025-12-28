import React, { Fragment, useState, useRef } from "react"
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Textarea } from '@/components/ui/textarea'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    Sparkles,
    HelpCircle,
    X,
    Minimize2,
    Maximize2,
    Square
} from 'lucide-react'
import { useShotCreatorStore } from "@/features/shot-creator/store/shot-creator.store"
import { getModelConfig } from "@/config"
import { useShotCreatorSettings } from "../../hooks"
import { useImageGeneration } from "../../hooks/useImageGeneration"
import { PromptSyntaxFeedback } from "./PromptSyntaxFeedback"
import { parseDynamicPrompt } from "../../helpers/prompt-syntax-feedback"
import { useWildCardStore } from "../../store/wildcard.store"
import { QuickAccessBar, RecipeFormFields } from "../recipe"
import { OrganizeButton } from "../prompt-organizer"
import { MobilePromptsRecipesBar } from "./MobilePromptsRecipesBar"
import { usePromptAutocomplete } from "../../hooks/usePromptAutocomplete"
import { useCallback } from "react"
import { extractAtTags, urlToFile } from "../../helpers"
import { ShotCreatorReferenceImage } from "../../types"
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"
import { useLibraryStore } from "../../store/shot-library.store"
import { useRecipeStore } from "../../store/recipe.store"
import { cn } from "@/utils/utils"
import { Category } from "../CategorySelectDialog"
import { executeRecipe } from "@/features/shared/services/recipe-execution.service"
import type { Recipe } from "../../types/recipe.types"
import { toast } from "sonner"

/**
 * Check if a recipe has any tool stages that require special execution
 */
function hasToolStages(recipe: Recipe): boolean {
    return recipe.stages.some(stage => stage.type === 'tool')
}

const PromptActions = ({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) => {
    const {
        shotCreatorPrompt,
        shotCreatorReferenceImages,
        setShotCreatorPrompt,
        setShotCreatorReferenceImages,
        setStageReferenceImages,
    } = useShotCreatorStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { generateImage, isGenerating, cancelGeneration } = useImageGeneration()
    const { libraryItems } = useLibraryStore()
    const { wildcards } = useWildCardStore()
    const { activeRecipeId, activeFieldValues, setActiveRecipe, getActiveRecipe, getActiveValidation, buildActivePrompts } = useRecipeStore()

    // Calculate generation cost
    const generationCost = React.useMemo(() => {
        const model = shotCreatorSettings.model || 'nano-banana'
        const modelConfig = getModelConfig(model)
        const costPerImage = modelConfig.costPerImage

        // Parse the prompt to get image count
        const parsedPrompt = parseDynamicPrompt(shotCreatorPrompt, {
            disablePipeSyntax: shotCreatorSettings.disablePipeSyntax,
            disableBracketSyntax: shotCreatorSettings.disableBracketSyntax,
            disableWildcardSyntax: shotCreatorSettings.disableWildcardSyntax
        }, wildcards)

        const imageCount = parsedPrompt.totalCount || 1
        const totalCost = imageCount * costPerImage

        // Convert dollar cost to tokens (1 token = $0.01)
        const tokenCost = Math.ceil(totalCost * 100)

        return {
            imageCount,
            totalCost,
            tokenCost,
            costPerImage
        }
    }, [shotCreatorPrompt, shotCreatorSettings, wildcards])

    // Autocomplete state
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [autocompleteSearch, setAutocompleteSearch] = useState('')
    const [autocompleteCursorPos, setAutocompleteCursorPos] = useState(0)
    const autocompleteRef = useRef<HTMLDivElement>(null)

    // Textarea size state
    type TextareaSize = 'small' | 'medium' | 'large'
    const [textareaSize, setTextareaSize] = useState<TextareaSize>('medium')

    // Track last used recipe for generation metadata
    const [lastUsedRecipe, setLastUsedRecipe] = useState<{ recipeId: string; recipeName: string } | null>(null)

    // Get textarea height class based on size
    const getTextareaHeight = (size: TextareaSize) => {
        switch (size) {
            case 'small': return 'min-h-[44px]'
            case 'medium': return 'min-h-[100px]'
            case 'large': return 'min-h-[240px]'
        }
    }

    // Autocomplete for @references - destructure to avoid circular dependencies
    const autocomplete = usePromptAutocomplete()
    const {
        selectedIndex: autocompleteSelectedIndex,
        selectedItem: _autocompleteSelectedItem,
        handleTextChange: handleAutocompleteTextChange,
        insertItem: _insertAutocompleteItem,
        close: _closeAutocomplete,
        selectNext: _selectNextAutocomplete,
        selectPrevious: _selectPreviousAutocomplete,
        selectIndex: selectAutocompleteIndex
    } = autocomplete
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    // Can generate: either regular mode (prompt + refs) OR recipe mode (valid recipe)
    // Note: activeFieldValues is needed in deps to trigger recalc when recipe fields change,
    // even though it's only used indirectly via getActiveValidation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const canGenerate = React.useMemo(() => {
        const activeRecipe = getActiveRecipe()
        if (activeRecipe) {
            const validation = getActiveValidation()
            // Recipe mode: valid fields + has refs (user's OR recipe's built-in)
            const hasRefs = shotCreatorReferenceImages.length > 0 ||
                activeRecipe.stages.some(s => (s.referenceImages?.length || 0) > 0)
            return (validation?.isValid ?? false) && hasRefs
        }
        // Regular mode: needs prompt and refs
        return shotCreatorPrompt.length > 0 && shotCreatorReferenceImages.length > 0
    }, [shotCreatorPrompt, shotCreatorReferenceImages, activeFieldValues, getActiveRecipe, getActiveValidation])

    // Get references grouped by category from library items
    const getReferencesGroupedByCategory = useCallback(() => {
        const grouped: Record<Category, string[]> = {
            people: [],
            places: [],
            props: [],
            unorganized: []
        }

        libraryItems.forEach(item => {
            if (item.tags && item.tags.length > 0) {
                const category = item.category as Category
                item.tags.forEach(tag => {
                    const formattedTag = `@${tag}`
                    if (!grouped[category].includes(formattedTag)) {
                        grouped[category].push(formattedTag)
                    }
                })
            }
        })

        return grouped
    }, [libraryItems])

    // Filter autocomplete suggestions with category grouping
    const autocompleteSuggestions = React.useMemo(() => {
        const grouped = getReferencesGroupedByCategory()
        const searchWithAt = autocompleteSearch.startsWith('@')
            ? autocompleteSearch.toLowerCase()
            : '@' + autocompleteSearch.toLowerCase()

        // Filter each category
        const filtered: Record<Category, string[]> = {
            people: autocompleteSearch
                ? grouped.people.filter(ref => ref.toLowerCase().startsWith(searchWithAt))
                : grouped.people,
            places: autocompleteSearch
                ? grouped.places.filter(ref => ref.toLowerCase().startsWith(searchWithAt))
                : grouped.places,
            props: autocompleteSearch
                ? grouped.props.filter(ref => ref.toLowerCase().startsWith(searchWithAt))
                : grouped.props,
            unorganized: autocompleteSearch
                ? grouped.unorganized.filter(ref => ref.toLowerCase().startsWith(searchWithAt))
                : grouped.unorganized
        }

        return filtered
    }, [autocompleteSearch, getReferencesGroupedByCategory])

    // Handle autocomplete selection
    const selectAutocompleteSuggestion = useCallback((suggestion: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const beforeCursor = shotCreatorPrompt.substring(0, autocompleteCursorPos)
        const afterCursor = shotCreatorPrompt.substring(autocompleteCursorPos)

        // Find the start of the @ mention
        const atIndex = beforeCursor.lastIndexOf('@')
        const before = shotCreatorPrompt.substring(0, atIndex)
        const newPrompt = before + suggestion + ' ' + afterCursor

        setShotCreatorPrompt(newPrompt)
        setShowAutocomplete(false)
        setAutocompleteSearch('')

        // Set cursor position after the inserted tag
        setTimeout(() => {
            const newPos = atIndex + suggestion.length + 1
            textarea.focus()
            textarea.setSelectionRange(newPos, newPos)
        }, 0)
    }, [shotCreatorPrompt, autocompleteCursorPos, textareaRef, setShotCreatorPrompt])

    // Detect @ symbol and show autocomplete
    const handleTextareaKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const textBeforeCursor = shotCreatorPrompt.substring(0, cursorPos)

        // Find last @ symbol before cursor
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')

        if (lastAtIndex !== -1) {
            // Check if there's a space between @ and cursor (if so, close autocomplete)
            const textAfterAt = textBeforeCursor.substring(lastAtIndex)
            if (textAfterAt.includes(' ')) {
                setShowAutocomplete(false)
                return
            }

            // Extract search term (everything after @)
            const search = textAfterAt.substring(1) // Remove the @ symbol
            setAutocompleteSearch(search)
            setAutocompleteCursorPos(cursorPos)
            setShowAutocomplete(true)
            selectAutocompleteIndex(0)
        } else {
            setShowAutocomplete(false)
        }
    }, [shotCreatorPrompt, selectAutocompleteIndex])

    // Flatten suggestions for keyboard navigation
    const flatSuggestions = React.useMemo(() => {
        const flat: string[] = []
        Object.values(autocompleteSuggestions).forEach(categoryRefs => {
            flat.push(...categoryRefs)
        })
        return flat
    }, [autocompleteSuggestions])

    // Check if we have any suggestions
    const hasSuggestions = flatSuggestions.length > 0

    // Handle keyboard navigation in autocomplete
    const handleAutocompleteKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showAutocomplete || !hasSuggestions) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const nextIndex = autocompleteSelectedIndex < flatSuggestions.length - 1 ? autocompleteSelectedIndex + 1 : 0
            selectAutocompleteIndex(nextIndex)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const prevIndex = autocompleteSelectedIndex > 0 ? autocompleteSelectedIndex - 1 : flatSuggestions.length - 1
            selectAutocompleteIndex(prevIndex)
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (flatSuggestions[autocompleteSelectedIndex]) {
                e.preventDefault()
                selectAutocompleteSuggestion(flatSuggestions[autocompleteSelectedIndex])
            }
        } else if (e.key === 'Escape') {
            e.preventDefault()
            setShowAutocomplete(false)
        }
    }, [showAutocomplete, hasSuggestions, flatSuggestions, autocompleteSelectedIndex, selectAutocompleteSuggestion, selectAutocompleteIndex])

    // Build model settings from shotCreatorSettings
    const buildModelSettings = useCallback(() => {
        const model = shotCreatorSettings.model || 'nano-banana'

        // Base settings
        const baseSettings: Record<string, unknown> = {}

        switch (model) {
            case 'nano-banana':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                break
            case 'nano-banana-pro':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                baseSettings.resolution = shotCreatorSettings.resolution
                baseSettings.safetyFilterLevel = shotCreatorSettings.safetyFilterLevel || 'block_only_high'
                break
        }

        console.log('✅ Built model settings:', JSON.stringify(baseSettings, null, 2))
        return baseSettings
    }, [shotCreatorSettings])

    // Handle generation - processes recipe at generation time (no separate Apply step)
    const handleGenerate = useCallback(async () => {
        if (!canGenerate || isGenerating) return

        const activeRecipe = getActiveRecipe()
        const validation = getActiveValidation()

        // Recipe mode: process recipe fields and generate
        if (activeRecipe) {
            // Validate recipe fields
            if (!validation?.isValid) {
                console.warn('Recipe validation failed:', validation?.missingFields)
                return
            }

            // Build prompts from recipe fields
            const result = buildActivePrompts()
            if (!result || result.prompts.length === 0) {
                console.error('Failed to build prompts from recipe')
                return
            }

            // Apply suggested settings from recipe
            if (activeRecipe.suggestedModel) {
                updateSettings({ model: activeRecipe.suggestedModel as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-fast' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' })
            }
            if (activeRecipe.suggestedAspectRatio) {
                updateSettings({ aspectRatio: activeRecipe.suggestedAspectRatio })
            }

            // Combine user refs + recipe refs (deduplicated)
            const userRefs = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))
            const allRefs = [...new Set([...userRefs, ...result.referenceImages])]

            // Debug: Log recipe stages to verify type field is present
            console.log('[PromptActions] Active recipe stages:', activeRecipe.stages.map(s => ({
                id: s.id,
                type: s.type,
                toolId: s.toolId,
                order: s.order
            })))

            // Check if recipe has tool stages - use full recipe execution service
            const hasTool = hasToolStages(activeRecipe)
            console.log('[PromptActions] hasToolStages result:', hasTool)

            if (hasTool) {
                console.log('[PromptActions] Recipe has tool stages, using executeRecipe service')

                // Build stage reference images array
                // First stage uses user refs + recipe's first stage refs
                // Subsequent stages use their own refs (tool outputs are handled by the service)
                const stageReferenceImages: string[][] = result.stageReferenceImages || []

                // Ensure first stage has user refs
                if (stageReferenceImages.length === 0) {
                    stageReferenceImages.push(allRefs)
                } else {
                    // Combine user refs with first stage refs
                    stageReferenceImages[0] = [...new Set([...allRefs, ...stageReferenceImages[0]])]
                }

                const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-pro') as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-fast' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high'
                const aspectRatio = activeRecipe.suggestedAspectRatio || shotCreatorSettings.aspectRatio || '16:9'

                try {
                    toast.info('Starting recipe with tool stages...')

                    const executionResult = await executeRecipe({
                        recipe: activeRecipe,
                        fieldValues: activeFieldValues,
                        stageReferenceImages,
                        model,
                        aspectRatio,
                        onProgress: (stage, total, status) => {
                            console.log(`[PromptActions] Stage ${stage + 1}/${total}: ${status}`)
                            toast.info(`Stage ${stage + 1}/${total}: ${status}`)
                        }
                    })

                    if (executionResult.success) {
                        toast.success('Recipe completed successfully!')
                        console.log('[PromptActions] Recipe execution complete:', executionResult.imageUrls)
                    } else {
                        toast.error(`Recipe failed: ${executionResult.error}`)
                        console.error('[PromptActions] Recipe execution failed:', executionResult.error)
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                    toast.error(`Recipe execution error: ${errorMsg}`)
                    console.error('[PromptActions] Recipe execution error:', error)
                }

                // Keep recipe selected for re-generation
                return
            }

            // No tool stages - use fast pipe-concatenation approach
            // Build full prompt (pipe-separated for multi-stage execution)
            const fullPrompt = result.prompts.join(' | ')

            // Set stage-specific reference images for pipe chaining
            if (result.stageReferenceImages && result.stageReferenceImages.length > 0) {
                setStageReferenceImages(result.stageReferenceImages)
            } else {
                setStageReferenceImages([])
            }

            // Build model settings
            const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana') as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-fast' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high'
            const modelSettings = buildModelSettings()

            // Generate with recipe data
            await generateImage(
                model,
                fullPrompt,
                allRefs,
                modelSettings,
                { recipeId: activeRecipe.id, recipeName: activeRecipe.name }
            )

            // Keep recipe selected for re-generation (don't close form)
            return
        }

        // Regular mode: use prompt and refs as-is
        const model = shotCreatorSettings.model || 'nano-banana'
        const referenceUrls = shotCreatorReferenceImages
            .map(ref => ref.url || ref.preview)
            .filter((url): url is string => Boolean(url))
        const modelSettings = buildModelSettings()

        await generateImage(
            model,
            shotCreatorPrompt,
            referenceUrls,
            modelSettings,
            lastUsedRecipe || undefined
        )

        // Clear recipe tracking after generation
        setLastUsedRecipe(null)
    }, [canGenerate, isGenerating, shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings, generateImage, buildModelSettings, lastUsedRecipe, getActiveRecipe, getActiveValidation, buildActivePrompts, updateSettings, setStageReferenceImages, activeFieldValues])

    // Handle selecting a recipe
    const _handleSelectRecipe = useCallback((recipeId: string) => {
        setActiveRecipe(recipeId)
    }, [setActiveRecipe])

    // Calculate dropdown position based on cursor
    const calculateDropdownPosition = useCallback(() => {
        if (!textareaRef.current) return

        const textarea = textareaRef.current
        const rect = textarea.getBoundingClientRect()

        // Check if mobile (viewport width < 768px)
        const isMobile = window.innerWidth < 768

        if (isMobile) {
            // Position above textarea on mobile to avoid keyboard
            // Use viewport coordinates directly (fixed positioning)
            setDropdownPosition({
                top: Math.max(rect.top - 310, 10), // 300px height + 10px margin, min 10px from top
                left: Math.max(rect.left, 10) // Min 10px from left edge
            })
        } else {
            // Desktop: position below textarea
            // Use viewport coordinates directly (fixed positioning)
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left
            })
        }
    }, [textareaRef])

    // Handle @ symbol for reference support
    const handlePromptChange = useCallback(async (value: string) => {
        setShotCreatorPrompt(value);

        // Trigger autocomplete
        if (textareaRef.current) {
            const cursorPosition = textareaRef.current.selectionStart
            handleAutocompleteTextChange(value, cursorPosition)
        }

        // Extract @ references for auto-attaching images
        const references = extractAtTags(value);
        if (references.length === 0) {
            return;
        }

        // Get all images from the gallery
        const allImages = useUnifiedGalleryStore.getState().images;
        // Create a Set to track which references we've already processed
        const processedRefs = new Set();

        // Process references one by one
        for (const ref of references) {
            const cleanRef = ref.startsWith('@') ? ref.substring(1) : ref;

            // Skip if we've already processed this reference
            if (processedRefs.has(cleanRef.toLowerCase())) {
                continue;
            }

            processedRefs.add(cleanRef.toLowerCase());

            const matchingImage = allImages.find(img => {
                if (!img.reference) return false;

                const imgRef = img.reference.toLowerCase();
                const isMatch = imgRef === `@${cleanRef.toLowerCase()}`;
                const isNotAdded = !shotCreatorReferenceImages.some(refImg => refImg.url === img.url);

                return isMatch && isNotAdded;
            });

            if (matchingImage) {
                try {
                    const file = await urlToFile(matchingImage.url, `reference-${cleanRef}.jpg`);
                    const newReference: ShotCreatorReferenceImage = {
                        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        url: matchingImage.url,
                        preview: matchingImage.url,
                        file: file,
                        tags: [matchingImage.reference || `@${cleanRef}`],
                        detectedAspectRatio: matchingImage.settings?.aspectRatio || '16:9'
                    };
                    setShotCreatorReferenceImages((prev: ShotCreatorReferenceImage[]): ShotCreatorReferenceImage[] => {
                        // Check if this URL is already in the references
                        const exists = prev.some((ref: ShotCreatorReferenceImage) => ref.url === newReference.url);
                        if (exists) {
                            return prev;
                        }
                        return [...prev, newReference];
                    });
                } catch (error) {
                    console.error('Error creating file from URL:', error);
                }
            }
        }
    }, [setShotCreatorPrompt, setShotCreatorReferenceImages, shotCreatorReferenceImages, textareaRef, handleAutocompleteTextChange]);

    return (
        <Fragment>
            <div className="flex flex-col gap-3 px-4 sm:px-6 lg:px-8">
                {/* Textarea section */}
                <div className="space-y-2">
                    <label htmlFor="prompt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Prompt
                    </label>
                    <div className="relative">
                        <Textarea
                            id="prompt"
                            ref={textareaRef}
                            value={shotCreatorPrompt}
                            onChange={(e) => handlePromptChange(e.target.value)}
                            onKeyUp={handleTextareaKeyUp}
                            onKeyDown={handleAutocompleteKeyDown}
                            onMouseUp={calculateDropdownPosition}
                            onTouchEnd={calculateDropdownPosition}
                            placeholder="Enter your prompt here... Use @tag for references"
                            className={cn("resize-none", getTextareaHeight(textareaSize))}
                        />

                        {/* Autocomplete dropdown */}
                        {showAutocomplete && hasSuggestions && (
                            <div
                                ref={autocompleteRef}
                                className="absolute z-50 w-full max-h-[300px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-y-auto"
                                style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`,
                                    maxWidth: textareaRef.current ? `${textareaRef.current.offsetWidth}px` : 'auto'
                                }}
                            >
                                {Object.entries(autocompleteSuggestions).map(([category, suggestions]) => {
                                    if (suggestions.length === 0) return null
                                    const categoryIndex = Object.keys(autocompleteSuggestions).indexOf(category)
                                    const startIndex = Object.keys(autocompleteSuggestions)
                                        .slice(0, categoryIndex)
                                        .reduce((sum, cat) => sum + autocompleteSuggestions[cat as Category].length, 0)

                                    return (
                                        <div key={category}>
                                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">
                                                {category}
                                            </div>
                                            {suggestions.map((suggestion, idx) => {
                                                const globalIndex = startIndex + idx
                                                const isSelected = globalIndex === autocompleteSelectedIndex
                                                return (
                                                    <button
                                                        key={`${category}-${suggestion}`}
                                                        onClick={() => selectAutocompleteSuggestion(suggestion)}
                                                        className={cn(
                                                            'w-full text-left px-3 py-2 text-sm transition-colors',
                                                            isSelected
                                                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        )}
                                                    >
                                                        {suggestion}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Generation cost and info */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                            Cost: {generationCost.imageCount} image{generationCost.imageCount !== 1 ? 's' : ''} × ${generationCost.costPerImage} = ${generationCost.totalCost.toFixed(2)} ({generationCost.tokenCost} tokens)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTextareaSize('small')}
                                className={textareaSize === 'small' ? 'bg-slate-100 dark:bg-slate-700' : ''}
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTextareaSize('medium')}
                                className={textareaSize === 'medium' ? 'bg-slate-100 dark:bg-slate-700' : ''}
                            >
                                <Square className="w-4 h-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setTextareaSize('large')}
                                className={textareaSize === 'large' ? 'bg-slate-100 dark:bg-slate-700' : ''}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Organize and QuickAccessBar */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <OrganizeButton
                            prompt={shotCreatorPrompt}
                            onApply={setShotCreatorPrompt}
                        />
                        <QuickAccessBar onSelectRecipe={_handleSelectRecipe} />
                    </div>
                </div>

                {/* Recipe section */}
                {activeRecipeId && (
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                {getActiveRecipe()?.name || 'Recipe'}
                            </h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActiveRecipe(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <RecipeFormFields />
                    </div>
                )}

                {/* Mobile prompts recipes bar */}
                <MobilePromptsRecipesBar
                    onSelectPrompt={(prompt) => setShotCreatorPrompt(shotCreatorPrompt + (shotCreatorPrompt ? ' ' : '') + prompt)}
                    onSelectRecipe={(recipeId) => setActiveRecipe(recipeId)}
                />

                {/* Generate button */}
                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="w-full gap-2"
                    size="lg"
                >
                    {isGenerating ? (
                        <>
                            <LoadingSpinner />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Generate
                        </>
                    )}
                </Button>

                {/* Cancel button */}
                {isGenerating && (
                    <Button
                        onClick={cancelGeneration}
                        variant="outline"
                        className="w-full gap-2"
                        size="lg"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </Button>
                )}

                {/* Prompt syntax feedback */}
                <PromptSyntaxFeedback prompt={shotCreatorPrompt} />

                {/* Help tooltip */}
                <TooltipProvider>
                    <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 cursor-help w-fit">
                                <HelpCircle className="w-3.5 h-3.5" />
                                <span>Prompt tips</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                                <p className="font-medium mb-1.5">Prompt Syntax:</p>
                                <ul className="space-y-1">
                                    <li>• Use @tag references to automatically attach images</li>
                                    <li>• Use pipe (|) syntax for multi-stage generation</li>
                                    <li>• Use {'{'}x,y{'}}'} for variation syntax</li>
                                    <li>• Use * for wildcard expansion</li>
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </Fragment>
    )
}

export { PromptActions }
export default PromptActions