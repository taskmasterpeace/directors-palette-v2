'use client'

/**
 * Audio Uploader Component
 *
 * Drag-and-drop or file picker for audio upload.
 * Uses the shared DropZone component for consistent visual feedback.
 */

import { useState, useCallback } from 'react'
import { Music, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropZone } from '@/components/ui/drop-zone'
import { useMusicLabStore } from '../store/music-lab.store'

interface AudioUploaderProps {
    onUploadComplete?: (url: string, fileName: string) => void
}

// Accepted audio file types
const AUDIO_ACCEPT = {
    'audio/mpeg': ['.mp3'],
    'audio/mp3': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/x-m4a': ['.m4a'],
    'audio/m4a': ['.m4a'],
    'audio/aac': ['.aac'],
}

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

export function AudioUploader({ onUploadComplete }: AudioUploaderProps) {
    const { project, setAudioFile } = useMusicLabStore()
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleUpload = useCallback(async (file: File) => {
        setIsUploading(true)
        setError(null)

        try {
            // Upload to storage
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/music-lab/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Upload failed with status ${response.status}`)
            }

            const { url } = await response.json()

            setAudioFile(url, file.name)
            onUploadComplete?.(url, file.name)
        } catch (_err) {
            setError('Failed to upload audio file')
            // Error is already logged by the API layer
        } finally {
            setIsUploading(false)
        }
    }, [setAudioFile, onUploadComplete])

    const handleDropAccepted = useCallback((files: File[]) => {
        const file = files[0]
        if (file) {
            handleUpload(file)
        }
    }, [handleUpload])

    const handleRemove = () => {
        setAudioFile('', '')
        setError(null)
    }

    // Success state - audio file uploaded
    if (project.audioUrl) {
        return (
            <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <Music className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="font-medium">{project.audioFileName}</p>
                                <p className="text-sm text-muted-foreground">Audio uploaded</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRemove}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Upload state - DropZone for audio upload
    return (
        <div className="space-y-2">
            <DropZone
                accept={AUDIO_ACCEPT}
                maxFiles={1}
                maxSize={MAX_FILE_SIZE}
                multiple={false}
                onDropAccepted={handleDropAccepted}
                isUploading={isUploading}
                idleText="Drop your audio file here"
                dragText="Drop audio file..."
                acceptText="MP3, WAV, M4A, AAC • Max 50MB"
                uploadingText="Uploading..."
                rejectText="Please upload an audio file"
                disabled={isUploading}
                size="large"
            />

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    )
}