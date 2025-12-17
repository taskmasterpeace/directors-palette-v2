'use client'

/**
 * Director Proposal Card
 * 
 * Displays a single director's proposal with rating and cherry-pick options.
 */

import { useState } from 'react'
import { Star, MapPin, Shirt, Camera, ChevronDown, ChevronUp, Check, Clapperboard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { cn } from '@/utils/utils'
import type { DirectorProposal, ProposedShot, ProposedLocation, ProposedWardrobe } from '../services/director-proposal.service'
import { DirectorAvatar } from './DirectorAvatar'
import { VisualBeatSheet } from './VisualBeatSheet'
import { getAllDirectors } from '../data/directors.data'
import type { DirectorFingerprint } from '../types/director.types'

interface ProposalCardProps {
    proposal: DirectorProposal
    onRatingChange: (proposalId: string, rating: number) => void
    onCherryPick?: (proposalId: string, itemType: 'location' | 'wardrobe' | 'shot', itemId: string) => void
    onSelect?: (proposal: DirectorProposal) => void
    cherryPickedItems?: Set<string>
}

export function ProposalCard({
    proposal,
    onRatingChange,
    onCherryPick,
    onSelect,
    cherryPickedItems
}: ProposalCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [hoveredRating, setHoveredRating] = useState(0)

    const directors = getAllDirectors()
    const director = directors.find((d: DirectorFingerprint) => d.id === proposal.directorId)

    // Helper to get style label/color based on director fingerprint
    const getDirectorStyle = (d: DirectorFingerprint) => {
        if (!d) return { label: 'Director', color: '#6b7280' }
        if (d.coreIntent.controlVsSpontaneity === 'stylized') return { label: 'Stylized', color: '#ec4899' }
        if (d.spectacleProfile.budgetAssumption === 'blockbuster') return { label: 'Cinematic', color: '#f59e0b' }
        if (d.cameraPhilosophy.pointOfViewBias === 'observational') return { label: 'Realist', color: '#3b82f6' }
        return { label: 'Auteur', color: '#8b5cf6' }
    }

    const directorStyle = director ? getDirectorStyle(director) : { label: 'Director', color: '#6b7280' }

    const renderCherryPickButton = (type: 'location' | 'wardrobe' | 'shot', id: string) => {
        const key = `${proposal.id}_${type}_${id}`
        const isSelected = cherryPickedItems?.has(key)

        return (
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-6 w-6 p-0 ml-2 rounded-full",
                    isSelected ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                )}
                onClick={() => onCherryPick?.(proposal.id, type, id)}
            >
                <Check className="w-3 h-3" />
            </Button>
        )
    }

    return (
        <Card className="flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3 space-y-4">
                {/* Director Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {director && (
                            <DirectorAvatar
                                director={director}
                            />
                        )}
                        <div>
                            <CardTitle className="text-lg leading-none">{proposal.directorName}</CardTitle>
                            <Badge
                                variant="outline"
                                className="mt-1"
                                style={{ borderColor: directorStyle.color, color: directorStyle.color }}
                            >
                                {directorStyle.label} Vision
                            </Badge>
                        </div>
                    </div>
                    {/* Rating */}
                    <div className="flex gap-0.5" onMouseLeave={() => setHoveredRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                className="focus:outline-none transition-transform hover:scale-110"
                                onMouseEnter={() => setHoveredRating(star)}
                                onClick={() => onRatingChange(proposal.id, star)}
                            >
                                <Star
                                    className={cn(
                                        "w-4 h-4",
                                        (hoveredRating || proposal.overallRating || 0) >= star
                                            ? "fill-primary text-primary"
                                            : "fill-muted text-muted-foreground/30"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pitch */}
                <div className="space-y-2">
                    <p className="font-serif italic text-lg leading-snug text-foreground/90">
                        &quot;{proposal.logline}&quot;
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                        {/* Hover Card for Locations (Mini Beat Sheet) */}
                        <HoverCard>
                            <HoverCardTrigger asChild>
                                <Badge variant="secondary" className="flex items-center gap-1 cursor-help hover:bg-secondary/80 transition-colors">
                                    <MapPin className="w-3 h-3" />
                                    {proposal.locations.length} Locations
                                </Badge>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-auto p-4" align="start">
                                <VisualBeatSheet proposal={proposal} />
                            </HoverCardContent>
                        </HoverCard>

                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Shirt className="w-3 h-3" />
                            {proposal.wardrobeLooks.length} Looks
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {proposal.keyShots.length} Key Shots
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3">
                {/* Concept */}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {proposal.conceptOverview}
                </p>

                {/* Expand Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground mb-4"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? (
                        <>Hide Details <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                        <>See Full Treatment <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                </Button>

                {/* Expanded Content */}
                {expanded && (
                    <div className="space-y-6 pt-2 border-t animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Locations */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Scouted Locations
                            </h4>
                            <div className="grid gap-2">
                                {proposal.locations.map((loc: ProposedLocation) => (
                                    <div key={loc.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{loc.name}</p>
                                            <p className="text-xs text-muted-foreground">{loc.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {loc.timeOfDay} • {loc.lighting}
                                            </p>
                                        </div>
                                        {onCherryPick && renderCherryPickButton('location', loc.id)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Wardrobe */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Shirt className="w-4 h-4" />
                                Wardrobe Looks
                            </h4>
                            {proposal.wardrobeLooks.map((ward: ProposedWardrobe) => (
                                <div key={ward.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{ward.lookName}</p>
                                        <p className="text-xs text-muted-foreground">{ward.description}</p>
                                        <div className="flex gap-1 mt-1">
                                            {ward.forSections.map((s: string) => (
                                                <Badge key={s} variant="outline" className="text-xs py-0">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {onCherryPick && renderCherryPickButton('wardrobe', ward.id)}
                                </div>
                            ))}
                        </div>

                        {/* Key Shots */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Key Shots
                            </h4>
                            {proposal.keyShots.map((shot: ProposedShot) => (
                                <div key={shot.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs py-0">
                                                {shot.sectionId}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {shot.timestamp.toFixed(1)}s
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1">{shot.basePrompt}</p>
                                        <p className="text-xs text-muted-foreground mt-1 italic">
                                            {shot.directorNotes}
                                        </p>
                                    </div>
                                    {onCherryPick && renderCherryPickButton('shot', shot.id)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    onClick={() => onSelect?.(proposal)}
                    className="w-full bg-primary hover:bg-primary/90 font-semibold tracking-wide shadow-sm"
                >
                    <Clapperboard className="w-4 h-4 mr-2" />
                    Greenlight This Vision
                </Button>
            </CardFooter>
        </Card>
    )
}
