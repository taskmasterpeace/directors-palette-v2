"use client"

import { useState, useRef } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Camera, X, ArrowRight, FileText } from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"

export function CharacterSetupStep() {
  const { project, setMainCharacter, nextStep, setStoryMode } = useStorybookStore()

  const [name, setName] = useState(project?.mainCharacterName || "")
  const [age, setAge] = useState<number>(project?.mainCharacterAge || 5)
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(project?.mainCharacterPhotoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ages = Array.from({ length: 11 }, (_, i) => i + 2) // Ages 2-12

  const handlePhotoUpload = async (file: File) => {
    setIsUploading(true)
    try {
      // Upload to Supabase storage
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setPhotoUrl(url)
      }
    } catch (error) {
      console.error("Failed to upload photo:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePhotoUpload(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoUrl(undefined)
  }

  const handleContinue = () => {
    if (name.trim()) {
      setMainCharacter(name.trim(), age, photoUrl)
      nextStep()
    }
  }

  const handlePasteMode = () => {
    setStoryMode("paste")
  }

  const isValid = name.trim().length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Who is your story about?</h2>
        <p className="text-muted-foreground">
          Create your main character. They&apos;ll be the star of your educational storybook!
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Photo Upload */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Photo Area */}
              <div
                className={cn(
                  "relative w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors",
                  photoUrl
                    ? "border-amber-500/50 bg-amber-500/5"
                    : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {photoUrl ? (
                  <>
                    <Image
                      src={photoUrl}
                      alt="Character photo"
                      fill
                      className="object-cover rounded-xl"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemovePhoto()
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </>
                ) : isUploading ? (
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <span className="text-xs text-muted-foreground block">(Optional)</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Name and Age */}
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="character-name" className="text-sm text-zinc-400">
                    Character Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="character-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter a name (e.g., Emma)"
                      className="pl-10 bg-zinc-800 border-zinc-700 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="character-age" className="text-sm text-zinc-400">
                    Character Age
                  </Label>
                  <Select
                    value={age.toString()}
                    onValueChange={(v) => setAge(parseInt(v))}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select age" />
                    </SelectTrigger>
                    <SelectContent>
                      {ages.map((a) => (
                        <SelectItem key={a} value={a.toString()}>
                          {a} years old
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Story content will be tailored to this age
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {name && (
          <div className="text-center p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
            <p className="text-lg">
              <span className="text-amber-400 font-semibold">{name}</span>
              <span className="text-muted-foreground">, {age} years old, is ready for an adventure!</span>
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handlePasteMode}
          className="text-muted-foreground hover:text-white gap-2"
        >
          <FileText className="w-4 h-4" />
          I have my own story
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!isValid}
          className="bg-amber-500 hover:bg-amber-600 text-black gap-2"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
