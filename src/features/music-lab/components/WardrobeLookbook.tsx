'use client'

/**
 * Wardrobe Selector (Simplified)
 * 
 * Grid of wardrobe looks for selection.
 * Follows same pattern as PresetStyleSelector.
 */

import { Shirt } from 'lucide-react'
import { WardrobeLookCard } from './WardrobeLookCard'
import { useWardrobeStore } from '../store/wardrobe.store'

interface WardrobeSelectorProps {
    onSelect?: (lookId: string | null) => void
}

export function WardrobeSelector({ onSelect }: WardrobeSelectorProps) {
    const { looks, selectedLookId, selectLook, removeLook } = useWardrobeStore()

    const handleSelect = (lookId: string) => {
        const newId = selectedLookId === lookId ? null : lookId
        selectLook(newId)
        onSelect?.(newId)
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Shirt className="w-4 h-4" />
                    Wardrobe
                </h3>
                {selectedLookId && (
                    <button
                        onClick={() => {
                            selectLook(null)
                            onSelect?.(null)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Clear selection
                    </button>
                )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {looks.map(look => (
                    <WardrobeLookCard
                        key={look.id}
                        look={look}
                        isSelected={look.id === selectedLookId}
                        onSelect={() => handleSelect(look.id)}
                        onDelete={() => removeLook(look.id)}
                        showDelete={look.source !== 'preset'}
                    />
                ))}
            </div>

            {selectedLookId && (
                <p className="text-xs text-muted-foreground">
                    Selected: {looks.find(l => l.id === selectedLookId)?.name}
                </p>
            )}
        </div>
    )
}
