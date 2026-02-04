'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Palette, User } from 'lucide-react'
import { useShotCreatorSettings } from '../../hooks'
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

  const toggleMode = (mode: 'style-transfer' | 'character-sheet') => {
    const currentMode = settings.quickMode || 'none'
    const newMode: QuickMode = currentMode === mode ? 'none' : mode

    // Update quick mode setting
    updateSettings({ quickMode: newMode })

    // Show helpful toast for each mode
    if (newMode === 'character-sheet') {
      toast.success('Character Sheet mode ON - Add an image OR type a description, then Generate')
    } else if (newMode === 'style-transfer') {
      toast.success('Style Sheet mode ON - Add reference image + type "Style Name:" (e.g. "Noir Grit:")')
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
            <p>Style Sheet</p>
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
