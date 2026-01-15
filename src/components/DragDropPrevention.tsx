'use client'

import { useEffect } from 'react'

/**
 * Prevents browser from opening dropped files while allowing marked drop zones to work.
 * Drop zones must have data-drop-zone="true" attribute to be exempted from prevention.
 */
export function DragDropPrevention() {
    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            // Check if we're over a drop zone (or any of its children)
            const target = e.target as HTMLElement
            const isOverDropZone = target.closest('[data-drop-zone="true"]')

            // Only prevent default if NOT over a drop zone
            if (!isOverDropZone) {
                e.preventDefault()
                e.dataTransfer!.dropEffect = 'none'
            }
        }

        const handleDrop = (e: DragEvent) => {
            // Check if we're over a drop zone
            const target = e.target as HTMLElement
            const isOverDropZone = target.closest('[data-drop-zone="true"]')

            // Only prevent default if NOT over a drop zone
            if (!isOverDropZone) {
                e.preventDefault()
                e.stopPropagation()
            }
        }

        // Use capture phase to intercept events before they reach react-dropzone
        // But only prevent them if NOT over a drop zone
        document.addEventListener('dragover', handleDragOver, false)
        document.addEventListener('drop', handleDrop, false)

        return () => {
            document.removeEventListener('dragover', handleDragOver, false)
            document.removeEventListener('drop', handleDrop, false)
        }
    }, [])

    return null
}
