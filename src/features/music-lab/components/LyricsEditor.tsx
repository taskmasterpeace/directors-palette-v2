'use client'

/**
 * Lyrics Editor Component
 * 
 * Text area for manual lyrics input or editing transcription.
 * Includes optional vocal isolation (Demucs) before transcription.
 * After transcription, automatically detects song sections using LLM.
 */

import { useState } from 'react'
import { FileText, Sparkles, Loader2, Music, Layers } from 'lucide-react'
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

export function LyricsEditor({ onAnalyze, showTranscribeButton = true }: LyricsEditorProps) {
    const { project, setManualLyrics, setUseVocalIsolation, setSongAnalysis, confirmSections } = useMusicLabStore()
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || `Transcription failed with status ${response.status}`)
            }

            const transcriptionData = await response.json()
            setManualLyrics(transcriptionData.fullText)

            // Step 3: Detect song sections using LLM
            setStatus('Detecting song sections...')
            setIsAnalyzing(true)

            const sectionsResponse = await fetch('/api/music-lab/analyze-structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lyrics: transcriptionData.fullText,
                    segments: transcriptionData.segments || []
                })
            })

            if (sectionsResponse.ok) {
                const { sections } = await sectionsResponse.json()

                // Store the analysis
                setSongAnalysis({
                    transcription: {
                        fullText: transcriptionData.fullText,
                        words: transcriptionData.words || []
                    },
                    structure: {
                        bpm: 120, // Default, will be updated when structure analysis runs
                        sections: [],
                        beats: []
                    },
                    confirmedSections: sections
                })

                // Auto-confirm the sections so they display immediately
                confirmSections(sections)

                setStatus('Done!')
                onAnalyze?.()
            } else {
                console.warn('Section detection failed, lyrics still saved')
                setStatus('Transcribed (section detection failed)')
            }

        } catch (error) {
            console.error('Transcription error:', error)
            setStatus('Error - check console')
        } finally {
            setIsTranscribing(false)
            setIsAnalyzing(false)
            setTimeout(() => setStatus(''), 3000)
        }
    }

    // Manual analysis of already-entered lyrics
    const handleAnalyzeLyrics = async () => {
        if (!lyrics.trim()) return

        setIsAnalyzing(true)
        setStatus('Analyzing lyrics...')

        try {
            const response = await fetch('/api/music-lab/analyze-structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lyrics: lyrics,
                    segments: [] // No timestamps for manual lyrics
                })
            })

            if (response.ok) {
                const { sections } = await response.json()

                setSongAnalysis({
                    transcription: { fullText: lyrics, words: [] },
                    structure: {
                        bpm: 120, // Default
                        sections: [],
                        beats: []
                    },
                    confirmedSections: sections
                })
                confirmSections(sections)

                setStatus('Sections detected!')
                onAnalyze?.()
            } else {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || 'Analysis failed')
            }
        } catch (error) {
            console.error('Analysis error:', error)
            setStatus('Analysis failed')
        } finally {
            setIsAnalyzing(false)
            setTimeout(() => setStatus(''), 3000)
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

                    <div className="flex items-center gap-2">
                        {/* Analyze Manual Lyrics Button */}
                        {lyrics.trim() && !project.audioUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAnalyzeLyrics}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <Layers className="w-4 h-4 mr-2" />
                                        Detect Sections
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Auto-Transcribe Button */}
                        {showTranscribeButton && project.audioUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleTranscribe}
                                disabled={isTranscribing || isAnalyzing}
                            >
                                {isTranscribing || isAnalyzing ? (
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
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{lyrics.split(/\s+/).filter(w => w).length} words</span>
                    {status && <span className="text-primary">{status}</span>}
                </div>
            </CardContent>
        </Card>
    )
}
