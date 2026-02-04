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

const CHARACTER_TURNAROUND_RECIPE_NAME = 'Character Turnaround'

export function QuickModeIcons() {
  const { settings, updateSettings } = useShotCreatorSettings()
  const { recipes, setActiveRecipe } = useRecipeStore()

  const toggleMode = (mode: 'style-transfer' | 'character-sheet') => {
    const currentMode = settings.quickMode || 'none'
    const newMode: QuickMode = currentMode === mode ? 'none' : mode

    // Update quick mode setting
    updateSettings({ quickMode: newMode })

    // Character sheet mode activates the Character Turnaround recipe
    if (newMode === 'character-sheet') {
      // Find the Character Turnaround recipe by name
      console.log('[QuickModeIcons] Looking for recipe:', CHARACTER_TURNAROUND_RECIPE_NAME)
      console.log('[QuickModeIcons] Available recipes:', recipes.map(r => r.name))

      const turnaroundRecipe = recipes.find(
        (r) => r.name === CHARACTER_TURNAROUND_RECIPE_NAME
      )
      if (turnaroundRecipe) {
        console.log('[QuickModeIcons] Found recipe, activating:', turnaroundRecipe.id)
        setActiveRecipe(turnaroundRecipe.id)
        toast.success('Character Turnaround recipe activated')
      } else {
        console.error('[QuickModeIcons] Recipe not found! Please refresh the page.')
        toast.error('Character Turnaround recipe not found. Please refresh the page.')
      }
    } else if (mode === 'character-sheet' && newMode === 'none') {
      // Turning off character sheet mode - clear recipe
      setActiveRecipe(null)
    }

    // Style transfer mode: if turning on with 2+ images, auto-enable anchor transform
    if (newMode === 'style-transfer') {
      // This will be handled in PromptActions based on image count
    }
  }

  const quickMode = settings.quickMode || 'none'

  return (
    <TooltipProvider>
      <div className="flex gap-1">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={quickMode === 'style-transfer' ? 'default' : 'ghost'}
              onClick={() => toggleMode('style-transfer')}
              className="h-7 w-7 p-0"
            >
              <Palette className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Style Transfer</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={quickMode === 'character-sheet' ? 'default' : 'ghost'}
              onClick={() => toggleMode('character-sheet')}
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
