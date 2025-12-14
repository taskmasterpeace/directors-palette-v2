'use client'

/**
 * Organize Button
 * 
 * Button to trigger the Prompt Organizer modal.
 */

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PromptOrganizerModal } from './PromptOrganizerModal'

interface OrganizeButtonProps {
    prompt: string
    onApply: (newPrompt: string) => void
    disabled?: boolean
    variant?: 'icon' | 'default'
}

export function OrganizeButton({
    prompt,
    onApply,
    disabled = false,
    variant = 'icon'
}: OrganizeButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (variant === 'icon') {
        return (
            <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(true)}
                            disabled={disabled || !prompt.trim()}
                            className="text-muted-foreground hover:text-primary"
                        >
                            <Wand2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Organize Prompt</p>
                    </TooltipContent>
                </Tooltip>

                <PromptOrganizerModal
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    prompt={prompt}
                    onApply={onApply}
                />
            </>
        )
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(true)}
                disabled={disabled || !prompt.trim()}
            >
                <Wand2 className="w-4 h-4 mr-2" />
                Organize
            </Button>

            <PromptOrganizerModal
                open={isOpen}
                onOpenChange={setIsOpen}
                prompt={prompt}
                onApply={onApply}
            />
        </>
    )
}
