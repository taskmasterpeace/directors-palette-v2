'use client'

/**
 * Director Proposals List
 * 
 * Generates and displays proposals from all directors for comparison.
 */

import { useState, useCallback } from 'react'
import { RefreshCw, Users, Clapperboard } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { ProposalCard } from './ProposalCard'
import { getAllDirectors } from '../data/directors.data'
import { directorProposalService, type DirectorProposal, type ProposalInput } from '../services/director-proposal.service'
import { useMusicLabStore } from '../store/music-lab.store'
import { logger } from '@/lib/logger'

interface ProposalListProps {
    onComplete?: (proposals: DirectorProposal[]) => void
    onSelectProposal?: (proposal: DirectorProposal) => void
}

export function ProposalList({ onComplete, onSelectProposal }: ProposalListProps) {
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
            logger.musicLab.error('Generation error', { error: err instanceof Error ? err.message : String(err) })
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
                    <Clapperboard className="w-6 h-6 text-primary" />
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">The Director&apos;s Palette</h2>
                        <p className="text-sm text-muted-foreground">Review treatments and find your visual identity</p>
                    </div>
                </div>

                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !project.songAnalysis}
                >
                    {isGenerating ? (
                        <>
                            <LoadingSpinner size="sm" color="current" className="mr-2" />
                            Commissioning...
                        </>
                    ) : proposals.length > 0 ? (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Commission New Takes
                        </>
                    ) : (
                        <>
                            Open The Palette ({directors.length} Directors)
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
                    <LoadingSpinner size="lg" className="mb-4" />
                    <p className="text-muted-foreground font-medium">
                        Directors are listening to your track...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 animate-pulse">
                        Analyzing lyrics • extracting themes • developing visual concepts
                    </p>
                </div>
            )}

            {/* No Proposals Yet */}
            {!isGenerating && proposals.length === 0 && !error && (
                <div className="text-center py-20 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                    <Users className="w-16 h-16 mx-auto mb-6 opacity-20" />
                    <h3 className="text-lg font-medium text-foreground mb-2">The Studio is Quiet</h3>
                    <p className="max-w-md mx-auto mb-6">Commission our roster of AI directors to treat your track. They&apos;ll generate unique concepts, locations, and visual vibes.</p>
                    <p className="text-xs text-muted-foreground">
                        Featuring: {directors.map(d => d.name).join(' • ')}
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
                            onSelect={onSelectProposal}
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
