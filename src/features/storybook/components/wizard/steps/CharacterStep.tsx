"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { useRecipeExecution } from "@/features/shared/hooks/useRecipeExecution"
import { useRecipeStore } from "@/features/shot-creator/store/recipe.store"
import { SYSTEM_TEMPLATES } from "../../../services/template.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Upload, Sparkles, Trash2, User, ImageIcon, UserCircle } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/utils/utils"
import Image from "next/image"
import { compressImage } from "@/utils/image-compression"
import { StoryCharacter } from "../../../types/storybook.types"

// Unified character type for display (combines main and supporting characters)
interface UnifiedCharacter {
  id: string
  name: string
  tag: string
  sourcePhotoUrl?: string
  characterSheetUrl?: string
  isSupporting: boolean
  role?: string
  description?: string
}

export function CharacterStep() {
  const {
    project,
    addCharacter,
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
      characterSheetUrl: c.characterSheetUrl,
      isSupporting: false,
    }))

    const supportChars: UnifiedCharacter[] = (project?.storyCharacters || []).map(sc => ({
      id: sc.id,
      name: sc.name,
      tag: `@${sc.name.replace(/\s+/g, '')}`,
      sourcePhotoUrl: sc.photoUrl,
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

  // Legacy generation (fallback)
  const { generateCharacterSheet: legacyGenerateCharacterSheet, isGenerating: legacyIsGenerating, progress: legacyProgress, error: legacyError } = useStorybookGeneration()

  // Recipe-based generation (new)
  const { executeSystemRecipe, isExecuting: recipeIsExecuting, progress: recipeProgress, error: recipeError } = useRecipeExecution()
  const { getSystemOnlyRecipes } = useRecipeStore()

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
              data.characters.forEach((c: { name: string; tag: string }) => {
                addCharacter(c.name, c.tag)
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
  }, [project?.storyText, project?.generatedStory, project?.characters.length, addCharacter, detectCharacters, isDetecting])

  const handleAddCharacter = () => {
    const mainCharCount = project?.characters?.length || 0
    const name = `Character ${mainCharCount + 1}`
    addCharacter(name, `@${name.replace(/\s+/g, '')}`)
  }

  // Handle photo upload for a character
  const handlePhotoUpload = useCallback(async (characterId: string, file: File) => {
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

      // Update the character with the source photo URL
      updateCharacter(characterId, { sourcePhotoUrl: photoUrl })
    } catch (err) {
      console.error('Upload error:', err)
      alert(err instanceof Error ? err.message : 'Upload failed. Try a smaller image.')
    } finally {
      setUploadingCharacterId(null)
    }
  }, [updateCharacter])

  // Handle file input change
  const handleFileChange = useCallback((characterId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handlePhotoUpload(characterId, file)
    }
    // Reset the input so the same file can be selected again
    event.target.value = ''
  }, [handlePhotoUpload])

  // Trigger file input click
  const triggerFileUpload = useCallback((characterId: string) => {
    fileInputRefs.current[characterId]?.click()
  }, [])

  // Handle character sheet generation using recipe-based pipeline
  // Now supports both main characters (with photos) and supporting characters (with or without photos)
  const handleGenerateCharacterSheet = useCallback(async (characterId: string) => {
    // Find character in unified list
    const unifiedChar = allCharacters.find(c => c.id === characterId)
    if (!unifiedChar) {
      console.error('Character not found:', characterId)
      return
    }

    setGeneratingCharacterId(characterId)

    try {
      const systemRecipes = getSystemOnlyRecipes()
      const styleGuideUrl = project?.style?.styleGuideUrl

      if (!styleGuideUrl) {
        console.error('[CharacterStep] Style guide is required for character sheet generation')
        return
      }

      const hasPhoto = !!unifiedChar.sourcePhotoUrl

      // Choose recipe based on whether we have a photo
      const recipeName = hasPhoto
        ? 'Storybook Character Sheet'  // 3-stage: isolate → stylize → sheet
        : 'Storybook Character Sheet (From Description)'  // 2-stage: generate from description → sheet

      const recipe = systemRecipes.find(r => r.name === recipeName)
      if (!recipe) {
        console.error(`[CharacterStep] Recipe not found: ${recipeName}`)
        // Fall back to legacy for main characters only
        if (!unifiedChar.isSupporting) {
          const legacyResult = await legacyGenerateCharacterSheet(characterId)
          if (!legacyResult.success) {
            console.error('Legacy generation failed:', legacyResult.error)
          }
        }
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

      // Add description fields for description-based recipe
      if (!hasPhoto) {
        fieldValues.CHARACTER_ROLE = unifiedChar.role || 'character'
        fieldValues.CHARACTER_DESCRIPTION = characterDescription
      }

      // Build stage reference images
      let stageReferenceImages: string[][]
      if (hasPhoto) {
        // Photo-based: Stage 0 = photo, Stage 1 = style guide, Stage 2 = template
        stageReferenceImages = [
          [unifiedChar.sourcePhotoUrl!],
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
        hasPhoto,
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
        // Fall back to legacy for main characters only
        if (!unifiedChar.isSupporting) {
          console.log('[CharacterStep] Falling back to legacy generation')
          const legacyResult = await legacyGenerateCharacterSheet(characterId)
          if (!legacyResult.success) {
            console.error('Legacy generation also failed:', legacyResult.error)
          }
        }
      }
    } finally {
      setGeneratingCharacterId(null)
    }
  }, [allCharacters, project, getSystemOnlyRecipes, executeSystemRecipe, legacyGenerateCharacterSheet, updateCharacter, updateSupportingCharacter])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Users className="w-6 h-6 text-amber-400" />
          Create Characters
        </h2>
        <p className="text-zinc-400">
          Create character sheets for consistent illustrations. Upload photos or generate from scratch.
        </p>
      </div>

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
                  data.characters.forEach((c: { name: string; tag: string }) => {
                    addCharacter(c.name, c.tag)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Hidden file input */}
                <input
                  ref={(el) => { fileInputRefs.current[character.id] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(character.id, e)}
                />

                {/* Source Photo Upload - optional for supporting characters */}
                <div className="space-y-2">
                  <Label>
                    Source Photo
                    {character.isSupporting && (
                      <span className="text-xs text-zinc-500 ml-2">(optional - can generate from description)</span>
                    )}
                  </Label>
                  {character.sourcePhotoUrl ? (
                    <div
                      className="relative aspect-square w-32 rounded-lg overflow-hidden border border-zinc-700 cursor-pointer hover:border-amber-500/50 transition-colors"
                      onClick={() => triggerFileUpload(character.id)}
                    >
                      <Image
                        src={character.sourcePhotoUrl}
                        alt={`${character.name} source photo`}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-xs text-white">Change</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "aspect-square w-32 rounded-lg border-2 border-dashed border-zinc-700",
                        "flex flex-col items-center justify-center gap-1",
                        "hover:border-amber-500/50 transition-colors cursor-pointer",
                        uploadingCharacterId === character.id && "opacity-50 pointer-events-none"
                      )}
                      onClick={() => triggerFileUpload(character.id)}
                    >
                      {uploadingCharacterId === character.id ? (
                        <LoadingSpinner color="muted" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-zinc-500" />
                          <span className="text-xs text-zinc-500">Upload</span>
                        </>
                      )}
                    </div>
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
                            {character.sourcePhotoUrl
                              ? 'Ready to generate from photo'
                              : character.isSupporting
                                ? 'Ready to generate from description'
                                : 'Upload a photo first'}
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

                {/* Generate Button - supporting characters can generate without photo */}
                <Button
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={
                    (!character.sourcePhotoUrl && !character.isSupporting) ||
                    (isGenerating && generatingCharacterId === character.id)
                  }
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
                      {character.sourcePhotoUrl
                        ? 'Generate from Photo'
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
    </div>
  )
}
