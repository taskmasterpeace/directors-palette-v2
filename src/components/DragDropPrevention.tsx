'use client'

import { useEffect } from 'react'

/**
 * Prevents browser from opening dropped files while allowing marked drop zones to work.
 * Drop zones must have data-drop-zone="true" attribute to be exempted from prevention.
 */
export function DragDropPrevention() {
    useEffect(() => {
        const preventDefault = (e: DragEvent) => {
            // Only prevent default if NOT over a drop zone
            const target = e.target as HTMLElement
            if (!target.closest('[data-drop-zone="true"]')) {
                e.preventDefault()
            }
        }

        // Prevent default on document to stop browser from opening files
        document.addEventListener('dragover', preventDefault, false)
        document.addEventListener('drop', preventDefault, false)

        return () => {
            document.removeEventListener('dragover', preventDefault)
            document.removeEventListener('drop', preventDefault)
        }
    }, [])

    return null
}
