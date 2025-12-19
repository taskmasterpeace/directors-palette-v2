"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { useStorybookGeneration } from "../../../hooks/useStorybookGeneration"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Plus, Upload, Sparkles, Trash2, User, Loader2, ImageIcon } from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"

export function CharacterStep() {
  const {
    project,
    addCharacter,
    removeCharacter,
    updateCharacter,
    detectCharacters,
  } = useStorybookStore()

  const { generateCharacterSheet, isGenerating, progress, error } = useStorybookGeneration()

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
      if (project?.storyText && project.characters.length === 0 && !isDetecting) {
        setIsDetecting(true)
        try {
          const response = await fetch('/api/storybook/detect-characters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyText: project.storyText })
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
  }, [project?.storyText, project?.characters.length, addCharacter, detectCharacters, isDetecting])

  const characters = project?.characters || []

  const handleAddCharacter = () => {
    const name = `Character ${characters.length + 1}`
    addCharacter(name, `@${name.replace(/\s+/g, '')}`)
  }

  // Handle photo upload for a character
  const handlePhotoUpload = useCallback(async (characterId: string, file: File) => {
    setUploadingCharacterId(characterId)

    try {
      // Create a FormData object to upload the image
      const formData = new FormData()
      formData.append('file', file)

      // Upload to our upload endpoint
      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload photo')
      }

      const data = await response.json()
      const photoUrl = data.url

      // Update the character with the source photo URL
      updateCharacter(characterId, { sourcePhotoUrl: photoUrl })
    } catch (err) {
      console.error('Error uploading photo:', err)
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

  // Handle character sheet generation
  const handleGenerateCharacterSheet = useCallback(async (characterId: string) => {
    setGeneratingCharacterId(characterId)

    try {
      const result = await generateCharacterSheet(characterId)
      if (!result.success) {
        console.error('Generation failed:', result.error)
      }
    } finally {
      setGeneratingCharacterId(null)
    }
  }, [generateCharacterSheet])

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
              <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Character List */}
      {characters.length === 0 ? (
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
          {characters.map((character) => (
            <Card
              key={character.id}
              className="bg-zinc-900/50 border-zinc-800"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-amber-400">{character.tag}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCharacter(character.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor={`name-${character.id}`}>Display Name</Label>
                  <Input
                    id={`name-${character.id}`}
                    value={character.name}
                    onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700"
                  />
                </div>

                {/* Hidden file input */}
                <input
                  ref={(el) => { fileInputRefs.current[character.id] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(character.id, e)}
                />

                {/* Source Photo Upload */}
                <div className="space-y-2">
                  <Label>Source Photo</Label>
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
                        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
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
                          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                          <span className="text-sm text-amber-400">{progress || 'Generating...'}</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-zinc-600" />
                          <span className="text-sm text-zinc-500">
                            {character.sourcePhotoUrl
                              ? 'Ready to generate'
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

                {/* Generate Button */}
                <Button
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={!character.sourcePhotoUrl || (isGenerating && generatingCharacterId === character.id)}
                  onClick={() => handleGenerateCharacterSheet(character.id)}
                >
                  {generatingCharacterId === character.id && isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
                      Generate Character Sheet
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
