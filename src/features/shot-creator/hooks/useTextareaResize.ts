import { useState, useRef, useCallback } from 'react'

export type TextareaSize = 'small' | 'large'

/**
 * Hook for managing textarea drag-to-resize behavior, preset sizes, and height classes.
 *
 * Extracted from PromptActions to isolate resize UI logic.
 */
export function useTextareaResize() {
    // Textarea size state (preset toggle)
    const [textareaSize, setTextareaSize] = useState<TextareaSize>('small')

    // Drag resize state
    const [customHeight, setCustomHeight] = useState<number | null>(null)
    const isDraggingRef = useRef(false)
    const dragStartYRef = useRef(0)
    const dragStartHeightRef = useRef(0)

    /**
     * Get the Tailwind min-height class for the current preset size.
     * Returns empty string when a custom (drag) height is active.
     */
    const getTextareaHeight = useCallback((size: TextareaSize) => {
        if (customHeight !== null) return '' // custom height overrides preset
        switch (size) {
            case 'small': return 'min-h-[44px]'
            case 'large': return 'min-h-[240px]'
        }
    }, [customHeight])

    /**
     * Mouse-down handler for the drag-resize handle.
     * Attaches temporary mousemove/mouseup listeners on the document.
     */
    const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        isDraggingRef.current = true
        dragStartYRef.current = e.clientY
        const container = document.querySelector('[data-testid="prompt-textarea-container"]')
        if (container) {
            dragStartHeightRef.current = container.getBoundingClientRect().height
        }

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRef.current) return
            const delta = moveEvent.clientY - dragStartYRef.current
            const newHeight = Math.max(44, dragStartHeightRef.current + delta)
            setCustomHeight(newHeight)
        }

        const handleMouseUp = () => {
            isDraggingRef.current = false
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
    }, [])

    /**
     * Toggle between small/large presets, clearing any custom drag height.
     */
    const toggleSize = useCallback(() => {
        setCustomHeight(null)
        setTextareaSize(prev => prev === 'small' ? 'large' : 'small')
    }, [])

    return {
        customHeight,
        textareaSize,
        setTextareaSize,
        setCustomHeight,
        getTextareaHeight,
        handleResizeMouseDown,
        toggleSize,
    }
}
