'use client'

/**
 * Music Lab Page
 * 
 * Main page for Music Lab - AI-driven music video treatment generator.
 */

import { useState } from 'react'
import { ChevronRight, Clapperboard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import {
    AudioUploader,
    LyricsEditor,
    GenreSelector,
    LocationRequests,
    ArtistNotes,
    SectionConfirmation,
    useMusicLabStore,
    ReferenceSheetGenerator
} from '@/features/music-lab'
import { ProposalList } from '@/features/music-lab/components/ProposalList'
import { Timeline } from '@/features/music-lab/components/Timeline'
import { DirectorQuestionsDialog } from '@/features/music-lab/components/DirectorQuestionsDialog'
import { useTimelineStore } from '@/features/music-lab/store/timeline.store'
import type { DirectorFingerprint, DirectorProposal } from '@/features/music-lab/types/director.types'
import type { SongAnalysisInput } from '@/features/music-lab/types/timeline.types'
import { PRESET_STYLES } from '@/features/storyboard/types/storyboard.types'
import { getDirectorById } from '@/features/music-lab/data/directors.data'

export default function MusicLabPage() {
    const { project, setStyle, setStatus } = useMusicLabStore()
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Director questions state
    const [pendingProposal, setPendingProposal] = useState<DirectorProposal | null>(null)
    const [pendingDirector, setPendingDirector] = useState<DirectorFingerprint | null>(null)
    const [showQuestionsDialog, setShowQuestionsDialog] = useState(false)

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

    // Called when user clicks "Greenlight This Vision"
    const handleSelectProposal = (proposal: DirectorProposal) => {
        // Get the director's fingerprint to check for questions
        const director = getDirectorById(proposal.directorId)

        if (director && director.questions && director.questions.length > 0) {
            // Director has questions - show dialog before proceeding
            setPendingProposal(proposal)
            setPendingDirector(director)
            setShowQuestionsDialog(true)
        } else {
            // No questions - proceed directly
            finalizeProposal(proposal)
        }
    }

    // Called after questions are answered or skipped
    const finalizeProposal = (proposal: DirectorProposal, answers?: Record<string, string>) => {
        const timelineStore = useTimelineStore.getState()

        // Import song data if not already there
        if (project.songAnalysis?.confirmedSections) {
            timelineStore.importFromSongAnalysis(project.songAnalysis.confirmedSections)
        }
        if (project.audioUrl) {
            timelineStore.setAudioUrl(project.audioUrl)
        }

        // Refine proposal if we have answers
        const refinedProposal = answers
            ? refineProposalWithAnswers(proposal, answers)
            : proposal

        // Import proposal shots
        timelineStore.importProposal(refinedProposal, project.songAnalysis as SongAnalysisInput)

        // Clear question state
        setPendingProposal(null)
        setPendingDirector(null)
        setShowQuestionsDialog(false)

        // Move to building phase
        setStatus('building')
    }

    // Handle questions submitted
    const handleQuestionsSubmit = (answers: Record<string, string>) => {
        if (pendingProposal) {
            finalizeProposal(pendingProposal, answers)
        }
    }

    // Handle questions skipped
    const handleQuestionsSkip = () => {
        if (pendingProposal) {
            finalizeProposal(pendingProposal)
        }
    }

    // Refine proposal based on user's answers to director questions
    const refineProposalWithAnswers = (
        proposal: DirectorProposal,
        answers: Record<string, string>
    ): DirectorProposal => {
        // Clone the proposal
        const refined = { ...proposal }

        // Build answer context string for enhancing prompts
        const answerDescriptions = Object.entries(answers).map(([questionId, value]) => {
            const director = getDirectorById(proposal.directorId)
            const question = director?.questions?.find(q => q.id === questionId)
            const option = question?.options.find(o => o.value === value)
            if (question && option) {
                return `${question.questionText} → ${option.label}${option.description ? ` (${option.description})` : ''}`
            }
            return null
        }).filter(Boolean)

        const answerContext = answerDescriptions.join('. ')

        // Enhance key shots with answer context
        if (answerContext && refined.keyShots) {
            refined.keyShots = refined.keyShots.map(shot => ({
                ...shot,
                basePrompt: `${shot.basePrompt}. Director's vision: ${answerContext}`,
                directorNotes: shot.directorNotes
                    ? `${shot.directorNotes} | User choices: ${answerContext}`
                    : `User choices: ${answerContext}`
            }))
        }

        // Enhance concept overview
        if (answerContext && refined.conceptOverview) {
            refined.conceptOverview = `${refined.conceptOverview}\n\nRefined by director questions: ${answerContext}`
        }

        return refined
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

                    {/* Reference Sheets */}
                    <section>
                        <h2 className="text-xl font-semibold mb-4">7. Reference Sheets</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Generate visual anchors for character, wardrobe, and location consistency across your video.
                        </p>
                        <ReferenceSheetGenerator />
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
                                    <LoadingSpinner size="sm" color="current" className="h-5 w-5 mr-2" />
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

            {/* Director Questions Dialog */}
            {pendingDirector && (
                <DirectorQuestionsDialog
                    open={showQuestionsDialog}
                    onOpenChange={setShowQuestionsDialog}
                    director={pendingDirector}
                    onSubmit={handleQuestionsSubmit}
                    onSkip={handleQuestionsSkip}
                />
            )}
        </div>
    )
}
