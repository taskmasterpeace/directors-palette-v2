'use client'

/**
 * Audio Uploader Component
 * 
 * Drag-and-drop or file picker for audio upload.
 */

import { useState, useCallback } from 'react'
import { Upload, Music, X, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMusicLabStore } from '../store/music-lab.store'

interface AudioUploaderProps {
    onUploadComplete?: (url: string, fileName: string) => void
}

export function AudioUploader({ onUploadComplete }: AudioUploaderProps) {
    const { project, setAudioFile } = useMusicLabStore()
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file) {
            await handleFile(file)
        }
    }, [])

    const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await handleFile(file)
        }
    }, [])

    const handleFile = async (file: File) => {
        // Validate file type
        const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
        if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac)$/i)) {
            setError('Please upload an audio file (MP3, WAV, M4A, or AAC)')
            return
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            setError('File size must be under 50MB')
            return
        }

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
        } catch (err) {
            setError('Failed to upload audio file')
            console.error('Upload error:', err)
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemove = () => {
        setAudioFile('', '')
        setError(null)
    }

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

    return (
        <div className="space-y-2">
            <Card
                className={`border-2 border-dashed transition-colors cursor-pointer ${isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <CardContent className="p-8">
                    <label className="flex flex-col items-center gap-4 cursor-pointer">
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileInput}
                            className="hidden"
                            disabled={isUploading}
                        />

                        {isUploading ? (
                            <>
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-muted-foreground">Uploading...</p>
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-full bg-primary/10">
                                    <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Drop your audio file here</p>
                                    <p className="text-sm text-muted-foreground">
                                        or click to browse (MP3, WAV, M4A, AAC • Max 50MB)
                                    </p>
                                </div>
                            </>
                        )}
                    </label>
                </CardContent>
            </Card>

            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    )
}
