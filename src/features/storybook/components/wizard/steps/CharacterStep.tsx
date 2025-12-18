"use client"

import { useEffect } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Plus, Upload, Sparkles, Trash2, User } from "lucide-react"
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

  // Auto-detect characters when step loads
  useEffect(() => {
    if (project?.storyText && project.characters.length === 0) {
      detectCharacters()
    }
  }, [project?.storyText, project?.characters.length, detectCharacters])

  const characters = project?.characters || []

  const handleAddCharacter = () => {
    const name = `Character ${characters.length + 1}`
    addCharacter(name, `@${name.replace(/\s+/g, '')}`)
  }

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
          onClick={detectCharacters}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Detect Characters from Story
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

                {/* Character Sheet Preview / Upload */}
                <div className="space-y-2">
                  <Label>Character Sheet</Label>
                  {character.characterSheetUrl ? (
                    <div className="relative aspect-[21/9] rounded-lg overflow-hidden border border-zinc-700">
                      <Image
                        src={character.characterSheetUrl}
                        alt={character.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "aspect-[21/9] rounded-lg border-2 border-dashed border-zinc-700",
                        "flex flex-col items-center justify-center gap-2",
                        "hover:border-amber-500/50 transition-colors cursor-pointer"
                      )}
                    >
                      <Upload className="w-8 h-8 text-zinc-500" />
                      <span className="text-sm text-zinc-500">Upload photo or character sheet</span>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={!character.sourcePhotoUrl && !character.characterSheetUrl}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Character Sheet
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
