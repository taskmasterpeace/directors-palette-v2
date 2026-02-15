'use client'

import { useState } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useStoryboardStore } from '../../store'

export function useCanvasDragDrop() {
    const { generatedPrompts, setGeneratedPrompts } = useStoryboardStore()
    const [activeId, setActiveId] = useState<number | null>(null)

    const handleDragStart = (event: { active: { id: string | number } }) => {
        setActiveId(Number(event.active.id))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)

        if (!over || active.id === over.id) return

        const oldIndex = generatedPrompts.findIndex(p => p.sequence === Number(active.id))
        const newIndex = generatedPrompts.findIndex(p => p.sequence === Number(over.id))

        if (oldIndex === -1 || newIndex === -1) return

        const reordered = arrayMove(generatedPrompts, oldIndex, newIndex)
        setGeneratedPrompts(reordered)
    }

    const handleDragCancel = () => {
        setActiveId(null)
    }

    return {
        activeId,
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
    }
}
