'use client'

import { useState, useCallback } from 'react'
import { useStoryboardStore } from '../../store'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useCanvasImport() {
    const { generatedPrompts, setGeneratedPrompts, setGeneratedImage } = useStoryboardStore()
    const [isImporting, setIsImporting] = useState(false)

    const importFile = useCallback(async (file: File, insertAfterSequence?: number) => {
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Only JPEG, PNG, and WebP images are supported')
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
            return
        }

        setIsImporting(true)

        try {
            // Upload to Supabase via API
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload-file', {
                method: 'POST',
                body: formData,
            })

            const data = await safeJsonParse<{ url: string; error?: string }>(response)

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed')
            }

            // Create a new prompt entry for the imported image
            const maxSequence = generatedPrompts.length > 0
                ? Math.max(...generatedPrompts.map(p => p.sequence))
                : 0
            const newSequence = maxSequence + 1

            const newPrompt = {
                sequence: newSequence,
                originalText: '[Imported image]',
                prompt: `Imported: ${file.name}`,
                shotType: 'medium' as const,
                characterRefs: [],
                edited: false,
                imageUrl: data.url,
            }

            // Insert at position or append
            if (insertAfterSequence !== undefined) {
                const insertIndex = generatedPrompts.findIndex(p => p.sequence === insertAfterSequence)
                const updated = [...generatedPrompts]
                updated.splice(insertIndex + 1, 0, newPrompt)
                setGeneratedPrompts(updated)
            } else {
                setGeneratedPrompts([...generatedPrompts, newPrompt])
            }

            // Also register the image in generatedImages
            setGeneratedImage(newSequence, {
                predictionId: `import-${Date.now()}`,
                imageUrl: data.url,
                status: 'completed',
            })

            toast.success(`Imported ${file.name}`)
        } catch (err) {
            logger.storyboard.error('Import failed', { error: err instanceof Error ? err.message : String(err) })
            toast.error(err instanceof Error ? err.message : 'Failed to import image')
        } finally {
            setIsImporting(false)
        }
    }, [generatedPrompts, setGeneratedPrompts, setGeneratedImage])

    const handleFileDrop = useCallback((e: React.DragEvent, insertAfterSequence?: number) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files)
        const imageFile = files.find(f => ALLOWED_TYPES.includes(f.type))
        if (imageFile) {
            importFile(imageFile, insertAfterSequence)
        }
    }, [importFile])

    return {
        isImporting,
        importFile,
        handleFileDrop,
    }
}
