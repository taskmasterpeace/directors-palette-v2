import React, { Fragment, useState, useEffect, useRef } from "react"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { PromptAutocomplete } from "../prompt-autocomplete"
import { OrganizeButton } from "../prompt-organizer"
import { MobilePromptsRecipesBar } from "./MobilePromptsRecipesBar"
import { usePromptAutocomplete } from "../../hooks/usePromptAutocomplete"
import type { AutocompleteOption } from "../../types/autocomplete.types"
import { useCallback } from "react"
import { extractAtTags, urlToFile } from "../../helpers"
import { ShotCreatorReferenceImage } from "../../types"
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"
import { useLibraryStore } from "../../store/shot-library.store"
import { useRecipeStore } from "../../store/recipe.store"
import { cn } from "@/utils/utils"
import { Category } from "../CategorySelectDialog"

const PromptActions = ({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) => {
    const {
        shotCreatorPrompt,
        shotCreatorProcessing,
        shotCreatorReferenceImages,
        setShotCreatorPrompt,
        setShotCreatorReferenceImages,
    } = useShotCreatorStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { generateImage, isGenerating } = useImageGeneration()
    const { libraryItems } = useLibraryStore()
    const { wildcards } = useWildCardStore()
    const { activeRecipeId, setActiveRecipe, getActiveRecipe } = useRecipeStore()

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
        isOpen: autocompleteIsOpen,
        items: autocompleteItems,
        selectedIndex: autocompleteSelectedIndex,
        selectedItem: _autocompleteSelectedItem,
        handleTextChange: handleAutocompleteTextChange,
        insertItem: insertAutocompleteItem,
        close: closeAutocomplete,
        selectNext: _selectNextAutocomplete,
        selectPrevious: _selectPreviousAutocomplete,
        selectIndex: selectAutocompleteIndex
    } = autocomplete
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    const canGenerate = shotCreatorPrompt.length > 0 && shotCreatorReferenceImages.length > 0

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
    }, [shotCreatorPrompt])

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

    // Handle generation
    const handleGenerate = useCallback(async () => {
        if (canGenerate && !isGenerating) {
            const model = shotCreatorSettings.model || 'nano-banana'

            // Extract reference image URLs
            const referenceUrls = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))

            // Build model-specific settings
            const modelSettings = buildModelSettings()

            // Call the generation API with recipe info if available
            await generateImage(
                model,
                shotCreatorPrompt,
                referenceUrls,
                modelSettings,
                lastUsedRecipe || undefined
            )

            // Clear recipe tracking after generation
            setLastUsedRecipe(null)
        }
    }, [canGenerate, isGenerating, shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings, generateImage, buildModelSettings, lastUsedRecipe])

    // Handle selecting a recipe
    const handleSelectRecipe = useCallback((recipeId: string) => {
        setActiveRecipe(recipeId)
    }, [setActiveRecipe])

    // Handle applying a recipe's generated prompts
    // For multi-stage recipes, we use the first stage prompt for now
    // Full pipe execution will be handled in the image generation service
    const handleApplyRecipePrompt = useCallback((prompts: string[], recipeReferenceImages: string[]) => {
        // Get the active recipe info before closing
        const recipe = getActiveRecipe()
        if (recipe) {
            setLastUsedRecipe({ recipeId: recipe.id, recipeName: recipe.name })

            // Apply suggested model if recipe specifies one
            if (recipe.suggestedModel) {
                // Cast to ModelId type - recipe should use valid model IDs
                updateSettings({ model: recipe.suggestedModel as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-fast' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' })
            }

            // Apply suggested aspect ratio if recipe specifies one
            if (recipe.suggestedAspectRatio) {
                updateSettings({ aspectRatio: recipe.suggestedAspectRatio })
            }
        }

        // Use first stage prompt for the main prompt field
        if (prompts.length > 0) {
            setShotCreatorPrompt(prompts[0])
        }

        // Add recipe reference images (deduplicated with existing ones)
        if (recipeReferenceImages.length > 0) {
            setShotCreatorReferenceImages((prev: ShotCreatorReferenceImage[]) => {
                const newRefs: ShotCreatorReferenceImage[] = recipeReferenceImages
                    .filter(url => !prev.some(ref => ref.url === url))
                    .map((url, idx) => ({
                        id: `recipe_ref_${Date.now()}_${idx}`,
                        url,
                        preview: url, // Use URL as preview
                        tags: [], // Empty tags by default
                        detectedAspectRatio: '1:1' // Default, could be improved
                    }))
                return [...prev, ...newRefs]
            })
        }

        setActiveRecipe(null)
    }, [setShotCreatorPrompt, setActiveRecipe, getActiveRecipe, updateSettings, setShotCreatorReferenceImages])

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

    // Handle autocomplete selection
    const handleAutocompleteSelect = useCallback(async (item: AutocompleteOption | null) => {
        if (!item || !textareaRef.current) return

        const textarea = textareaRef.current
        const cursorPosition = textarea.selectionStart
        const currentText = shotCreatorPrompt

        // Insert the selected item
        const { newText, newCursorPosition } = insertAutocompleteItem(item, currentText, cursorPosition)

        // Update prompt
        setShotCreatorPrompt(newText)

        // Close autocomplete
        closeAutocomplete()

        // IMPORTANT: Manually trigger auto-attach logic since setShotCreatorPrompt doesn't trigger onChange
        await handlePromptChange(newText)

        // Set cursor position after state update
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = newCursorPosition
                textareaRef.current.selectionEnd = newCursorPosition
                textareaRef.current.focus()
            }
        }, 0)
    }, [insertAutocompleteItem, closeAutocomplete, shotCreatorPrompt, setShotCreatorPrompt, textareaRef, handlePromptChange]);

    // Calculate dropdown position when autocomplete opens
    useEffect(() => {
        if (autocompleteIsOpen) {
            calculateDropdownPosition()
        }
    }, [autocompleteIsOpen, calculateDropdownPosition])

    // Recalculate position on window resize (for mobile rotation, etc.)
    useEffect(() => {
        if (!autocompleteIsOpen) return

        const handleResize = () => {
            calculateDropdownPosition()
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('scroll', handleResize, true)

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('scroll', handleResize, true)
        }
    }, [autocompleteIsOpen, calculateDropdownPosition]);

    // Handle mobile prompt selection (with optional overwrite confirmation)
    const handleMobilePromptSelect = useCallback((promptText: string) => {
        // If there's existing text, just overwrite (could add confirmation later)
        setShotCreatorPrompt(promptText)
        textareaRef.current?.focus()
    }, [setShotCreatorPrompt, textareaRef])

    return (
        <Fragment>
            {/* Recipe Form Fields - Shows when a recipe is active */}
            {activeRecipeId && (
                <RecipeFormFields
                    onApplyPrompt={handleApplyRecipePrompt}
                    className="mb-3"
                />
            )}

            {/* Mobile: Prompts & Recipes Toggle Bar */}
            <MobilePromptsRecipesBar
                onSelectPrompt={handleMobilePromptSelect}
                onSelectRecipe={handleSelectRecipe}
                className="mb-2"
            />

            <div className="space-y-2">
                {/* Desktop: Combined row: Recipes on left, controls on right */}
                <div className="hidden lg:flex items-center justify-between gap-2">
                    {/* Left: Recipe quick access */}
                    <QuickAccessBar
                        onSelectRecipe={handleSelectRecipe}
                        className="flex-shrink-0"
                    />

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* Size toggle buttons */}
                        <div className="flex items-center gap-1 bg-card/50 rounded p-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTextareaSize('small')}
                                className={cn(
                                    "h-7 w-7 p-0 hover:bg-secondary",
                                    textareaSize === 'small' ? "bg-secondary text-white" : "text-muted-foreground"
                                )}
                                title="Small (1 line)"
                            >
                                <Minimize2 className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTextareaSize('medium')}
                                className={cn(
                                    "h-7 w-7 p-0 hover:bg-secondary",
                                    textareaSize === 'medium' ? "bg-secondary text-white" : "text-muted-foreground"
                                )}
                                title="Medium (2 lines)"
                            >
                                <Square className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setTextareaSize('large')}
                                className={cn(
                                    "h-7 w-7 p-0 hover:bg-secondary",
                                    textareaSize === 'large' ? "bg-secondary text-white" : "text-muted-foreground"
                                )}
                                title="Large (5+ lines)"
                            >
                                <Maximize2 className="w-3 h-3" />
                            </Button>
                        </div>
                        <OrganizeButton
                            prompt={shotCreatorPrompt}
                            onApply={setShotCreatorPrompt}
                        />
                        <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                            @ refs
                        </Badge>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                            Ctrl+Enter
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {shotCreatorPrompt.length} chars
                        </span>
                    </div>
                </div>
                <div className="relative">
                    <Textarea
                        ref={textareaRef}
                        value={shotCreatorPrompt}
                        onChange={async (e) => {
                            await handlePromptChange(e.target.value);
                        }}
                        onKeyUp={handleTextareaKeyUp}
                        placeholder="Describe your shot... Use @ to reference images"
                        className={cn(
                            getTextareaHeight(textareaSize),
                            "bg-card border-border text-white placeholder:text-muted-foreground pr-10",
                            "resize-y sm:resize-y resize-none sm:resize-y" // Allow resize on desktop, disable on mobile
                        )}
                        onKeyDown={(e) => {
                            // Handle autocomplete navigation first
                            handleAutocompleteKeyDown(e)

                            // Ctrl+Enter or Cmd+Enter to generate
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate && !shotCreatorProcessing && !isGenerating) {
                                e.preventDefault()
                                void handleGenerate()
                            }
                        }}
                    />

                    {/* Autocomplete Dropdown with Category Groups */}
                    {showAutocomplete && hasSuggestions && (
                        <div
                            ref={autocompleteRef}
                            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-80 overflow-auto touch-pan-y"
                        >
                            {(['people', 'places', 'props', 'unorganized'] as Category[]).map((category) => {
                                const categoryRefs = autocompleteSuggestions[category]
                                if (categoryRefs.length === 0) return null

                                return (
                                    <div key={category}>
                                        {/* Category Header */}
                                        <div className="sticky top-0 bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
                                            {category}
                                        </div>
                                        {/* Category Items */}
                                        {categoryRefs.map((suggestion) => {
                                            const globalIndex = flatSuggestions.indexOf(suggestion)
                                            return (
                                                <div
                                                    key={suggestion}
                                                    className={cn(
                                                        "px-4 min-h-[48px] flex items-center cursor-pointer transition-colors touch-manipulation active:scale-95",
                                                        globalIndex === autocompleteSelectedIndex
                                                            ? "bg-primary text-white"
                                                            : "hover:bg-secondary active:bg-muted text-foreground"
                                                    )}
                                                    onClick={() => selectAutocompleteSuggestion(suggestion)}
                                                    onTouchStart={() => selectAutocompleteIndex(globalIndex)}
                                                >
                                                    <span className="text-base">{suggestion}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {shotCreatorPrompt.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-white hover:bg-secondary"
                            onClick={() => {
                                setShotCreatorPrompt('')
                                textareaRef.current?.focus()
                            }}
                            title="Clear prompt"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}

                    {/* Autocomplete dropdown */}
                    {autocompleteIsOpen && (
                        <PromptAutocomplete
                            items={autocompleteItems}
                            selectedIndex={autocompleteSelectedIndex}
                            onSelect={handleAutocompleteSelect}
                            onSelectIndex={selectAutocompleteIndex}
                            position={dropdownPosition}
                        />
                    )}
                </div>

                {/* Prompt Syntax Feedback - Shows bracket/wildcard notifications */}
                <div className="space-y-2">
                    <PromptSyntaxFeedback
                        prompt={shotCreatorPrompt}
                        model={shotCreatorSettings.model}
                        disablePipeSyntax={shotCreatorSettings.disablePipeSyntax}
                        disableBracketSyntax={shotCreatorSettings.disableBracketSyntax}
                        disableWildcardSyntax={shotCreatorSettings.disableWildcardSyntax}
                        onTogglePipeSyntax={(disabled) => updateSettings({ disablePipeSyntax: disabled })}
                        onToggleBracketSyntax={(disabled) => updateSettings({ disableBracketSyntax: disabled })}
                        onToggleWildcardSyntax={(disabled) => updateSettings({ disableWildcardSyntax: disabled })}
                    />

                    {/* Help Tooltip */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HelpCircle className="w-3 h-3" />
                        <span>Use [option1, option2] for variations, _wildcard_ for dynamic content, or | for chaining</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons - Moved to top for better UX */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Generate Button with Cost Preview */}
                <div className="flex-1 flex flex-col gap-1">
                    <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || isGenerating}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50"
                        aria-label={
                            isGenerating
                                ? "Generating image, please wait"
                                : `Generate ${generationCost.imageCount} image${generationCost.imageCount > 1 ? 's' : ''} for ${generationCost.tokenCost} points`
                        }
                        aria-busy={isGenerating}
                        title={
                            isGenerating
                                ? 'Generation in progress...'
                                : !shotCreatorPrompt.length
                                    ? 'Enter a prompt first'
                                    : shotCreatorReferenceImages.length === 0
                                        ? 'Add at least one reference image'
                                        : `Generate ${generationCost.imageCount} image${generationCost.imageCount > 1 ? 's' : ''} (${generationCost.tokenCost} pts)`
                        }
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate
                                {generationCost.imageCount > 1 && (
                                    <span className="ml-1">({generationCost.imageCount})</span>
                                )}
                            </>
                        )}
                    </Button>
                    {/* Cost Preview */}
                    {canGenerate && !isGenerating && (
                        <div className="text-xs text-center text-muted-foreground">
                            {generationCost.imageCount > 1 ? (
                                <span>
                                    {generationCost.imageCount} images × {generationCost.tokenCost / generationCost.imageCount} pts = <span className="text-amber-400 font-medium">{generationCost.tokenCost} pts</span>
                                </span>
                            ) : (
                                <span>
                                    Cost: <span className="text-amber-400 font-medium">{generationCost.tokenCost} pts</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>

            </div>

            </Fragment>
    )
}

export default PromptActions