'use client'

/**
 * Wardrobe Look Card (Simplified)
 * 
 * Displays a wardrobe look with image and name.
 * Follows same pattern as PresetStyleSelector cards.
 */

import { Check, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/utils'
import type { WardrobeLook } from '../types/wardrobe.types'

interface WardrobeLookCardProps {
    look: WardrobeLook
    isSelected?: boolean
    onSelect?: () => void
    onDelete?: () => void
    showDelete?: boolean
}

export function WardrobeLookCard({
    look,
    isSelected = false,
    onSelect,
    onDelete,
    showDelete = false
}: WardrobeLookCardProps) {
    return (
        <Card
            className={cn(
                'relative overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                isSelected && 'ring-2 ring-primary'
            )}
            onClick={onSelect}
        >
            {/* Image */}
            <div className="aspect-[3/4] bg-muted relative">
                {look.imagePath ? (
                    <img
                        src={look.imagePath}
                        alt={look.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <span className="text-2xl font-bold text-muted-foreground/30">
                            {look.name.charAt(0)}
                        </span>
                    </div>
                )}

                {/* Selected */}
                {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                    </div>
                )}

                {/* Source Badge */}
                {look.source === 'director-proposal' && (
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                        Director
                    </Badge>
                )}

                {/* Delete Button (for non-presets) */}
                {showDelete && look.source !== 'preset' && onDelete && (
                    <Button
                        size="icon"
                        variant="destructive"
                        className="absolute bottom-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                )}
            </div>

            <CardContent className="p-2">
                <p className="font-medium text-sm text-center truncate">{look.name}</p>
            </CardContent>
        </Card>
    )
}
