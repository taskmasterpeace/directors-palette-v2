import React, { useState, useCallback } from 'react'
import { useShotCreatorStore } from '@/features/shot-creator/store/shot-creator.store'
import { useCustomStylesStore } from '../store/custom-styles.store'
import { getModelConfig, getModelCost } from '@/config'
import { useShotCreatorSettings } from './useShotCreatorSettings'
import { useImageGeneration } from './useImageGeneration'
import { parseDynamicPrompt, detectAnchorTransform, stripAnchorSyntax } from '../helpers/prompt-syntax-feedback'
import { useWildCardStore } from '../store/wildcard.store'
import { useRecipeStore } from '../store/recipe.store'
import { executeRecipe } from '@/features/shared/services/recipe-execution.service'
import type { Recipe } from '../types/recipe.types'
import { toast } from 'sonner'
import type { RiverflowState } from '../components/RiverflowOptionsPanel'
import { logger } from '@/lib/logger'

/**
 * Check if a recipe has any tool stages that require special execution
 */
function hasToolStages(recipe: Recipe): boolean {
    return recipe.stages.some(stage => stage.type === 'tool' || stage.type === 'analysis')
}

export interface GenerationCost {
    imageCount: number
    totalCost: number
    tokenCost: number
    costPerImage: number
    isAnchorMode: boolean | undefined
    fontCost: number
}

/**
 * Hook that encapsulates all prompt generation logic:
 * - Cost calculation
 * - canGenerate validation
 * - Model settings builder
 * - All generation modes (style-transfer, character-sheet, anchor-transform, recipe, regular)
 * - Riverflow state management
 * - Auto anchor-transform detection
 *
 * Extracted from PromptActions to keep the component focused on UI.
 */
export function usePromptGeneration() {
    const {
        shotCreatorPrompt,
        shotCreatorReferenceImages,
        setStageReferenceImages,
    } = useShotCreatorStore()
    const { settings: shotCreatorSettings, updateSettings } = useShotCreatorSettings()
    const { generateImage, isGenerating, cancelGeneration } = useImageGeneration()
    const { wildcards } = useWildCardStore()
    const { activeFieldValues, setActiveRecipe: _setActiveRecipe, getActiveRecipe, getActiveValidation, buildActivePrompts } = useRecipeStore()

    // Riverflow state (tracked locally, passed to generation)
    const [riverflowState, setRiverflowState] = useState<RiverflowState | null>(null)

    // Track last used recipe for generation metadata
    const [lastUsedRecipe, setLastUsedRecipe] = useState<{ recipeId: string; recipeName: string } | null>(null)

    // Auto-enable Anchor Transform when @! is detected in prompt
    const [shownAnchorNotification, setShownAnchorNotification] = React.useState(false)

    React.useEffect(() => {
        const hasAnchorSyntax = detectAnchorTransform(shotCreatorPrompt)
        const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)

        if (hasAnchorSyntax && !shotCreatorSettings.enableAnchorTransform) {
            updateSettings({ enableAnchorTransform: true })

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
            updateSettings({ enableAnchorTransform: false })
            setShownAnchorNotification(false)
        }
    }, [shotCreatorPrompt, shotCreatorSettings.enableAnchorTransform, shotCreatorSettings.selectedStyle, shotCreatorReferenceImages.length, updateSettings, shownAnchorNotification])

    // ── Cost calculation ───────────────────────────────────────────────
    const generationCost: GenerationCost = React.useMemo(() => {
        const model = shotCreatorSettings.model || 'nano-banana-2'
        const modelConfig = getModelConfig(model)

        let costPerImage = modelConfig.costPerImage
        if (model === 'riverflow-2-pro' && riverflowState) {
            costPerImage = getModelCost('riverflow-2-pro', riverflowState.resolution)
        }

        const isAnchorMode = shotCreatorSettings.enableAnchorTransform

        let imageCount: number

        if (isAnchorMode) {
            const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)
            imageCount = Math.max(totalImages - 1, 0)
        } else {
            const parsedPrompt = parseDynamicPrompt(shotCreatorPrompt, {
                disablePipeSyntax: shotCreatorSettings.disablePipeSyntax,
                disableBracketSyntax: shotCreatorSettings.disableBracketSyntax,
                disableWildcardSyntax: shotCreatorSettings.disableWildcardSyntax
            }, wildcards)
            imageCount = parsedPrompt.totalCount || 1
        }

        let totalCost = imageCount * costPerImage

        let fontCost = 0
        const riverflowFontCount = riverflowState?.fontUrls?.length ?? 0
        if (model === 'riverflow-2-pro' && riverflowFontCount > 0) {
            fontCost = riverflowFontCount * 0.05
            totalCost += fontCost
        }

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

    // ── canGenerate validation ─────────────────────────────────────────
    const canGenerate = React.useMemo(() => {
        const activeRecipe = getActiveRecipe()
        if (activeRecipe) {
            const validation = getActiveValidation()
            const hasRefs = shotCreatorReferenceImages.length > 0 ||
                activeRecipe.stages.some(s => (s.referenceImages?.length || 0) > 0)
            return (validation?.isValid ?? false) && hasRefs
        }

        if (shotCreatorSettings.quickMode === 'style-transfer' && shotCreatorReferenceImages.length > 0) {
            return true
        }

        if (shotCreatorSettings.quickMode === 'character-sheet') {
            return shotCreatorReferenceImages.length > 0 || shotCreatorPrompt.trim().length > 0
        }

        return shotCreatorPrompt.length > 0
    }, [shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings.quickMode, getActiveRecipe, getActiveValidation])

    // ── Build model settings from shotCreatorSettings ──────────────────
    const buildModelSettings = useCallback(() => {
        const model = shotCreatorSettings.model || 'nano-banana-2'
        const baseSettings: Record<string, unknown> = {}

        switch (model) {
            case 'nano-banana-2':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.safetyFilterLevel = shotCreatorSettings.safetyFilterLevel || 'block_only_high'
                baseSettings.personGeneration = shotCreatorSettings.personGeneration || 'allow_all'
                break
            case 'z-image-turbo':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                break
            case 'seedream-5-lite':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                baseSettings.outputFormat = shotCreatorSettings.outputFormat || 'jpg'
                baseSettings.resolution = shotCreatorSettings.resolution || '2K'
                if (shotCreatorSettings.sequentialGeneration) {
                    baseSettings.sequentialGeneration = true
                    baseSettings.maxImages = shotCreatorSettings.maxImages || 3
                }
                break
            case 'riverflow-2-pro':
                baseSettings.aspectRatio = shotCreatorSettings.aspectRatio
                if (riverflowState) {
                    baseSettings.resolution = riverflowState.resolution
                    baseSettings.transparency = riverflowState.transparency
                    baseSettings.enhancePrompt = riverflowState.enhancePrompt
                    baseSettings.maxIterations = riverflowState.maxIterations
                    baseSettings.outputFormat = riverflowState.transparency ? 'png' : 'webp'
                } else {
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

    // ── Main generation handler ────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
        if (!canGenerate || isGenerating) return

        // ===== STYLE SHEET QUICK MODE =====
        const isStyleTransferMode = shotCreatorSettings.quickMode === 'style-transfer'

        if (isStyleTransferMode && shotCreatorReferenceImages.length > 0) {
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

            const model = shotCreatorSettings.model || 'nano-banana-2'
            const referenceUrls = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))
            const modelSettings = buildModelSettings()

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

            if (!hasReferenceImages && !hasDescription) {
                toast.error('Character Sheet needs either a reference image OR a character description')
                return
            }

            const model = shotCreatorSettings.model || 'nano-banana-2'
            const modelSettings = buildModelSettings()

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
                let characterName = ''
                let characterDescription = shotCreatorPrompt.trim()

                const colonMatch = shotCreatorPrompt.match(/^([A-Z][a-zA-Z]+)\s*[:]\s*([\s\S]+)$/)
                const commaMatch = shotCreatorPrompt.match(/^([A-Z][a-zA-Z]+)\s*[,]\s*([\s\S]+)$/)
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
                    [],
                    characterSheetSettings,
                    { recipeId: 'character-turnaround-desc', recipeName: 'Character Turnaround (From Description)' }
                )
                return
            }
        }

        // ===== ANCHOR TRANSFORM MODE (Toggle Button) =====
        const isAnchorMode = shotCreatorSettings.enableAnchorTransform

        if (isAnchorMode) {
            const totalImages = shotCreatorReferenceImages.length + (shotCreatorSettings.selectedStyle ? 1 : 0)

            if (totalImages < 2) {
                toast.error('Anchor Transform requires at least 2 images (1 anchor + 1+ inputs)')
                return
            }

            let anchorUrl: string | null = null
            let _anchorName: string = ''
            let inputRefs: typeof shotCreatorReferenceImages = []

            if (shotCreatorSettings.selectedStyle) {
                const selectedStyle = useCustomStylesStore.getState().getStyleById(shotCreatorSettings.selectedStyle)
                if (!selectedStyle) {
                    toast.error('Selected style not found')
                    return
                }

                const styleImageUrl = selectedStyle.imagePath
                anchorUrl = styleImageUrl.startsWith('data:') || styleImageUrl.startsWith('http')
                    ? styleImageUrl
                    : `${window.location.origin}${styleImageUrl}`

                _anchorName = selectedStyle.name || 'Style Guide'

                inputRefs = shotCreatorReferenceImages

                if (inputRefs.length === 0) {
                    toast.error('Anchor Transform with style guide requires at least 1 reference image to transform')
                    return
                }
            } else {
                if (shotCreatorReferenceImages.length < 2) {
                    toast.error('Anchor Transform requires at least 2 reference images (or 1 style + 1 image)')
                    return
                }

                const [anchorRef, ...restRefs] = shotCreatorReferenceImages
                anchorUrl = anchorRef.url || anchorRef.preview || null
                _anchorName = anchorRef.file?.name || 'Image 1'
                inputRefs = restRefs

                if (!anchorUrl) {
                    toast.error('The first reference image (anchor) is not valid')
                    return
                }
            }

            const inputUrls = inputRefs
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))

            if (inputUrls.length === 0) {
                toast.error('No valid input images to transform')
                return
            }

            const cleanPrompt = stripAnchorSyntax(shotCreatorPrompt)

            const ANCHOR_TRANSFORM_MAX = 15
            if (inputUrls.length > ANCHOR_TRANSFORM_MAX) {
                toast.error(`Anchor Transform is limited to ${ANCHOR_TRANSFORM_MAX} images per batch. You have ${inputUrls.length}. Please remove some images.`)
                return
            }

            if (inputUrls.length >= 5) {
                const costEstimate = inputUrls.length * (generationCost.costPerImage || 20)
                const confirmed = window.confirm(
                    `Anchor Transform: ${inputUrls.length} images = ${inputUrls.length} generations.\n` +
                    `Estimated cost: ${costEstimate} credits.\n\nContinue?`
                )
                if (!confirmed) return
            }

            const model = shotCreatorSettings.model || 'nano-banana-2'
            const modelSettings = buildModelSettings()
            const results = []
            let successCount = 0
            let failCount = 0

            for (let i = 0; i < inputUrls.length; i++) {
                const inputUrl = inputUrls[i]
                const inputRef = inputRefs[i]
                const inputName = inputRef.file?.name || `Image ${i + 1}`

                try {
                    toast.info(`Anchor Transform: ${i + 1} of ${inputUrls.length} - ${inputName}`)

                    const refsToSend = shotCreatorSettings.selectedStyle
                        ? [inputUrl]
                        : [anchorUrl, inputUrl]

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
                    logger.shotCreator.error('Failed to transform image [detail]', { detail: i + 1, error: error instanceof Error ? error.message : String(error) })
                    toast.error(`Transform failed: ${inputName}`)

                    results.push({
                        success: false,
                        inputName,
                        index: i + 1,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    })
                }
            }

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

        // Recipe mode
        if (activeRecipe) {
            if (!validation?.isValid) {
                logger.shotCreator.warn('Recipe validation failed', { detail: validation?.missingFields })
                return
            }

            const result = buildActivePrompts()
            if (!result || result.prompts.length === 0) {
                logger.shotCreator.error('Failed to build prompts from recipe')
                return
            }

            if (activeRecipe.suggestedModel) {
                updateSettings({ model: activeRecipe.suggestedModel as 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro' })
            }
            if (activeRecipe.suggestedAspectRatio) {
                updateSettings({ aspectRatio: activeRecipe.suggestedAspectRatio })
            }

            const userRefs = shotCreatorReferenceImages
                .map(ref => ref.url || ref.preview)
                .filter((url): url is string => Boolean(url))
            const allRefs = [...new Set([...userRefs, ...result.referenceImages])]

            const hasTool = hasToolStages(activeRecipe)

            if (hasTool) {
                const stageReferenceImages: string[][] = result.stageReferenceImages || []

                if (stageReferenceImages.length === 0) {
                    stageReferenceImages.push(allRefs)
                } else {
                    stageReferenceImages[0] = [...new Set([...allRefs, ...stageReferenceImages[0]])]
                }

                const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-2') as 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
                const aspectRatio = shotCreatorSettings.aspectRatio || activeRecipe.suggestedAspectRatio || '16:9'

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

                return
            }

            // No tool stages - use fast pipe-concatenation approach
            const fullPrompt = result.prompts.join(' | ')

            if (result.stageReferenceImages && result.stageReferenceImages.length > 0) {
                setStageReferenceImages(result.stageReferenceImages)
            } else {
                setStageReferenceImages([])
            }

            const model = (activeRecipe.suggestedModel || shotCreatorSettings.model || 'nano-banana-2') as 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
            const modelSettings = buildModelSettings()

            toast.info(`Generating with recipe: ${activeRecipe.name}`)

            await generateImage(
                model,
                fullPrompt,
                allRefs,
                modelSettings,
                { recipeId: activeRecipe.id, recipeName: activeRecipe.name }
            )

            return
        }

        // ===== Regular mode =====
        const model = shotCreatorSettings.model || 'nano-banana-2'
        const referenceUrls = shotCreatorReferenceImages
            .map(ref => ref.url || ref.preview)
            .filter((url): url is string => Boolean(url))
        const modelSettings = buildModelSettings()

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

        setLastUsedRecipe(null)
    }, [canGenerate, isGenerating, shotCreatorPrompt, shotCreatorReferenceImages, shotCreatorSettings, generateImage, buildModelSettings, lastUsedRecipe, getActiveRecipe, getActiveValidation, buildActivePrompts, updateSettings, setStageReferenceImages, activeFieldValues, generationCost, riverflowState])

    return {
        handleGenerate,
        canGenerate,
        generationCost,
        isGenerating,
        cancelGeneration,
        // Riverflow state management (component needs to pass onChange to panel)
        riverflowState,
        setRiverflowState,
        // Model settings builder (exposed in case component needs it)
        buildModelSettings,
    }
}
