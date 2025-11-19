import React, { Fragment, useState, useEffect } from "react"
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion'
import {
    Sparkles,
    HelpCircle,
    BookOpen,
    X
} from 'lucide-react'
import { useShotCreatorStore } from "@/features/shot-creator/store/shot-creator.store"
import { useShotCreatorSettings } from "../../hooks"
import { useImageGeneration } from "../../hooks/useImageGeneration"
import { PromptSyntaxFeedback } from "./PromptSyntaxFeedback"
import { PromptLibrary } from "./PromptLibrary"
import { PromptAutocomplete } from "../prompt-autocomplete"
import { usePromptAutocomplete } from "../../hooks/usePromptAutocomplete"
import type { AutocompleteOption } from "../../types/autocomplete.types"
import { useCallback } from "react"
import { extractAtTags, urlToFile } from "../../helpers"
import { ShotCreatorReferenceImage } from "../../types"
import { useUnifiedGalleryStore } from "../../store/unified-gallery-store"

const PromptActions = ({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) => {
    const {
        shotCreatorPrompt,
        shotCreatorProcessing,
        shotCreatorReferenceImages,
        setShotCreatorPrompt,
        setShotCreatorReferenceImages,
    } = useShotCreatorStore()
    const { settings: shotCreatorSettings } = useShotCreatorSettings()
    const { generateImage, isGenerating } = useImageGeneration()

    // Autocomplete for @references - destructure to avoid circular dependencies
    const autocomplete = usePromptAutocomplete()
    const {
        isOpen: autocompleteIsOpen,
        items: autocompleteItems,
        selectedIndex: autocompleteSelectedIndex,
        selectedItem: autocompleteSelectedItem,
        handleTextChange: handleAutocompleteTextChange,
        insertItem: insertAutocompleteItem,
        close: closeAutocomplete,
        selectNext: selectNextAutocomplete,
        selectPrevious: selectPreviousAutocomplete,
        selectIndex: selectAutocompleteIndex
    } = autocomplete
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

    const isEditingMode = shotCreatorSettings.model === 'qwen-image-edit'
    const canGenerate = isEditingMode
        ? shotCreatorPrompt.length > 0 && shotCreatorReferenceImages.length > 0
        : shotCreatorPrompt.length > 0 && shotCreatorReferenceImages.length > 0

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
            case 'seedream-4':
                baseSettings.size = shotCreatorSettings.resolution
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                if (shotCreatorSettings.resolution === 'custom') {
                    baseSettings.width = shotCreatorSettings.customWidth
                    baseSettings.height = shotCreatorSettings.customHeight
                }
                baseSettings.sequentialImageGeneration = shotCreatorSettings.sequentialGeneration ? 'auto' : 'disabled'
                baseSettings.maxImages = shotCreatorSettings.maxImages || 1
                break
            case 'gen4-image':
            case 'gen4-image-turbo':
                baseSettings.aspectRatio = shotCreatorSettings.gen4AspectRatio || shotCreatorSettings.aspectRatio
                baseSettings.resolution = shotCreatorSettings.resolution
                if (shotCreatorSettings.seed !== undefined) {
                    baseSettings.seed = shotCreatorSettings.seed
                }
                break
            case 'qwen-image':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                if (shotCreatorSettings.seed !== undefined) baseSettings.seed = shotCreatorSettings.seed
                if (shotCreatorSettings.guidance !== undefined) baseSettings.guidance = shotCreatorSettings.guidance
                if (shotCreatorSettings.num_inference_steps !== undefined) {
                    baseSettings.numInferenceSteps = shotCreatorSettings.num_inference_steps
                }
                if (shotCreatorSettings.goFast !== undefined) baseSettings.goFast = shotCreatorSettings.goFast

                // For Qwen Image, use first reference image as img2img input if available
                if (shotCreatorReferenceImages.length > 0) {
                    const img2imgImage = shotCreatorReferenceImages[0]?.url || shotCreatorReferenceImages[0]?.preview
                    if (img2imgImage) {
                        baseSettings.image = img2imgImage
                        // Set strength for img2img (optional, defaults to moderate modification)
                        if (shotCreatorSettings.strength !== undefined) {
                            baseSettings.strength = shotCreatorSettings.strength
                        }
                    }
                }
                break
            case 'qwen-image-edit':
                // For editing mode, first reference image is the image to edit
                const editImage = shotCreatorReferenceImages[0]?.url || shotCreatorReferenceImages[0]?.preview
                baseSettings.image = editImage
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                if (shotCreatorSettings.seed !== undefined) baseSettings.seed = shotCreatorSettings.seed
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'webp'
                baseSettings.outputQuality = shotCreatorSettings.outputQuality || 95
                baseSettings.goFast = shotCreatorSettings.goFast !== undefined ? shotCreatorSettings.goFast : true
                break
        }

        console.log('✅ Built model settings:', JSON.stringify(baseSettings, null, 2))
        return baseSettings
    }, [shotCreatorSettings, shotCreatorReferenceImages])

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

            // For Qwen Image, don't pass reference images since we use img2img via modelSettings
            const finalReferenceUrls = model === 'qwen-image' ? [] : referenceUrls

            // Call the generation API
            await generateImage(
                model,
                shotCreatorPrompt,
                finalReferenceUrls,
                modelSettings
            )
        }
    }, [canGenerate, isGenerating, shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings, generateImage, buildModelSettings])

    // Handle selecting prompt from library
    const handleSelectPrompt = useCallback((prompt: string) => {
        setShotCreatorPrompt(prompt)
        // setIsPromptLibraryOpen(false)
    }, [setShotCreatorPrompt])

    // Calculate dropdown position based on cursor
    const calculateDropdownPosition = useCallback(() => {
        if (!textareaRef.current) return

        const textarea = textareaRef.current
        const rect = textarea.getBoundingClientRect()

        // Check if mobile (viewport width < 768px)
        const isMobile = window.innerWidth < 768

        if (isMobile) {
            // Position above textarea on mobile to avoid keyboard
            setDropdownPosition({
                top: Math.max(rect.top + window.scrollY - 310, 10), // 300px height + 10px margin, min 10px from top
                left: rect.left + window.scrollX
            })
        } else {
            // Desktop: position below textarea
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX
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
    const handleAutocompleteSelect = useCallback((item: AutocompleteOption | null) => {
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

        // Set cursor position after state update
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = newCursorPosition
                textareaRef.current.selectionEnd = newCursorPosition
                textareaRef.current.focus()
            }
        }, 0)
    }, [insertAutocompleteItem, closeAutocomplete, shotCreatorPrompt, setShotCreatorPrompt, textareaRef]);

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

    return (
        <Fragment>
            <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Label className="text-sm text-slate-300">
                        {isEditingMode ? 'Edit Instructions' : 'Prompt'}
                    </Label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                            @ refs
                        </Badge>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                            Ctrl+Enter
                        </Badge>
                        <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline-flex">
                            {shotCreatorPrompt.length}/1000
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
                        placeholder={
                            isEditingMode
                                ? "Describe how you want to edit the image (e.g., 'change the background to a sunset', 'add more lighting')"
                                : "Describe your shot... Use @ to reference tagged images"
                        }
                        className="min-h-[100px] bg-slate-800 border-slate-600 text-white placeholder:text-slate-400 resize-none pr-10"
                        maxLength={1000}
                        onKeyDown={(e) => {
                            // Handle autocomplete keyboard navigation
                            if (autocompleteIsOpen) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault()
                                    selectNextAutocomplete()
                                    return
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault()
                                    selectPreviousAutocomplete()
                                    return
                                }
                                if (e.key === 'Enter' && autocompleteSelectedItem) {
                                    e.preventDefault()
                                    handleAutocompleteSelect(autocompleteSelectedItem)
                                    return
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault()
                                    closeAutocomplete()
                                    return
                                }
                            }

                            // Ctrl+Enter or Cmd+Enter to generate
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canGenerate && !shotCreatorProcessing && !isGenerating) {
                                e.preventDefault()
                                void handleGenerate()
                            }
                        }}
                    />
                    {shotCreatorPrompt.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700"
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
                    <PromptSyntaxFeedback prompt={shotCreatorPrompt} model={shotCreatorSettings.model} />

                    {/* Help Tooltip */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <HelpCircle className="w-3 h-3" />
                        <span>Use [option1, option2] for variations, _wildcard_ for dynamic content, or | for chaining</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons - Moved to top for better UX */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {isEditingMode ? 'Edit Image' : 'Generate'}
                        </>
                    )}
                </Button>

            </div>

            {/* Accordion System for Help, Prompt Library, and Import/Export */}
            <Accordion type="single" collapsible className="w-full">
                {/* Help Section */}
                <AccordionItem value="help" className="border-slate-700">
                    <AccordionTrigger className="text-slate-300 hover:text-white">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Prompting Language Guide
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                        <div className="space-y-3 text-sm text-slate-300">
                            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                <div className="font-medium text-blue-400">🎯 Bracket Variations</div>
                                <div className="text-xs text-slate-400">Generate multiple images with one prompt</div>
                                <code className="block bg-slate-900 p-2 rounded text-xs text-green-400">
                                    A cat in [a garden, a car, space] looking happy
                                </code>
                                <div className="text-xs">→ Creates 3 images with different locations</div>
                            </div>

                            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                <div className="font-medium text-purple-400">✨ Wild Cards</div>
                                <div className="text-xs text-slate-400">Use dynamic placeholders for creative variations</div>
                                <code className="block bg-slate-900 p-2 rounded text-xs text-green-400">
                                    _character_ holding _object_ in _location_
                                </code>
                                <div className="text-xs">→ Randomly selects from your wild card libraries</div>
                            </div>

                            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                <div className="font-medium text-orange-400">🔗 Chain Prompting</div>
                                <div className="text-xs text-slate-400">Build complex images step by step</div>
                                <code className="block bg-slate-900 p-2 rounded text-xs text-green-400">
                                    sunset landscape | add flying birds | dramatic lighting
                                </code>
                                <div className="text-xs">→ Each step refines the previous result</div>
                            </div>

                            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                <div className="font-medium text-cyan-400">@ References</div>
                                <div className="text-xs text-slate-400">Pull from Prompt Library categories</div>
                                <code className="block bg-slate-900 p-2 rounded text-xs text-green-400">
                                    @cinematic shot with @lighting and @mood
                                </code>
                                <div className="text-xs">→ Randomly selects prompts from each category</div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Prompt Library Section */}
                <AccordionItem value="library" className="border-slate-700">
                    <AccordionTrigger className="text-slate-300 hover:text-white">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Prompt Library
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="h-[400px] overflow-y-auto">
                            <PromptLibrary
                                onSelectPrompt={handleSelectPrompt}
                                showQuickAccess={true}
                                className="h-full"
                            />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Fragment>
    )
}

export default PromptActions