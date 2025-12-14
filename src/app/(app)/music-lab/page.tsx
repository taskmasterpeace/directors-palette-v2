'use client'

/**
 * Music Lab Page
 * 
 * Main page for Music Lab - AI-driven music video treatment generator.
 */

import { useState } from 'react'
import { Music, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    AudioUploader,
    LyricsEditor,
    GenreSelector,
    LocationRequests,
    ArtistNotes,
    SectionConfirmation,
    useMusicLabStore
} from '@/features/music-lab'
import { PRESET_STYLES } from '@/features/storyboard/types/storyboard.types'

export default function MusicLabPage() {
    const { project, setStyle, setStatus } = useMusicLabStore()
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    const canAnalyze = (project.audioUrl || project.manualLyrics) &&
        project.genreSelection?.genre

    const handleAnalyze = async () => {
        if (!canAnalyze) return

        setIsAnalyzing(true)
        setStatus('analyzing')

        try {
            // For now, just move to confirming state
            // Full analysis will be triggered when we have the API integrated
            setStatus('confirming')
        } catch (error) {
            console.error('Analysis error:', error)
            setStatus('setup')
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                    <Music className="w-5 h-5" />
                    <span className="font-medium">Music Lab</span>
                </div>
                <h1 className="text-3xl font-bold">Create Your Music Video Treatment</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Upload your song, describe your vision, and let AI directors pitch you
                    complete visual concepts for your music video.
                </p>
            </div>

            {/* Setup Phase */}
            {project.status === 'setup' && (
                <div className="space-y-6">
                    {/* Audio Upload */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. Your Song</h2>
                        <AudioUploader />
                    </section>

                    {/* Lyrics */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. Lyrics</h2>
                        <LyricsEditor />
                    </section>

                    {/* Genre & Style */}
                    <section className="grid gap-6 md:grid-cols-2">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">3. Genre</h2>
                            <GenreSelector />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold mb-4">4. Visual Style</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {PRESET_STYLES.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => setStyle(style.id, style.name)}
                                        className={`p-4 rounded-lg border text-left transition-all ${project.styleId === style.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <p className="font-medium">{style.name}</p>
                                        <p className="text-xs text-muted-foreground">{style.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Location Requests */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">5. Locations</h2>
                        <LocationRequests />
                    </section>

                    {/* Artist Notes */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">6. Your Vision</h2>
                        <ArtistNotes />
                    </section>

                    {/* Analyze Button */}
                    <div className="text-center pt-6">
                        <Button
                            size="lg"
                            onClick={handleAnalyze}
                            disabled={!canAnalyze || isAnalyzing}
                            className="min-w-[200px]"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    Analyze Song
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                        {!canAnalyze && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Upload audio or paste lyrics, and select a genre to continue
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Confirming Phase */}
            {(project.status === 'confirming' || project.status === 'analyzing') && (
                <div className="space-y-6">
                    <SectionConfirmation onConfirm={() => setStatus('generating-proposals')} />
                </div>
            )}

            {/* Placeholder for future phases */}
            {project.status === 'generating-proposals' && (
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                    <p className="text-lg font-medium">Directors are creating proposals...</p>
                    <p className="text-muted-foreground">This usually takes 1-2 minutes</p>
                </div>
            )}
        </div>
    )
}
