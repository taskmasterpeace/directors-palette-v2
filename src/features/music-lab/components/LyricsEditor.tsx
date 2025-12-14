'use client'

/**
 * Lyrics Editor Component
 * 
 * Text area for manual lyrics input or editing transcription.
 * Includes optional vocal isolation (Demucs) before transcription.
 */

import { useState } from 'react'
import { FileText, Sparkles, Loader2, Music } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useMusicLabStore } from '../store/music-lab.store'

interface LyricsEditorProps {
    onAnalyze?: () => void
    showTranscribeButton?: boolean
}

export function LyricsEditor({ onAnalyze: _onAnalyze, showTranscribeButton = true }: LyricsEditorProps) {
    const { project, setManualLyrics, setUseVocalIsolation } = useMusicLabStore()
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [status, setStatus] = useState('')

    const lyrics = project.manualLyrics || project.songAnalysis?.transcription?.fullText || ''
    const useVocalIsolation = project.useVocalIsolation ?? false

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setManualLyrics(e.target.value)
    }

    const handleTranscribe = async () => {
        if (!project.audioUrl) return

        setIsTranscribing(true)
        try {
            let audioToTranscribe = project.audioUrl

            // Step 1: Optionally isolate vocals using Demucs
            if (useVocalIsolation) {
                setStatus('Isolating vocals...')
                const demucsResponse = await fetch('/api/music-lab/isolate-vocals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audioUrl: project.audioUrl })
                })

                if (demucsResponse.ok) {
                    const { vocalsUrl } = await demucsResponse.json()
                    audioToTranscribe = vocalsUrl
                } else {
                    console.warn('Demucs failed, using original audio')
                }
            }

            // Step 2: Transcribe with Whisper
            setStatus('Transcribing lyrics...')
            const response = await fetch('/api/music-lab/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioUrl: audioToTranscribe })
            })

            if (!response.ok) throw new Error('Transcription failed')

            const data = await response.json()
            setManualLyrics(data.fullText)
        } catch (error) {
            console.error('Transcription error:', error)
        } finally {
            setIsTranscribing(false)
            setStatus('')
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="w-5 h-5" />
                        Lyrics
                    </CardTitle>

                    {showTranscribeButton && project.audioUrl && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTranscribe}
                            disabled={isTranscribing}
                        >
                            {isTranscribing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {status || 'Processing...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Auto-Transcribe
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Vocal Isolation Toggle */}
                {project.audioUrl && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Music className="w-4 h-4 text-muted-foreground" />
                            <div>
                                <Label htmlFor="vocal-isolation" className="text-sm font-medium cursor-pointer">
                                    Isolate Vocals First
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Uses Demucs to remove music before transcription (better for songs with heavy instrumentation)
                                </p>
                            </div>
                        </div>
                        <Switch
                            id="vocal-isolation"
                            checked={useVocalIsolation}
                            onCheckedChange={setUseVocalIsolation}
                        />
                    </div>
                )}

                <Textarea
                    value={lyrics}
                    onChange={handleChange}
                    placeholder="Paste your lyrics here, or upload audio to auto-transcribe..."
                    className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                    {lyrics.split(/\s+/).filter(w => w).length} words
                </p>
            </CardContent>
        </Card>
    )
}

