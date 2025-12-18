"use client"

import { useState } from "react"
import { useStorybookStore } from "../../../store/storybook.store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Palette, Check, Plus } from "lucide-react"
import { cn } from "@/utils/utils"
import Image from "next/image"

// Preset styles (can be expanded)
const PRESET_STYLES = [
  {
    id: 'watercolor',
    name: 'Watercolor',
    preview: '/storybook/step-style.webp', // Placeholder
    description: 'Soft, dreamy watercolor illustrations',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    preview: '/storybook/step-characters.webp', // Placeholder
    description: 'Fun, vibrant cartoon style',
  },
  {
    id: 'storybook',
    name: 'Classic Storybook',
    preview: '/storybook/step-pages.webp', // Placeholder
    description: 'Traditional children\'s book illustration',
  },
  {
    id: 'pixar',
    name: '3D Animated',
    preview: '/storybook/step-preview.webp', // Placeholder
    description: 'Pixar-style 3D rendering',
  },
]

export function StyleSelectionStep() {
  const { project, setStyle } = useStorybookStore()
  const [selectedStyleId, setSelectedStyleId] = useState(project?.style?.presetId || '')

  const handleSelectStyle = (style: typeof PRESET_STYLES[0]) => {
    setSelectedStyleId(style.id)
    setStyle({
      id: style.id,
      name: style.name,
      isPreset: true,
      presetId: style.id,
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Palette className="w-6 h-6 text-amber-400" />
          Choose Your Style
        </h2>
        <p className="text-zinc-400">
          Select an art style for your illustrations. This will be applied to all pages.
        </p>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PRESET_STYLES.map((style) => (
          <Card
            key={style.id}
            className={cn(
              "cursor-pointer transition-all hover:scale-105",
              "bg-zinc-900/50 border-zinc-800 overflow-hidden",
              selectedStyleId === style.id && "ring-2 ring-amber-500 border-amber-500"
            )}
            onClick={() => handleSelectStyle(style)}
          >
            <div className="relative aspect-video">
              <Image
                src={style.preview}
                alt={style.name}
                fill
                className="object-cover"
              />
              {selectedStyleId === style.id && (
                <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                  <div className="bg-amber-500 rounded-full p-2">
                    <Check className="w-6 h-6 text-black" />
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold text-white">{style.name}</h3>
              <p className="text-xs text-zinc-400 mt-1">{style.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Style Button */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Custom Style
        </Button>
      </div>

      {/* Selected Style Info */}
      {selectedStyleId && (
        <div className="text-center text-sm text-zinc-400">
          Selected: <span className="text-amber-400 font-medium">
            {PRESET_STYLES.find(s => s.id === selectedStyleId)?.name}
          </span>
        </div>
      )}
    </div>
  )
}
