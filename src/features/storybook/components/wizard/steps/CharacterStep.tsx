"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { useRecipeExecution } from "@/features/shared/hooks/useRecipeExecution"
import { useRecipes } from "@/features/shot-creator/hooks/useRecipes"
import { SYSTEM_TEMPLATES } from "../../../services/template.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Upload, Sparkles, Trash2, User, ImageIcon, UserCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"
import { compressImage } from "@/utils/image-compression"
import { StoryCharacter } from "../../../types/storybook.types"
import { ErrorDialog } from "../ErrorDialog"
import { validateCharacterDescription } from "../../../utils/validation"

// Unified character type for display (combines main and supporting characters)
interface UnifiedCharacter {
  id: string
  name: string
  tag: string
  sourcePhotoUrl?: string
  sourcePhotoUrls?: string[] // Multiple reference photos (1-3)
  outfitDescription?: string // What they wear in the book
  characterSheetUrl?: string
  isSupporting: boolean
  role?: string
  description?: string
}

export function CharacterStep() {
  const {
    project,
    addCharacter,
    addStoryCharacter,
    removeCharacter,
    updateCharacter,
    detectCharacters,
    updateProject,
  } = useStorybookStore()

  // Create unified list of all characters (main + supporting)
  const allCharacters = useMemo((): UnifiedCharacter[] => {
    const mainChars: UnifiedCharacter[] = (project?.characters || []).map(c => ({
      id: c.id,
      name: c.name,
      tag: c.tag,
      sourcePhotoUrl: c.sourcePhotoUrl,
      sourcePhotoUrls: c.sourcePhotoUrls || (c.sourcePhotoUrl ? [c.sourcePhotoUrl] : []), // Backwards compat
      outfitDescription: c.outfitDescription,
      characterSheetUrl: c.characterSheetUrl,
      isSupporting: false,
      description: c.description, // Include main character descriptions
    }))

    const supportChars: UnifiedCharacter[] = (project?.storyCharacters || []).map(sc => ({
      id: sc.id,
      name: sc.name,
      tag: `@${sc.name.replace(/\s+/g, '')}`,
      sourcePhotoUrl: sc.photoUrl,
      sourcePhotoUrls: sc.photoUrl ? [sc.photoUrl] : [],
      characterSheetUrl: sc.characterSheetUrl,
      isSupporting: true,
      role: sc.role,
      description: sc.description,
    }))

    return [...mainChars, ...supportChars]
  }, [project?.characters, project?.storyCharacters])

  // Helper to update supporting character
  const updateSupportingCharacter = useCallback((charId: string, updates: Partial<StoryCharacter>) => {
    if (!project?.storyCharacters) return
    const updatedChars = project.storyCharacters.map(sc =>
      sc.id === charId ? { ...sc, ...updates } : sc
    )
    updateProject({ storyCharacters: updatedChars })
  }, [project?.storyCharacters, updateProject])

  // Legacy generation state (for display purposes only)
  const { isGenerating: legacyIsGenerating, progress: legacyProgress, error: legacyError } = useStorybookGeneration()

  // Recipe-based generation (new)
  const { executeSystemRecipe, isExecuting: recipeIsExecuting, progress: recipeProgress, error: recipeError } = useRecipeExecution()
  const { getSystemOnlyRecipes, isInitialized: recipesInitialized } = useRecipes()

  // Use recipe-based generation if available, fall back to legacy
  const isGenerating = recipeIsExecuting || legacyIsGenerating
  const progress = recipeIsExecuting ? recipeProgress : legacyProgress
  const error = recipeError || legacyError

  // Track which character is currently being generated
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null)
  // Track which character is uploading a photo
  const [uploadingCharacterId, setUploadingCharacterId] = useState<string | null>(null)

  // File input refs (one per character)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // State for LLM-based detection
  const [isDetecting, setIsDetecting] = useState(false)
  // State for description enhancement
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancingCharacterId, setEnhancingCharacterId] = useState<string | null>(null)
  // State for error dialog
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: '',
    message: '',
  })
  // State for inline description validation errors
  const [descriptionErrors, setDescriptionErrors] = useState<Record<string, string>>({})

  // Handler to enhance character description using AI
  const handleEnhanceDescription = async (characterId: string) => {
    const character = allCharacters.find(c => c.id === characterId)
    if (!character?.description?.trim()) return

    setIsEnhancing(true)
    setEnhancingCharacterId(characterId)

    try {
      const response = await fetch('/api/storybook/enhance-character-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterHint: character.description,
          characterName: character.name,
          role: character.isSupporting ? character.role : 'protagonist',
          storyContext: project?.storyText?.slice(0, 500),
        })
      })

      if (response.ok) {
        const { expandedDescription } = await response.json()
        // Update the character description with the enhanced version
        if (character.isSupporting) {
          updateSupportingCharacter(characterId, { description: expandedDescription })
        } else {
          updateCharacter(characterId, { description: expandedDescription })
        }
      } else {
        console.error('Failed to enhance description')
      }
    } catch (err) {
      console.error('Error enhancing description:', err)
    } finally {
      setIsEnhancing(false)
      setEnhancingCharacterId(null)
    }
  }

  // Auto-detect characters using LLM API when step loads
  useEffect(() => {
    const detectWithLLM = async () => {
      // Get storyText, fallback to generatedStory if needed
      let textToAnalyze = project?.storyText

      // FALLBACK: If storyText is empty but generatedStory exists, convert it
      if ((!textToAnalyze || textToAnalyze.trim() === '') && project?.generatedStory) {
        textToAnalyze = project.generatedStory.pages.map(p => p.text).join('\n\n')
        console.warn('[CharacterStep] storyText was empty, using generatedStory.pages')
      }

      if (textToAnalyze && project?.characters.length === 0 && !isDetecting) {
        setIsDetecting(true)
        try {
          const response = await fetch('/api/storybook/detect-characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyText: textToAnalyze })
          })
          if (response.ok) {
            const data = await response.json()
            if (data.characters?.length > 0) {
              data.characters.forEach((c: { name: string; tag: string; role: string; description?: string }) => {
                if (c.role === 'supporting') {
                  // Add supporting characters to storyCharacters array
                  addStoryCharacter({
                    name: c.name,
                    role: 'other', // CharacterRole type for store
                    description: c.description || '',
                  })
                } else {
                  // Add main characters to characters array
                  addCharacter(c.name, c.tag)
                }
              })
            }
          }
        } catch (err) {
          console.error('Error detecting characters:', err)
          // Fallback to regex-based detection
          detectCharacters()
        } finally {
          setIsDetecting(false)
        }
      }
    }
    detectWithLLM()
  }, [project?.storyText, project?.generatedStory, project?.characters.length, addCharacter, addStoryCharacter, detectCharacters, isDetecting])

  const handleAddCharacter = () => {
    const mainCharCount = project?.characters?.length || 0
    const name = `Character ${mainCharCount + 1}`
    addCharacter(name, `@${name.replace(/\s+/g, '')}`)
  }

  // Handle photo upload for a character (supports multiple photos)
  const handlePhotoUpload = useCallback(async (characterId: string, file: File, slotIndex?: number) => {
    setUploadingCharacterId(characterId)

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file)

      // Create a FormData object to upload the image
      const formData = new FormData()
      formData.append('file', compressedFile)

      // Upload to our upload endpoint
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      const photoUrl = data.url

      // Get current photos array
      const character = allCharacters.find(c => c.id === characterId)
      const currentPhotos = character?.sourcePhotoUrls || []

      // Update the specific slot or append
      let updatedPhotos: string[]
      if (slotIndex !== undefined && slotIndex < 3) {
        updatedPhotos = [...currentPhotos]
        updatedPhotos[slotIndex] = photoUrl
      } else {
        // Append to array (max 3)
        updatedPhotos = [...currentPhotos, photoUrl].slice(0, 3)
      }

      // Update the character with the new photos array
      updateCharacter(characterId, {
        sourcePhotoUrls: updatedPhotos,
        sourcePhotoUrl: updatedPhotos[0], // Keep legacy field in sync
      })
    } catch (err) {
      console.error('Upload error:', err)
      setErrorDialog({
        open: true,
        title: 'Upload Failed',
        message: err instanceof Error ? err.message : 'Upload failed. Please try a smaller image.',
      })
    } finally {
      setUploadingCharacterId(null)
    }
  }, [updateCharacter, allCharacters])

  // Handle file input change (with optional slot index for multi-photo)
  const handleFileChange = useCallback((characterId: string, event: React.ChangeEvent<HTMLInputElement>, slotIndex?: number) => {
    const file = event.target.files?.[0]
    if (file) {
      handlePhotoUpload(characterId, file, slotIndex)
    }
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }, [handlePhotoUpload])

  // Handle character sheet generation using recipe-based pipeline
  // Now supports both main characters (with photos) and supporting characters (with or without photos)
  const handleGenerateCharacterSheet = useCallback(async (characterId: string) => {
    // Small delay to ensure React state has propagated from textarea onChange
    // This prevents race condition where user types description and immediately clicks generate
    await new Promise(resolve => setTimeout(resolve, 150))

    // Find character in unified list (AFTER delay to get latest state)
    const unifiedChar = allCharacters.find(c => c.id === characterId)
    if (!unifiedChar) {
      console.error('Character not found:', characterId)
      return
    }

    // Ensure recipes are loaded BEFORE setting generating state
    if (!recipesInitialized) {
      console.error('[CharacterStep] Recipe store not initialized yet')
      setErrorDialog({
        open: true,
        title: 'System Loading',
        message: 'Recipe system is still loading. Please wait a moment and try again.',
      })
      return
    }

    // CRITICAL: Validate that we have either photo(s) OR a description before generating
    const hasPhoto = (unifiedChar.sourcePhotoUrls?.filter(Boolean).length || 0) > 0
    const hasDescription = !!unifiedChar.description?.trim()

    // Clear previous validation errors for this character
    setDescriptionErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[characterId]
      return newErrors
    })

    if (!hasPhoto && !hasDescription) {
      console.error('[CharacterStep] Cannot generate without photo(s) or description')
      setDescriptionErrors(prev => ({
        ...prev,
        [characterId]: 'Description cannot be empty',
      }))
      setErrorDialog({
        open: true,
        title: 'Description Required',
        message: 'Please add reference photo(s) or a visual description before generating a character sheet.',
      })
      return
    }

    // Validate description format if no photo
    if (!hasPhoto && hasDescription) {
      const validationResult = validateCharacterDescription(unifiedChar.description || '')
      if (!validationResult.isValid) {
        setDescriptionErrors(prev => ({
          ...prev,
          [characterId]: validationResult.error || 'Invalid description',
        }))
        return
      }
    }

    setGeneratingCharacterId(characterId)

    try {

      const systemRecipes = getSystemOnlyRecipes()
      console.log(`[CharacterStep] Found ${systemRecipes.length} system-only recipes`)

      const styleGuideUrl = project?.style?.styleGuideUrl

      if (!styleGuideUrl) {
        console.error('[CharacterStep] Style guide is required for character sheet generation')
        setErrorDialog({
          open: true,
          title: 'Style Guide Required',
          message: 'Please select an art style first (Step 7) before generating character sheets.',
        })
        setGeneratingCharacterId(null)
        return
      }

      // Check for photos (support multiple)
      const photoUrls = unifiedChar.sourcePhotoUrls?.filter(Boolean) || []
      const hasPhotos = photoUrls.length > 0

      // Choose recipe based on whether we have photo(s)
      const recipeName = hasPhotos
        ? 'Storybook Character Sheet'  // 3-stage: isolate → stylize → sheet
        : 'Storybook Character Sheet (From Description)'  // 2-stage: generate from description → sheet

      const recipe = systemRecipes.find(r => r.name === recipeName)
      if (!recipe) {
        console.error(`[CharacterStep] Recipe not found: ${recipeName}`)
        setErrorDialog({
          open: true,
          title: 'Recipe Not Found',
          message: `Character sheet recipe "${recipeName}" not found. Please refresh the page and try again.`,
        })
        setGeneratingCharacterId(null)
        return
      }

      // Get or extract character description for description-based generation
      let characterDescription = unifiedChar.description || ''
      if (!hasPhoto && !characterDescription) {
        // Extract description from story text
        console.log('[CharacterStep] Extracting character description from story...')
        try {
          const storyText = project?.storyText || project?.generatedStory?.pages.map(p => p.text).join('\n\n') || ''
          const response = await fetch('/api/storybook/extract-character-description', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              characterName: unifiedChar.name,
              storyText,
              role: unifiedChar.role,
            })
          })
          if (response.ok) {
            const data = await response.json()
            characterDescription = data.description || `A ${unifiedChar.role || 'character'} named ${unifiedChar.name}`
            console.log('[CharacterStep] Extracted description:', characterDescription)
          }
        } catch (err) {
          console.error('Error extracting character description:', err)
          characterDescription = `A ${unifiedChar.role || 'character'} named ${unifiedChar.name}`
        }
      }

      // Build field values
      const fieldValues: Record<string, string> = {
        CHARACTER_NAME: unifiedChar.tag.replace('@', '') || unifiedChar.name.replace(/\s+/g, ''),
        STYLE_NAME: project?.style?.name || 'illustrated',
      }

      // Add outfit description if provided
      if (unifiedChar.outfitDescription?.trim()) {
        fieldValues.OUTFIT_DESCRIPTION = unifiedChar.outfitDescription.trim()
      }

      // Add description fields for description-based recipe
      if (!hasPhotos) {
        fieldValues.CHARACTER_ROLE = unifiedChar.role || 'character'
        // Combine appearance description with outfit if both exist
        const baseDescription = characterDescription
        const outfitPart = unifiedChar.outfitDescription?.trim()
          ? `, wearing ${unifiedChar.outfitDescription.trim()}`
          : ''
        fieldValues.CHARACTER_DESCRIPTION = baseDescription + outfitPart
      }

      // Build stage reference images
      let stageReferenceImages: string[][]
      if (hasPhotos) {
        // Photo-based: Stage 0 = ALL photos (1-3), Stage 1 = style guide, Stage 2 = template
        stageReferenceImages = [
          photoUrls, // All reference photos for better likeness
          [styleGuideUrl],
          [SYSTEM_TEMPLATES.characterSheet.advanced],
        ]
      } else {
        // Description-based: Stage 0 = style guide, Stage 1 = template
        stageReferenceImages = [
          [styleGuideUrl],
          [SYSTEM_TEMPLATES.characterSheet.advanced],
        ]
      }

      console.log('[CharacterStep] Recipe execution:', {
        recipeName: recipe.name,
        hasPhotos,
        photoCount: photoUrls.length,
        outfitDescription: unifiedChar.outfitDescription || '(none)',
        fieldValues,
        stageRefs: stageReferenceImages.map((refs, i) => `Stage ${i}: ${refs.length} refs`),
      })

      const result = await executeSystemRecipe(
        recipeName,
        fieldValues,
        stageReferenceImages,
        {
          model: 'nano-banana-pro',
          aspectRatio: '21:9',
        }
      )

      if (result.success && result.finalImageUrl) {
        // Update the appropriate store based on character type
        if (unifiedChar.isSupporting) {
          updateSupportingCharacter(characterId, { characterSheetUrl: result.finalImageUrl })
        } else {
          updateCharacter(characterId, { characterSheetUrl: result.finalImageUrl })
        }
        console.log('[CharacterStep] Recipe generation succeeded:', result.finalImageUrl)
      } else {
        console.error('[CharacterStep] Recipe generation failed:', result.error)
        setErrorDialog({
          open: true,
          title: 'Generation Failed',
          message: `Character sheet generation failed: ${result.error || 'Unknown error'}. Please try again.`,
        })
      }
    } finally {
      setGeneratingCharacterId(null)
    }
  }, [allCharacters, project, getSystemOnlyRecipes, executeSystemRecipe, updateCharacter, updateSupportingCharacter, recipesInitialized])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Auto-detect Button */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          onClick={async () => {
            setIsDetecting(true)
            try {
              const response = await fetch('/api/storybook/detect-characters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyText: project?.storyText || '' })
              })
              if (response.ok) {
                const data = await response.json()
                if (data.characters?.length > 0) {
                  data.characters.forEach((c: { name: string; tag: string; role: string; description?: string }) => {
                    if (c.role === 'supporting') {
                      // Add supporting characters to storyCharacters array
                      addStoryCharacter({
                        name: c.name,
                        role: 'other', // CharacterRole type for store
                        description: c.description || '',
                      })
                    } else {
                      // Add main characters to characters array
                      addCharacter(c.name, c.tag)
                    }
                  })
                }
              }
            } catch (err) {
              console.error('Error detecting characters:', err)
              detectCharacters() // Fallback
            } finally {
              setIsDetecting(false)
            }
          }}
          disabled={isDetecting || !project?.storyText}
          className="gap-2"
        >
          {isDetecting ? (
            <>
              <LoadingSpinner size="sm" color="current" />
              Detecting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Detect Characters from Story
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleAddCharacter}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Character
        </Button>
      </div>

      {/* Character List - includes both main and supporting characters */}
      {allCharacters.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-500">
              No characters yet. Add characters or use @mentions in your story to auto-detect them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allCharacters.map((character) => (
            <Card
              key={character.id}
              className={cn(
                "bg-zinc-900/50 border-zinc-800",
                character.isSupporting && "border-l-4 border-l-purple-500/50"
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {character.isSupporting ? (
                      <UserCircle className="w-4 h-4 text-purple-400" />
                    ) : (
                      <User className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-amber-400">{character.tag}</span>
                    {character.isSupporting && (
                      <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/50">
                        {character.role || 'Supporting'}
                      </Badge>
                    )}
                  </span>
                  {!character.isSupporting && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCharacter(character.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Input - only for main characters */}
                {!character.isSupporting && (
                  <div className="space-y-2">
                    <Label htmlFor={`name-${character.id}`}>Display Name</Label>
                    <Input
                      id={`name-${character.id}`}
                      value={character.name}
                      onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                      className="bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                )}

                {/* Supporting character info */}
                {character.isSupporting && character.description && (
                  <div className="text-sm text-zinc-400 italic">
                    &ldquo;{character.description}&rdquo;
                  </div>
                )}

                {/* Hidden file inputs for each photo slot */}
                {[0, 1, 2].map(slotIndex => (
                  <input
                    key={`file-${character.id}-${slotIndex}`}
                    ref={(el) => { fileInputRefs.current[`${character.id}-${slotIndex}`] = el }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(character.id, e, slotIndex)}
                  />
                ))}

                {/* Source Photos Upload (1-3 photos) */}
                <div className="space-y-2">
                  <Label>
                    Reference Photos
                    <span className="text-xs text-zinc-500 ml-2">
                      {character.isSupporting
                        ? "(optional - upload 1-3 photos or use description)"
                        : "(upload 1-3 photos for better likeness)"}
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    {[0, 1, 2].map(slotIndex => {
                      const photoUrl = character.sourcePhotoUrls?.[slotIndex]
                      return (
                        <div
                          key={slotIndex}
                          className={cn(
                            "relative aspect-square w-20 rounded-lg overflow-hidden cursor-pointer transition-colors",
                            photoUrl
                              ? "border border-zinc-700 hover:border-amber-500/50"
                              : "border-2 border-dashed border-zinc-700 hover:border-amber-500/50",
                            uploadingCharacterId === character.id && "opacity-50 pointer-events-none"
                          )}
                          onClick={() => fileInputRefs.current[`${character.id}-${slotIndex}`]?.click()}
                        >
                          {photoUrl ? (
                            <>
                              <Image
                                src={photoUrl}
                                alt={`${character.name} photo ${slotIndex + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="text-xs text-white">Change</span>
                              </div>
                              {slotIndex === 0 && (
                                <div className="absolute bottom-0 left-0 right-0 bg-amber-500/80 text-black text-[10px] text-center py-0.5">
                                  Main
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-1">
                              {uploadingCharacterId === character.id ? (
                                <LoadingSpinner size="sm" color="muted" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-zinc-500" />
                                  <span className="text-[10px] text-zinc-500">
                                    {slotIndex === 0 ? 'Main' : `+${slotIndex + 1}`}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Multiple angles help capture likeness. First photo is primary reference.
                  </p>
                </div>

                {/* Outfit Description Field */}
                <div className="space-y-2">
                  <Label htmlFor={`outfit-${character.id}`}>
                    Outfit / Costume
                    <span className="text-xs text-zinc-500 ml-2">(what they wear in the book)</span>
                  </Label>
                  <Input
                    id={`outfit-${character.id}`}
                    placeholder="e.g., blue superhero cape, red mask, yellow boots"
                    value={character.outfitDescription || ''}
                    onChange={(e) => {
                      if (character.isSupporting) {
                        updateSupportingCharacter(character.id, { description: e.target.value })
                      } else {
                        updateCharacter(character.id, { outfitDescription: e.target.value })
                      }
                    }}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>

                {/* Description Input - for all characters (especially when no photo) */}
                <div className="space-y-2">
                  <Label>
                    Visual Description
                    <span className="text-xs text-zinc-500 ml-2">(optional - AI can enhance your hints)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="age, gender, ethnicity, hair, outfit, key feature&#10;&#10;Examples:&#10;• 8-year-old boy, Latino, messy brown hair, red hoodie, missing front tooth&#10;• elderly Asian grandmother, silver bun, round glasses, floral apron&#10;• young Black girl, poofy afro puffs, yellow sundress, bright curious eyes"
                      value={character.description || ''}
                      onChange={(e) => {
                        const charId = character.id
                        const desc = e.target.value
                        // Clear validation error when user types
                        if (descriptionErrors[charId]) {
                          setDescriptionErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors[charId]
                            return newErrors
                          })
                        }
                        if (character.isSupporting) {
                          // Update supporting character description
                          const sc = project?.storyCharacters?.find(c => c.id === charId)
                          if (sc) {
                            updateProject({
                              storyCharacters: project?.storyCharacters?.map(c =>
                                c.id === charId ? { ...c, description: desc } : c
                              )
                            })
                          }
                        } else {
                          // Update main character description
                          updateCharacter(charId, { description: desc })
                        }
                      }}
                      rows={4}
                      className={cn(
                        "text-sm flex-1 placeholder:text-zinc-600",
                        descriptionErrors[character.id] && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnhanceDescription(character.id)}
                      disabled={!character.description?.trim() || (isEnhancing && enhancingCharacterId === character.id)}
                      className="h-auto py-2"
                      title="AI will expand your hints into a detailed visual description"
                    >
                      {isEnhancing && enhancingCharacterId === character.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-1" />
                          Enhance
                        </>
                      )}
                    </Button>
                  </div>
                  {descriptionErrors[character.id] ? (
                    <p className="text-xs text-red-500">{descriptionErrors[character.id]}</p>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      {!character.sourcePhotoUrl && !character.description ? (
                        <span className="text-amber-500/80">
                          ✓ Good: &quot;7yo girl, Asian, pigtails, pink tutu&quot; — ✗ Avoid: &quot;a nice friendly child&quot;
                        </span>
                      ) : (
                        <span>Click Enhance to expand your hints into a detailed visual description</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Character Sheet Preview */}
                <div className="space-y-2">
                  <Label>Character Sheet</Label>
                  {character.characterSheetUrl ? (
                    <div className="relative aspect-[21/9] rounded-lg overflow-hidden border border-amber-500/50">
                      <Image
                        src={character.characterSheetUrl}
                        alt={`${character.name} character sheet`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "aspect-[21/9] rounded-lg border border-zinc-700 bg-zinc-800/30",
                        "flex flex-col items-center justify-center gap-2"
                      )}
                    >
                      {generatingCharacterId === character.id && isGenerating ? (
                        <>
                          <LoadingSpinner size="lg" />
                          <span className="text-sm text-amber-400">{progress || 'Generating...'}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-zinc-600" />
                          <span className="text-sm text-zinc-500">
                            {(character.sourcePhotoUrls?.filter(Boolean).length || 0) > 0
                              ? `Ready to generate from ${character.sourcePhotoUrls?.filter(Boolean).length} photo(s)`
                              : character.description
                                ? 'Ready to generate from description'
                                : 'Add photo(s) or description above'}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Error message */}
                {generatingCharacterId === character.id && error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}

                {/* Generate Button - all characters can generate with photo OR description */}
                <Button
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={isGenerating && generatingCharacterId === character.id}
                  onClick={() => handleGenerateCharacterSheet(character.id)}
                >
                  {generatingCharacterId === character.id && isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" color="current" />
                      Generating...
                    </>
                  ) : character.characterSheetUrl ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate Character Sheet
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {(character.sourcePhotoUrls?.filter(Boolean).length || 0) > 0
                        ? `Generate from ${character.sourcePhotoUrls?.filter(Boolean).length} Photo(s)`
                        : 'Generate from Description'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="text-center text-sm text-zinc-500">
        <p>
          Character sheets include full-body views, expressions (neutral, happy, sad, angry, surprised, speaking, shouting, whispering), and accessories.
        </p>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        title={errorDialog.title}
        message={errorDialog.message}
        variant="error"
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
      />
    </div>
  )
}
