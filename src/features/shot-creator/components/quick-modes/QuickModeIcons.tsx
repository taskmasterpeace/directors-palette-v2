'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Palette, User } from 'lucide-react'
import { useShotCreatorSettings } from '../../hooks'
import { useRecipeStore } from '../../store/recipe.store'
import type { QuickMode } from '../../types/shot-creator.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

export function QuickModeIcons() {
  const { settings, updateSettings } = useShotCreatorSettings()
  const { recipes, activeRecipeId, setActiveRecipe } = useRecipeStore()

  const toggleStyleMode = () => {
    const currentMode = settings.quickMode || 'none'
    const newMode: QuickMode = currentMode === 'style-transfer' ? 'none' : 'style-transfer'
    updateSettings({ quickMode: newMode })
    if (newMode === 'style-transfer') {
      toast.success('Style Sheet mode ON - Add reference image + type "Style Name:" (e.g. "Noir Grit:")')
    }
  }

  const toggleCharacterSheet = () => {
    // Find the Character Sheet recipe by name
    const charSheetRecipe = recipes.find(r =>
      r.name.toLowerCase() === 'character sheet'
    )

    if (charSheetRecipe) {
      if (activeRecipeId === charSheetRecipe.id) {
        // Deactivate if already active
        setActiveRecipe(null)
      } else {
        // Activate the Character Sheet recipe
        setActiveRecipe(charSheetRecipe.id)
        // Turn off any quick mode
        updateSettings({ quickMode: 'none' })
      }
    } else {
      // Fallback to old quick mode if recipe not found
      const currentMode = settings.quickMode || 'none'
      const newMode: QuickMode = currentMode === 'character-sheet' ? 'none' : 'character-sheet'
      updateSettings({ quickMode: newMode })
      if (newMode === 'character-sheet') {
        toast.success('Character Sheet mode ON - Add an image OR type a description, then Generate')
      }
    }
  }

  const quickMode = settings.quickMode || 'none'
  const charSheetRecipe = recipes.find(r => r.name.toLowerCase() === 'character sheet')
  const isCharSheetActive = charSheetRecipe ? activeRecipeId === charSheetRecipe.id : quickMode === 'character-sheet'

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={quickMode === 'style-transfer' ? 'default' : 'ghost'}
              onClick={toggleStyleMode}
              className="h-7 w-7 p-0"
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Style Sheet</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={isCharSheetActive ? 'default' : 'ghost'}
              onClick={toggleCharacterSheet}
              className="h-7 w-7 p-0"
            >
              <User className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Character Sheet</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export default QuickModeIcons
