'use client'

/**
 * Director Proposals List
 * 
 * Generates and displays proposals from all directors for comparison.
 */

import { useState, useCallback } from 'react'
import { Loader2, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProposalCard } from './ProposalCard'
import { getAllDirectors } from '../data/directors.data'
import { directorProposalService, type DirectorProposal, type ProposalInput } from '../services/director-proposal.service'
import { useMusicLabStore } from '../store/music-lab.store'

interface ProposalListProps {
    onComplete?: (proposals: DirectorProposal[]) => void
}

export function ProposalList({ onComplete }: ProposalListProps) {
    const { project } = useMusicLabStore()
    const [proposals, setProposals] = useState<DirectorProposal[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [cherryPickedItems, setCherryPickedItems] = useState<Set<string>>(new Set())

    const directors = getAllDirectors()

    const handleGenerate = useCallback(async () => {
        if (!project.songAnalysis) {
            setError('No song analysis available. Please complete the song setup first.')
            return
        }

        setIsGenerating(true)
        setError(null)

        try {
            const input: ProposalInput = {
                songAnalysis: project.songAnalysis,
                genreSelection: project.genreSelection || { genre: 'other', subgenre: '' },
                locationRequests: project.locationRequests || [],
                artistName: project.artist?.name || 'Artist',
                artistNotes: project.artistNotes?.visionStatement
            }

            const generatedProposals = await directorProposalService.generateAllProposals(
                directors,
                input
            )

            setProposals(generatedProposals)
            onComplete?.(generatedProposals)
        } catch (err) {
            console.error('Generation error:', err)
            setError('Failed to generate proposals. Please try again.')
        } finally {
            setIsGenerating(false)
        }
    }, [project, directors, onComplete])

    const handleRatingChange = useCallback((proposalId: string, rating: number) => {
        setProposals(prev => prev.map(p =>
            p.id === proposalId ? { ...p, overallRating: rating } : p
        ))
    }, [])

    const handleCherryPick = useCallback((proposalId: string, itemType: string, itemId: string) => {
        const key = `${proposalId}_${itemType}_${itemId}`
        setCherryPickedItems(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }, [])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Director Proposals</h2>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !project.songAnalysis}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : proposals.length > 0 ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                        </>
                    ) : (
                        <>
                            Generate Proposals ({directors.length} Directors)
                        </>
                    )}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                </div>
            )}

            {/* Generating State */}
            {isGenerating && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">
                        {directors.length} directors are creating their visions...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Using Gemini 2.0 Flash for full context
                    </p>
                </div>
            )}

            {/* No Proposals Yet */}
            {!isGenerating && proposals.length === 0 && !error && (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Click &quot;Generate Proposals&quot; to see how each director interprets your song.</p>
                    <p className="text-sm mt-2">
                        {directors.map(d => d.name).join(' • ')}
                    </p>
                </div>
            )}

            {/* Proposals Grid */}
            {!isGenerating && proposals.length > 0 && (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {proposals.map(proposal => (
                        <ProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            onRatingChange={handleRatingChange}
                            onCherryPick={handleCherryPick}
                            cherryPickedItems={cherryPickedItems}
                        />
                    ))}
                </div>
            )}

            {/* Cherry Pick Summary */}
            {cherryPickedItems.size > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg">
                    {cherryPickedItems.size} items selected for final treatment
                </div>
            )}
        </div>
    )
}
