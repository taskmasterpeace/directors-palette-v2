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
import { useCustomStylesStore } from "../../store/custom-styles.store"
import { getModelConfig, getModelCost } from "@/config"
import { useShotCreatorSettings } from "../../hooks"
import { useImageGeneration } from "../../hooks/useImageGeneration"
import { PromptSyntaxFeedback } from "./PromptSyntaxFeedback"
import { parseDynamicPrompt, detectAnchorTransform, stripAnchorSyntax } from "../../helpers/prompt-syntax-feedback"
import { useWildCardStore } from "../../store/wildcard.store"
import { QuickAccessBar, RecipeFormFields } from "../recipe"
import { OrganizeButton } from "../prompt-organizer"
import { PromptExpanderButton } from "../prompt-expander/PromptExpanderButton"
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
import { RiverflowOptionsPanel, type RiverflowState } from "../RiverflowOptionsPanel"
import { SlotMachinePanel } from "../slot-machine"

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

    // Riverflow state (tracked locally, passed to generation)
    // Must be declared before useMemo that depends on it
    const [riverflowState, setRiverflowState] = useState<RiverflowState | null>(null)

    // Calculate generation cost
    const generationCost = React.useMemo(() => {
        const model = shotCreatorSettings.model || 'nano-banana'
        const modelConfig = getModelConfig(model)

        // For Riverflow, use resolution-based pricing
        let costPerImage = modelConfig.costPerImage
        if (model === 'riverflow-2-pro' && riverflowState) {
            costPerImage = getModelCost('riverflow-2-pro', riverflowState.resolution)
        }

        // Check for anchor transform mode (toggle button)
        const isAnchorMode = shotCreatorSettings.enableAnchorTransform

        let imageCount: number

        if (isAnchorMode) {
            // Calculate based on inputs (total - 1 anchor)
            const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)
            imageCount = Math.max(totalImages - 1, 0)
        } else {
            // Normal mode: parse the prompt to get image count
            const parsedPrompt = parseDynamicPrompt(shotCreatorPrompt, {
                disablePipeSyntax: shotCreatorSettings.disablePipeSyntax,
                disableBracketSyntax: shotCreatorSettings.disableBracketSyntax,
                disableWildcardSyntax: shotCreatorSettings.disableWildcardSyntax
            }, wildcards)
            imageCount = parsedPrompt.totalCount || 1
        }

        let totalCost = imageCount * costPerImage

        // Add font costs for Riverflow (5 pts = $0.05 per font)
        let fontCost = 0
        const riverflowFontCount = riverflowState?.fontUrls?.length ?? 0
        if (model === 'riverflow-2-pro' && riverflowFontCount > 0) {
            fontCost = riverflowFontCount * 0.05
            totalCost += fontCost
        }

        // Convert dollar cost to tokens (1 token = $0.01)
        const tokenCost = Math.ceil(totalCost * 100)

        return {
            imageCount,
            totalCost,
            tokenCost,
            costPerImage,
            isAnchorMode,
            fontCost
        }
    }, [shotCreatorPrompt, shotCreatorSettings, wildcards, shotCreatorReferenceImages.length, riverflowState])

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

    // Auto-enable Anchor Transform when @! is detected in prompt
    // Track if we've shown the anchor notification to avoid spamming
    const [shownAnchorNotification, setShownAnchorNotification] = React.useState(false)

    React.useEffect(() => {
        const hasAnchorSyntax = detectAnchorTransform(shotCreatorPrompt)
        const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)

        if (hasAnchorSyntax && !shotCreatorSettings.enableAnchorTransform) {
            // Auto-enable when @! is typed (regardless of image count)
            updateSettings({ enableAnchorTransform: true })

            // Show helpful notification
            if (!shownAnchorNotification) {
                setShownAnchorNotification(true)
                if (totalImages < 2) {
                    toast.info(
                        '🎨 Anchor Transform activated! Add 2+ images: first = style anchor, rest = images to transform.',
                        { duration: 5000 }
                    )
                } else {
                    const transforms = totalImages - 1
                    toast.success(
                        `🎨 Anchor Transform: ${transforms} image${transforms !== 1 ? 's' : ''} will be transformed using the first image as style reference.`,
                        { duration: 4000 }
                    )
                }
            }
        } else if (!hasAnchorSyntax && shotCreatorSettings.enableAnchorTransform) {
            // Auto-disable when @! is removed from prompt
            updateSettings({ enableAnchorTransform: false })
            setShownAnchorNotification(false) // Reset so notification shows again if re-added
        }
    }, [shotCreatorPrompt, shotCreatorSettings.enableAnchorTransform, shotCreatorSettings.selectedStyle, shotCreatorReferenceImages.length, updateSettings, shownAnchorNotification])

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

    // Can generate: either regular mode (prompt + refs) OR recipe mode (valid recipe) OR quick mode
    const canGenerate = React.useMemo(() => {
        const activeRecipe = getActiveRecipe()
        if (activeRecipe) {
            const validation = getActiveValidation()
            // Recipe mode: valid fields + has refs (user's OR recipe's built-in)
            const hasRefs = shotCreatorReferenceImages.length > 0 ||
                activeRecipe.stages.some(s => (s.referenceImages?.length || 0) > 0)
            return (validation?.isValid ?? false) && hasRefs
        }

        // Style transfer quick mode: can generate with just a reference image
        if (shotCreatorSettings.quickMode === 'style-transfer' && shotCreatorReferenceImages.length > 0) {
            return true
        }

        // Character sheet quick mode: can generate with image OR description
        if (shotCreatorSettings.quickMode === 'character-sheet') {
            return shotCreatorReferenceImages.length > 0 || shotCreatorPrompt.trim().length > 0
        }

        // Regular mode: needs prompt only (reference images are optional for all models)
        return shotCreatorPrompt.length > 0
    }, [shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings.quickMode, getActiveRecipe, getActiveValidation])

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
        // Use preview if available, otherwise use imageData (base64)
        return item?.preview || item?.imageData || null
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

        // Auto-add the reference image when selecting an @tag
        const tagWithoutAt = suggestion.startsWith('@') ? suggestion.slice(1) : suggestion
        const matchingItem = libraryItems.find(item =>
            item.tags?.some(tag => tag.toLowerCase() === tagWithoutAt.toLowerCase())
        )

        // Get the image URL (prefer preview, fallback to imageData)
        const imageUrl = matchingItem?.preview || matchingItem?.imageData
        if (matchingItem && imageUrl) {
            // Check if not already added
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

        // Set cursor position after the inserted tag
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
            case 'z-image-turbo':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                // numInferenceSteps and guidanceScale use config defaults (8 and 0)
                break
            case 'seedream-4.5':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                baseSettings.resolution = shotCreatorSettings.resolution || '2K'
                // Sequential generation settings
                if (shotCreatorSettings.sequentialGeneration) {
                    baseSettings.sequentialGeneration = true
                    baseSettings.maxImages = shotCreatorSettings.maxImages || 3
                }
                break
            case 'qwen-image-2512':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'webp'
                break
            case 'gpt-image-low':
            case 'gpt-image-medium':
            case 'gpt-image-high':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'webp'
                break
            case 'riverflow-2-pro':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                // Riverflow-specific settings from panel state
                if (riverflowState) {
                    baseSettings.resolution = riverflowState.resolution
                    baseSettings.transparency = riverflowState.transparency
                    baseSettings.enhancePrompt = riverflowState.enhancePrompt
                    baseSettings.maxIterations = riverflowState.maxIterations
                    baseSettings.outputFormat = riverflowState.transparency ? 'png' : 'webp'
                } else {
                    // Defaults if panel hasn't been opened
                    baseSettings.resolution = '2K'
                    baseSettings.transparency = false
                    baseSettings.enhancePrompt = true
                    baseSettings.maxIterations = 3
                    baseSettings.outputFormat = 'webp'
                }
                break
        }

        return baseSettings
    }, [shotCreatorSettings, riverflowState])

    // Handle generation - processes recipe at generation time (no separate Apply step)
    const handleGenerate = useCallback(async () => {
        if (!canGenerate || isGenerating) return

        // ===== STYLE SHEET QUICK MODE =====
        // Check if style-transfer quick mode is active
        const isStyleTransferMode = shotCreatorSettings.quickMode === 'style-transfer'

        if (isStyleTransferMode && shotCreatorReferenceImages.length > 0) {
            // ALL reference images collectively define the style
            // Whether 1 image or multiple, they all inform the 3x3 Style Sheet generation
            // Parse style name from prompt (e.g., "Noir Grit:" or "Oxford Style:")
            const promptText = shotCreatorPrompt.trim()
            const styleNameMatch = promptText.match(/^([^:]+):/i)
            const styleName = styleNameMatch ? styleNameMatch[1].trim() : 'Extracted Style'
            const additionalNotes = styleNameMatch
                ? promptText.slice(styleNameMatch[0].length).trim()
                : promptText

            const styleSheetPrompt = `Create a visual style guide as a 9-image grid (3 rows × 3 columns).

TITLE BANNER (CRITICAL - DO NOT CUT OFF):
- Reserve a dedicated horizontal banner area at the TOP of the image
- Display the COMPLETE text "${styleName}" in large, readable font
- The title must be FULLY VISIBLE - no cropping, no cutting off letters
- Center the title text horizontally in the banner
- Use a clean background behind the title for legibility

GRID LAYOUT:
Below the title banner, arrange 9 cells in a 3×3 grid.
Separate each cell with SOLID BLACK LINES (4-6 pixels wide) for clean extraction.

CRITICAL STYLE EXTRACTION (match the reference image(s) EXACTLY):
Analyze ALL provided reference images collectively to extract the unified visual style:
- Color palette, contrast, saturation, and color temperature
- Rendering approach (painterly, photorealistic, illustrated, 3D, anime, claymation, etc.)
- Line quality and edge treatment (sharp vs soft, clean vs textured)
- Lighting style, shadow behavior, and mood
- Texture and material rendering quality
- Camera language (depth of field, lens feel, framing approach)

CRITICAL: Generate ALL NEW characters and subjects. DO NOT replicate, copy, or reference any specific people, characters, or subjects from the reference images. This style guide demonstrates the STYLE can be applied to entirely different subjects.

THE 9 TILES (3×3 grid):

ROW 1 – PEOPLE & FACES:
1. PORTRAIT CLOSE-UP: Dramatic headshot of a NEW person (not from reference), demonstrating how this style renders skin texture, facial features, emotion, and portrait lighting
2. MEDIUM SHOT: Different person in relaxed 3/4 pose, showing body proportions, clothing materials, and natural posture in this style
3. GROUP INTERACTION: 2-3 diverse people (different ethnicities, ages) in conversation or activity, showing how style handles multiple figures and interpersonal dynamics

ROW 2 – ACTION & DETAIL:
4. DYNAMIC ACTION: Figure in energetic motion (running, dancing, fighting), showing movement, energy, and how the style handles blur and dynamism
5. EMOTIONAL MOMENT: Expressive close-up capturing strong emotion (joy, grief, determination, wonder), testing emotional range
6. HANDS & FINE DETAIL: Close-up of hands interacting with an object (holding cup, turning page, crafting), showing fine detail rendering

ROW 3 – WORLD & MATERIALS:
7. INTERIOR SCENE: Atmospheric indoor environment with props, furniture, and lighting (cozy room, dramatic hall, cluttered workshop)
8. EXTERIOR WIDE: Landscape or cityscape establishing shot showing depth, atmosphere, scale, and environmental mood
9. MATERIAL STUDY: Still life of varied materials (metal, glass, fabric, wood, liquid, organic) demonstrating how the style renders different surfaces

${additionalNotes ? `\nADDITIONAL STYLE NOTES: ${additionalNotes}` : ''}

Every tile must feel like it belongs to the SAME visual world. Consistent style language across all 9 cells.
NO style drift between tiles. NO text labels inside the 9 image cells. Black grid lines between all cells.
REMINDER: Title "${styleName}" must be COMPLETE and FULLY READABLE at the top - never cropped or cut off.`

            const model = shotCreatorSettings.model || 'nano-banana-pro'
            const referenceUrls = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))
            const modelSettings = buildModelSettings()

            // Force 1:1 aspect ratio for 3x3 grid
            const styleSheetSettings = {
                ...modelSettings,
                aspectRatio: '1:1'
            }

            await generateImage(
                model,
                styleSheetPrompt,
                referenceUrls,
                styleSheetSettings,
                undefined
            )
            return
        }

        // ===== CHARACTER SHEET QUICK MODE =====
        const isCharacterSheetMode = shotCreatorSettings.quickMode === 'character-sheet'

        if (isCharacterSheetMode) {
            const hasReferenceImages = shotCreatorReferenceImages.length > 0
            const hasDescription = shotCreatorPrompt.trim().length > 0

            // Must have either an image OR a description
            if (!hasReferenceImages && !hasDescription) {
                toast.error('Character Sheet needs either a reference image OR a character description')
                return
            }

            const model = shotCreatorSettings.model || 'nano-banana-pro'
            const modelSettings = buildModelSettings()

            // Force 16:9 aspect ratio for character sheets
            const characterSheetSettings = {
                ...modelSettings,
                aspectRatio: '16:9'
            }

            if (hasReferenceImages) {
                // ===== IMAGE-BASED TURNAROUND =====
                const turnaroundPrompt = `Create a professional character reference sheet based strictly on the uploaded reference image.

Use a clean, neutral plain background and present the sheet as a technical model turnaround while matching the exact visual style of the reference (same realism level, rendering approach, texture, color treatment, and overall aesthetic).

Arrange the composition into two horizontal rows:

TOP ROW (4 full-body standing views, placed side-by-side):
- Front view
- Left profile view (facing left)
- Right profile view (facing right)
- Back view

BOTTOM ROW (3 highly detailed close-up portraits, aligned beneath the full-body row):
- Front portrait
- Left profile portrait (facing left)
- Right profile portrait (facing right)

CRITICAL REQUIREMENTS:
- Maintain PERFECT identity consistency across every panel
- Keep the subject in a relaxed A-pose
- Consistent scale and alignment between views
- Accurate anatomy and clear silhouette
- Even spacing and clean panel separation
- Uniform framing and consistent head height across the full-body lineup
- Consistent facial scale across the portraits
- Lighting must be consistent across all panels (same direction, intensity, and softness)
- Natural, controlled shadows that preserve detail without dramatic mood shifts

Output a crisp, print-ready reference sheet look with sharp details.`

                const referenceUrls = shotCreatorReferenceImages
                    .map(ref => ref.url || ref.preview)
                    .filter((url): url is string => Boolean(url))

                toast.info('Creating character turnaround from reference image...')

                await generateImage(
                    model,
                    turnaroundPrompt,
                    referenceUrls,
                    characterSheetSettings,
                    { recipeId: 'character-turnaround', recipeName: 'Character Turnaround' }
                )
                return

            } else {
                // ===== DESCRIPTION-BASED TURNAROUND =====
                // Parse character name from prompt
                // Supports: "Marcus: description", "Marcus, description", "description named Marcus", "description called Marcus"
                let characterName = ''
                let characterDescription = shotCreatorPrompt.trim()

                // Check for "Name: description" or "Name, description" format
                const colonMatch = shotCreatorPrompt.match(/^([A-Z][a-zA-Z]+)\s*[:]\s*([\s\S]+)$/)
                const commaMatch = shotCreatorPrompt.match(/^([A-Z][a-zA-Z]+)\s*[,]\s*([\s\S]+)$/)
                // Check for "description named/called Name" format
                const namedMatch = shotCreatorPrompt.match(/(.+?)\s+(?:named|called)\s+([A-Z][a-zA-Z]+)(?:\s|$|,)/i)

                if (colonMatch) {
                    characterName = colonMatch[1]
                    characterDescription = colonMatch[2].trim()
                } else if (commaMatch) {
                    characterName = commaMatch[1]
                    characterDescription = commaMatch[2].trim()
                } else if (namedMatch) {
                    characterName = namedMatch[2]
                    characterDescription = namedMatch[1].trim()
                }

                // Format name for @tag (lowercase, underscores for spaces)
                const nameTag = characterName
                    ? `@${characterName.toLowerCase().replace(/\s+/g, '_')}`
                    : ''

                const characterHeader = characterName
                    ? `CHARACTER: ${nameTag} (${characterName})\n\n`
                    : ''

                const turnaroundFromDescPrompt = `${characterHeader}Create a professional character reference sheet: ${characterDescription}

IMPORTANT: Match the EXACT visual style specified in the description above (photorealistic, hand drawn, anime, cartoon, oil painting, 3D render, etc.). Every panel must use this same style consistently.

Use a clean, neutral plain background and present the sheet as a technical model turnaround.
${nameTag ? `\nLabel the sheet with the character tag: "${nameTag}"` : ''}

Arrange the composition into two horizontal rows:

TOP ROW (4 full-body standing views, placed side-by-side):
- Front view
- Left profile view (facing left)
- Right profile view (facing right)
- Back view

BOTTOM ROW (3 highly detailed close-up portraits, aligned beneath the full-body row):
- Front portrait
- Left profile portrait (facing left)
- Right profile portrait (facing right)

CRITICAL REQUIREMENTS:
- Maintain the EXACT visual style from the description across ALL panels
- Maintain PERFECT identity consistency across every panel
- Keep the subject in a relaxed A-pose
- Consistent scale and alignment between views
- Accurate anatomy and clear silhouette
- Even spacing and clean panel separation
- Uniform framing and consistent head height across the full-body lineup
- Consistent facial scale across the portraits
- Lighting must be consistent across all panels (same direction, intensity, and softness)
- Natural, controlled shadows that preserve detail without dramatic mood shifts

Output a crisp, print-ready reference sheet with the exact style specified.`

                const toastMsg = characterName
                    ? `Creating character sheet for ${characterName}...`
                    : 'Creating character turnaround from description...'
                toast.info(toastMsg)

                await generateImage(
                    model,
                    turnaroundFromDescPrompt,
                    [], // No reference images
                    characterSheetSettings,
                    { recipeId: 'character-turnaround-desc', recipeName: 'Character Turnaround (From Description)' }
                )
                return
            }
        }

        // ===== ANCHOR TRANSFORM MODE (Toggle Button) =====
        // Check if Anchor Transform is enabled via toggle
        const isAnchorMode = shotCreatorSettings.enableAnchorTransform

        if (isAnchorMode) {
            // Calculate total images (reference images + style guide if selected)
            const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)

            // Validation: Need at least 2 images (1 anchor + 1 input)
            if (totalImages < 2) {
                toast.error('Anchor Transform requires at least 2 images (1 anchor + 1+ inputs)')
                return
            }

            // Determine anchor and inputs
            let anchorUrl: string | null = null
            let anchorName: string = ''
            let inputRefs: typeof shotCreatorReferenceImages = []

            if (shotCreatorSettings.selectedStyle) {
                // Style guide is the anchor
                const selectedStyle = useCustomStylesStore.getState().getStyleById(shotCreatorSettings.selectedStyle)
                if (!selectedStyle) {
                    toast.error('Selected style not found')
                    return
                }

                // Get style image URL
                const styleImageUrl = selectedStyle.imagePath
                anchorUrl = styleImageUrl.startsWith('data:') || styleImageUrl.startsWith('http')
                    ? styleImageUrl
                    : `${window.location.origin}${styleImageUrl}`

                anchorName = selectedStyle.name || 'Style Guide'

                // ALL reference images are inputs
                inputRefs = shotCreatorReferenceImages

                if (inputRefs.length === 0) {
                    toast.error('Anchor Transform with style guide requires at least 1 reference image to transform')
                    return
                }
            } else {
                // No style guide: First reference is anchor, rest are inputs
                if (shotCreatorReferenceImages.length < 2) {
                    toast.error('Anchor Transform requires at least 2 reference images (or 1 style + 1 image)')
                    return
                }

                const [anchorRef, ...restRefs] = shotCreatorReferenceImages
                anchorUrl = anchorRef.url || anchorRef.preview || null
                anchorName = anchorRef.file?.name || 'Image 1'
                inputRefs = restRefs

                if (!anchorUrl) {
                    toast.error('The first reference image (anchor) is not valid')
                    return
                }
            }

            // Extract input URLs
            const inputUrls = inputRefs
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))

            if (inputUrls.length === 0) {
                toast.error('No valid input images to transform')
                return
            }

            // Strip @! from prompt before sending to API
            const cleanPrompt = stripAnchorSyntax(shotCreatorPrompt)

            // ANCHOR TRANSFORM LIMIT: Max 15 transforms per batch
            const ANCHOR_TRANSFORM_MAX = 15
            if (inputUrls.length > ANCHOR_TRANSFORM_MAX) {
                toast.error(`Anchor Transform is limited to ${ANCHOR_TRANSFORM_MAX} images per batch. You have ${inputUrls.length}. Please remove some images.`)
                return
            }

            // Warn about larger batch sizes (5+ images)
            if (inputUrls.length >= 5) {
                const costEstimate = inputUrls.length * (generationCost.costPerImage || 20)
                const confirmed = window.confirm(
                    `Anchor Transform: ${inputUrls.length} images = ${inputUrls.length} generations.\n` +
                    `Estimated cost: ${costEstimate} credits.\n\nContinue?`
                )
                if (!confirmed) return
            }

            const model = shotCreatorSettings.model || 'nano-banana'
            const modelSettings = buildModelSettings()
            const results = []
            let successCount = 0
            let failCount = 0

            // Loop through input images
            for (let i = 0; i < inputUrls.length; i++) {
                const inputUrl = inputUrls[i]
                const inputRef = inputRefs[i]
                const inputName = inputRef.file?.name || `Image ${i + 1}`

                try {
                    toast.info(`Anchor Transform: ${i + 1} of ${inputUrls.length} - ${inputName}`)

                    // Generate with anchor + current input
                    // CRITICAL: If style is the anchor, don't send it in referenceImages
                    // because useImageGeneration will auto-inject it at the front
                    const refsToSend = shotCreatorSettings.selectedStyle
                        ? [inputUrl]  // Style anchor: only send input (style auto-injected)
                        : [anchorUrl, inputUrl]  // Ref anchor: send both explicitly

                    await generateImage(
                        model,
                        cleanPrompt,
                        refsToSend,
                        modelSettings,
                        undefined
                    )

                    successCount++
                    results.push({
                        success: true,
                        inputName,
                        index: i + 1
                    })

                } catch (error) {
                    failCount++
                    console.error(`Failed to transform image ${i + 1}:`, error)
                    toast.error(`Transform failed: ${inputName}`)

                    results.push({
                        success: false,
                        inputName,
                        index: i + 1,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })

                    // Continue with next image (don't fail entire batch)
                }
            }

            // Final summary toast
            if (failCount === 0) {
                toast.success(`Anchor Transform complete: ${successCount}/${inputUrls.length} succeeded`)
            } else {
                toast.error(`Anchor Transform complete: ${successCount} succeeded, ${failCount} failed`)
            }

            return
        }
        // ===== END ANCHOR TRANSFORM MODE =====

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
                updateSettings({ model: activeRecipe.suggestedModel as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5' | 'riverflow-2-pro' })
            }
            if (activeRecipe.suggestedAspectRatio) {
                updateSettings({ aspectRatio: activeRecipe.suggestedAspectRatio })
            }

            // Combine user refs + recipe refs (deduplicated)
            const userRefs = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))
            const allRefs = [...new Set([...userRefs, ...result.referenceImages])]

            // Check if recipe has tool stages - use full recipe execution service
            const hasTool = hasToolStages(activeRecipe)

            if (hasTool) {

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

                const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-pro') as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5' | 'riverflow-2-pro'
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
                            toast.info(`Stage ${stage + 1}/${total}: ${status}`)
                        }
                    })

                    if (executionResult.success) {
                        toast.success('Recipe completed successfully!')
                    } else {
                        toast.error(`Recipe failed: ${executionResult.error}`)
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                    toast.error(`Recipe execution error: ${errorMsg}`)
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
            const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana') as 'nano-banana' | 'nano-banana-pro' | 'z-image-turbo' | 'qwen-image-2512' | 'gpt-image-low' | 'gpt-image-medium' | 'gpt-image-high' | 'seedream-4.5' | 'riverflow-2-pro'
            const modelSettings = buildModelSettings()

            toast.info(`Generating with recipe: ${activeRecipe.name}`)

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

        // Build Riverflow inputs if using Riverflow model
        const riverflowInputs = model === 'riverflow-2-pro' && riverflowState ? {
            detailRefImages: riverflowState.detailRefs,
            fontUrls: riverflowState.fontUrls,
            fontTexts: riverflowState.fontTexts,
        } : undefined

        await generateImage(
            model,
            shotCreatorPrompt,
            referenceUrls,
            modelSettings,
            lastUsedRecipe || undefined,
            riverflowInputs
        )

        // Clear recipe tracking after generation
        setLastUsedRecipe(null)
    }, [canGenerate, isGenerating, shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings, generateImage, buildModelSettings, lastUsedRecipe, getActiveRecipe, getActiveValidation, buildActivePrompts, updateSettings, setStageReferenceImages, activeFieldValues, generationCost, riverflowState])

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
                        <PromptExpanderButton
                            prompt={shotCreatorPrompt}
                            onPromptChange={setShotCreatorPrompt}
                        />
                        <QuickAccessBar onSelectRecipe={_handleSelectRecipe} />
                    </div>
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

                {/* Mobile prompts recipes bar */}
                <MobilePromptsRecipesBar
                    onSelectPrompt={(prompt) => setShotCreatorPrompt(shotCreatorPrompt + (shotCreatorPrompt ? ' ' : '') + prompt)}
                    onSelectRecipe={(recipeId) => setActiveRecipe(recipeId)}
                />

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

                    // Get anchor name (style or first ref image)
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