'use client'

/**
 * Music Lab Page
 * 
 * Main page for Music Lab - AI-driven music video treatment generator.
 */

import { useState } from 'react'
import { ChevronRight, Loader2, Clapperboard } from 'lucide-react'
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
import { ProposalList } from '@/features/music-lab/components/ProposalList'
import { Timeline } from '@/features/music-lab/components/Timeline'
import { useTimelineStore } from '@/features/music-lab/store/timeline.store'
import type { DirectorProposal } from '@/features/music-lab/types/director.types'
import type { SongAnalysisInput } from '@/features/music-lab/types/timeline.types'
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

    const handleSelectProposal = (proposal: DirectorProposal) => {
        const timelineStore = useTimelineStore.getState()

        // Import song data if not already there
        if (project.songAnalysis?.confirmedSections) {
            timelineStore.importFromSongAnalysis(project.songAnalysis.confirmedSections)
        }
        if (project.audioUrl) {
            timelineStore.setAudioUrl(project.audioUrl)
        }

        // Import proposal shots
        timelineStore.importProposal(proposal, project.songAnalysis as SongAnalysisInput)

        // Move to building phase
        setStatus('building')
    }

    return (
        <div className="w-full py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                    <Clapperboard className="w-5 h-5" />
                    <span className="font-medium">Studio Dashboard</span>
                </div>
                <h1 className="text-3xl font-bold">The Director&apos;s Palette</h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                    Scout your track, commission AI directors, and greenlight your favorite vision.
                </p>
            </div>

            {/* Setup Phase */}
            {project.status === 'setup' && (
                <div className="space-y-6">
                    {/* Audio Upload */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. The Track</h2>
                        <AudioUploader />
                    </section>

                    {/* Lyrics */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. The Lyrics</h2>
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
                        <h2 className="text-xl font-semibold mb-4">5. Scout Locations</h2>
                        <LocationRequests />
                    </section>

                    {/* Artist Notes */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">6. Creative Vision</h2>
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
                                    Analyzing Structure...
                                </>
                            ) : (
                                <>
                                    Ingest Track & Structure
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </Button>
                        {!canAnalyze && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Upload audio or paste lyrics to begin the session
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Confirming Phase */}
            {(project.status === 'confirming' || project.status === 'analyzing') && (
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-center">Confirm Song Structure</h2>
                    <p className="text-center text-muted-foreground pb-4">Ensure the verse/chorus structure is correct before commissioning directors.</p>
                    <SectionConfirmation onConfirm={() => setStatus('generating-proposals')} />
                </div>
            )}

            {/* Proposal Phase */}
            {project.status === 'generating-proposals' && (
                <div className="space-y-6">
                    <ProposalList
                        onSelectProposal={handleSelectProposal}
                    />
                </div>
            )}

            {/* Timeline Phase */}
            {project.status === 'building' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Clapperboard className="w-5 h-5" />
                                Production Timeline
                            </h2>
                            <p className="text-sm text-muted-foreground">The Director&apos;s Cut</p>
                        </div>
                        <Button variant="outline" onClick={() => setStatus('generating-proposals')}>
                            Back to The Palette
                        </Button>
                    </div>
                    <Timeline className="border rounded-lg p-4 bg-background" />
                </div>
            )}
        </div>
    )
}
