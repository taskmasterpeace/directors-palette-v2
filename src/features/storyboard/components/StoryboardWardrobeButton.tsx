'use client'

/**
 * Storyboard Wardrobe Button
 * 
 * Button that opens the wardrobe selector in a popover.
 */

import { Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { WardrobeSelector } from '../../music-lab/components/WardrobeLookbook'
import { useWardrobeStore } from '../../music-lab/store/wardrobe.store'

interface StoryboardWardrobeButtonProps {
    onSelectLook?: (lookId: string | null) => void
    className?: string
}

export function StoryboardWardrobeButton({
    onSelectLook,
    className
}: StoryboardWardrobeButtonProps) {
    const { selectedLookId, looks } = useWardrobeStore()

    const selectedLook = selectedLookId ? looks.find(l => l.id === selectedLookId) : null

    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant={selectedLookId ? 'default' : 'outline'}
                            size="sm"
                            className={className}
                        >
                            <Shirt className="w-4 h-4 mr-2" />
                            {selectedLook ? selectedLook.name : 'Wardrobe'}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Select wardrobe look</p>
                </TooltipContent>
            </Tooltip>

            <PopoverContent className="w-80" align="start">
                <WardrobeSelector onSelect={onSelectLook} />
            </PopoverContent>
        </Popover>
    )
}
