import React, { Fragment, useState, useRef, useCallback } from "react"
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { HighlightedPromptEditor } from '../prompt-editor/HighlightedPromptEditor'
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
    Maximize2
} from 'lucide-react'
import { useShotCreatorStore } from "@/features/shot-creator/store/shot-creator.store"
import { useCustomStylesStore } from "../../store/custom-styles.store"
import { useShotCreatorSettings } from "../../hooks"
import { PromptSyntaxFeedback } from "./PromptSyntaxFeedback"
import { useWildCardStore } from "../../store/wildcard.store"
import { RecipeFormFields } from "../recipe"
import { OrganizeButton } from "../prompt-organizer"
import { PromptExpanderButton } from "../prompt-expander/PromptExpanderButton"
import { DesktopPromptsRecipesBar } from "./DesktopPromptsRecipesBar"
import { usePromptAutocomplete } from "../../hooks/usePromptAutocomplete"
import { extractAtTags, urlToFile } from "../../helpers"
import { ShotCreatorReferenceImage } from "../../types"
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"
import { useLibraryStore } from "../../store/shot-library.store"
import { useRecipeStore } from "../../store/recipe.store"
import { cn } from "@/utils/utils"
import { Category } from "../CategorySelectDialog"
import { toast } from "sonner"
import { RiverflowOptionsPanel } from "../RiverflowOptionsPanel"
import { SlotMachinePanel } from "../slot-machine"
import { logger } from '@/lib/logger'
import { useTextareaResize } from "../../hooks/useTextareaResize"
import { usePromptGeneration } from "../../hooks/usePromptGeneration"

const PromptActions = ({ textareaRef, showResizeControls = true }: { textareaRef: React.RefObject<HTMLTextAreaElement | null>; showResizeControls?: boolean }) => {
    const {
        shotCreatorPrompt,
        shotCreatorReferenceImages,
        setShotCreatorPrompt,
        setShotCreatorReferenceImages,
    } = useShotCreatorStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { libraryItems } = useLibraryStore()
    const { wildcards: _wildcards } = useWildCardStore()
    const { activeRecipeId, setActiveRecipe, getActiveRecipe } = useRecipeStore()

    // ── Extracted hooks ────────────────────────────────────────────────
    const {
        customHeight,
        textareaSize,
        getTextareaHeight,
        handleResizeMouseDown,
        toggleSize,
    } = useTextareaResize()

    const {
        handleGenerate,
        canGenerate,
        generationCost,
        isGenerating,
        cancelGeneration,
        setRiverflowState,
    } = usePromptGeneration()

    // ── Autocomplete state ─────────────────────────────────────────────
    const [showAutocomplete, setShowAutocomplete] = useState(false)
    const [autocompleteSearch, setAutocompleteSearch] = useState('')
    const [autocompleteCursorPos, setAutocompleteCursorPos] = useState(0)
    const autocompleteRef = useRef<HTMLDivElement>(null)

    const autocomplete = usePromptAutocomplete()
    const {
        selectedIndex: autocompleteSelectedIndex,
        handleTextChange: handleAutocompleteTextChange,
        selectIndex: selectAutocompleteIndex
    } = autocomplete
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    // Handle selecting a recipe
    const _handleSelectRecipe = useCallback((recipeId: string) => {
        setActiveRecipe(recipeId)
    }, [setActiveRecipe])

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

    // Get thumbnail URL for a reference tag
    const getThumbnailForTag = useCallback((tag: string) => {
        const tagWithoutAt = tag.startsWith('@') ? tag.slice(1) : tag
        const item = libraryItems.find(item =>
            item.tags?.some(t => t.toLowerCase() === tagWithoutAt.toLowerCase())
        )
        return item?.preview || item?.imageData || null
    }, [libraryItems])

    // Filter autocomplete suggestions with category grouping
    const autocompleteSuggestions = React.useMemo(() => {
        const grouped = getReferencesGroupedByCategory()
        const searchWithAt = autocompleteSearch.startsWith('@')
            ? autocompleteSearch.toLowerCase()
            : '@' + autocompleteSearch.toLowerCase()

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

        const atIndex = beforeCursor.lastIndexOf('@')
        const before = shotCreatorPrompt.substring(0, atIndex)
        const newPrompt = before + suggestion + ' ' + afterCursor

        setShotCreatorPrompt(newPrompt)
        setShowAutocomplete(false)
        setAutocompleteSearch('')

        // Auto-add the reference image when selecting an @tag
        const tagWithoutAt = suggestion.startsWith('@') ? suggestion.slice(1) : suggestion
        const matchingItem = libraryItems.find(item =>
            item.tags?.some(tag => tag.toLowerCase() === tagWithoutAt.toLowerCase())
        )

        const imageUrl = matchingItem?.preview || matchingItem?.imageData
        if (matchingItem && imageUrl) {
            const isAlreadyAdded = shotCreatorReferenceImages.some(
                refImg => refImg.url === imageUrl
            )

            if (!isAlreadyAdded) {
                const newRef: ShotCreatorReferenceImage = {
                    id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    preview: imageUrl,
                    url: imageUrl,
                    tags: matchingItem.tags || [],
                    persistentTag: tagWithoutAt
                }
                setShotCreatorReferenceImages((prev: ShotCreatorReferenceImage[]) => [...prev, newRef])
                toast.success(`Added ${suggestion} as reference image`)
            }
        }

        setTimeout(() => {
            const newPos = atIndex + suggestion.length + 1
            textarea.focus()
            textarea.setSelectionRange(newPos, newPos)
        }, 0)
    }, [shotCreatorPrompt, autocompleteCursorPos, textareaRef, setShotCreatorPrompt, libraryItems, shotCreatorReferenceImages, setShotCreatorReferenceImages])

    // Detect @ symbol and show autocomplete
    const handleTextareaKeyUp = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const textarea = e.currentTarget
        const cursorPos = textarea.selectionStart
        const textBeforeCursor = shotCreatorPrompt.substring(0, cursorPos)

        const lastAtIndex = textBeforeCursor.lastIndexOf('@')

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex)
            if (textAfterAt.includes(' ')) {
                setShowAutocomplete(false)
                return
            }

            const search = textAfterAt.substring(1)
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

    // Calculate dropdown position based on cursor
    const calculateDropdownPosition = useCallback(() => {
        if (!textareaRef.current) return

        const textarea = textareaRef.current
        const rect = textarea.getBoundingClientRect()

        const isMobile = window.innerWidth < 768

        if (isMobile) {
            setDropdownPosition({
                top: Math.max(rect.top - 310, 10),
                left: Math.max(rect.left, 10)
            })
        } else {
            setDropdownPosition({
                top: rect.bottom + 4,
                left: rect.left
            })
        }
    }, [textareaRef])

    // Handle @ symbol for reference support
    const handlePromptChange = useCallback(async (value: string) => {
        setShotCreatorPrompt(value);

        if (textareaRef.current) {
            const cursorPosition = textareaRef.current.selectionStart
            handleAutocompleteTextChange(value, cursorPosition)
        }

        const references = extractAtTags(value);
        if (references.length === 0) {
            return;
        }

        const allImages = useUnifiedGalleryStore.getState().images;
        const processedRefs = new Set();

        for (const ref of references) {
            const cleanRef = ref.startsWith('@') ? ref.substring(1) : ref;

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
                        const exists = prev.some((ref: ShotCreatorReferenceImage) => ref.url === newReference.url);
                        if (exists) {
                            return prev;
                        }
                        return [...prev, newReference];
                    });
                } catch (error) {
                    logger.shotCreator.error('Error creating file from URL', { error: error instanceof Error ? error.message : String(error) })
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
                    <div
                        className="relative"
                        data-testid={showResizeControls ? "prompt-textarea-container" : undefined}
                        style={customHeight !== null ? { height: `${customHeight}px` } : undefined}
                    >
                        <HighlightedPromptEditor
                            id="prompt"
                            textareaRef={textareaRef}
                            value={shotCreatorPrompt}
                            onChange={(value) => handlePromptChange(value)}
                            onKeyUp={handleTextareaKeyUp}
                            onKeyDown={handleAutocompleteKeyDown}
                            onMouseUp={calculateDropdownPosition}
                            onTouchEnd={calculateDropdownPosition}
                            placeholder="Enter your prompt here... Use @tag for references"
                            className={cn("resize-none", customHeight !== null ? 'h-full' : getTextareaHeight(textareaSize))}
                        />

                        {/* Autocomplete dropdown */}
                        {showAutocomplete && hasSuggestions && (
                            <div
                                ref={autocompleteRef}
                                className="fixed z-50 max-h-[300px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-y-auto"
                                style={{
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`,
                                    width: textareaRef.current ? `${textareaRef.current.offsetWidth}px` : 'auto'
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
                                                const thumbnailUrl = getThumbnailForTag(suggestion)
                                                return (
                                                    <button
                                                        key={`${category}-${suggestion}`}
                                                        onClick={() => selectAutocompleteSuggestion(suggestion)}
                                                        className={cn(
                                                            'w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2',
                                                            isSelected
                                                                ? 'bg-blue-500 text-white dark:bg-blue-600'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                                        )}
                                                    >
                                                        {thumbnailUrl && (
                                                            <img
                                                                src={thumbnailUrl}
                                                                alt=""
                                                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                                                            />
                                                        )}
                                                        <span>{suggestion}</span>
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
                            Cost: {generationCost.imageCount} image{generationCost.imageCount !== 1 ? 's' : ''} × ${generationCost.costPerImage.toFixed(2)}
                            {generationCost.fontCost > 0 && ` + $${generationCost.fontCost.toFixed(2)} fonts`}
                            {' = $'}{generationCost.totalCost.toFixed(2)} ({generationCost.tokenCost} pts)
                        </span>
                        {showResizeControls && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleSize}
                                title="Toggle prompt size"
                            >
                                {textareaSize === 'small' && customHeight === null ? (
                                    <Maximize2 className="lucide-maximize-2 w-4 h-4" />
                                ) : (
                                    <Minimize2 className="lucide-minimize-2 w-4 h-4" />
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Drag resize handle */}
                    {showResizeControls && (
                        <div
                            data-testid="prompt-resize-handle"
                            onMouseDown={handleResizeMouseDown}
                            className="flex items-center justify-center h-3 cursor-ns-resize group hover:bg-slate-100 dark:hover:bg-slate-800 rounded-b transition-colors -mt-1"
                        >
                            <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500 transition-colors" />
                        </div>
                    )}
                </div>

                {/* Desktop Prompts/Recipes Bar (tabbed interface) */}
                <DesktopPromptsRecipesBar
                    onSelectPrompt={(prompt) => setShotCreatorPrompt(shotCreatorPrompt + (shotCreatorPrompt ? ' ' : '') + prompt)}
                    onSelectRecipe={_handleSelectRecipe}
                    currentPrompt={shotCreatorPrompt}
                />

                {/* Organize and Expand buttons */}
                <div className="flex items-center gap-2">
                    <OrganizeButton
                        prompt={shotCreatorPrompt}
                        onApply={setShotCreatorPrompt}
                    />
                    <PromptExpanderButton
                        prompt={shotCreatorPrompt}
                        onPromptChange={setShotCreatorPrompt}
                    />
                </div>

                {/* Slot Machine Panel - appears when {} detected */}
                <SlotMachinePanel
                    prompt={shotCreatorPrompt}
                    onApply={setShotCreatorPrompt}
                    disabled={isGenerating}
                />

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

                {/* Riverflow Options Panel - shown when Riverflow model is selected */}
                {shotCreatorSettings.model === 'riverflow-2-pro' && (
                    <RiverflowOptionsPanel
                        onChange={setRiverflowState}
                        referenceImageCount={shotCreatorReferenceImages.length}
                    />
                )}

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
                <PromptSyntaxFeedback
                    prompt={shotCreatorPrompt}
                    disablePipeSyntax={shotCreatorSettings.disablePipeSyntax}
                    disableBracketSyntax={shotCreatorSettings.disableBracketSyntax}
                    disableWildcardSyntax={shotCreatorSettings.disableWildcardSyntax}
                    disableSlotMachineSyntax={shotCreatorSettings.disableSlotMachineSyntax}
                    enableAnchorTransform={shotCreatorSettings.enableAnchorTransform}
                    referenceImageCount={shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)}
                    onTogglePipeSyntax={(disabled) => updateSettings({ disablePipeSyntax: disabled })}
                    onToggleBracketSyntax={(disabled) => updateSettings({ disableBracketSyntax: disabled })}
                    onToggleWildcardSyntax={(disabled) => updateSettings({ disableWildcardSyntax: disabled })}
                    onToggleSlotMachineSyntax={(disabled) => updateSettings({ disableSlotMachineSyntax: disabled })}
                    onToggleAnchorTransform={(enabled) => updateSettings({ enableAnchorTransform: enabled })}
                />

                {/* Anchor Transform feedback */}
                {shotCreatorSettings.enableAnchorTransform && (() => {
                    const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)
                    const hasStyle = !!shotCreatorSettings.selectedStyle

                    let anchorName = 'Image 1'
                    if (hasStyle) {
                        const selectedStyle = useCustomStylesStore.getState().getStyleById(shotCreatorSettings.selectedStyle!)
                        anchorName = selectedStyle?.name || 'Style Guide'
                    } else if (shotCreatorReferenceImages[0]?.file?.name) {
                        anchorName = shotCreatorReferenceImages[0].file.name
                    }

                    const transformCount = totalImages - 1

                    return (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg text-sm">
                            <span className="text-orange-600 dark:text-orange-400">
                                {totalImages < 2 ? (
                                    '⚠️ Anchor requires at least 2 images (1 anchor + 1+ inputs)'
                                ) : (
                                    `¡ ${anchorName} will anchor ${transformCount} image${transformCount > 1 ? 's' : ''}`
                                )}
                            </span>
                        </div>
                    )
                })()}

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
                                    <li>• Use @! for Anchor Transform (first image transforms others)</li>
                                    <li>• Use pipe (|) syntax for multi-stage generation</li>
                                    <li>• Use [option1, option2] for variations</li>
                                    <li>• Use _wildcard_ for random selection from lists</li>
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
