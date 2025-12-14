'use client'

/**
 * Director Proposal Card
 * 
 * Displays a single director's proposal with rating and cherry-pick options.
 */

import { useState } from 'react'
import { Star, MapPin, Shirt, Camera, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/utils'
import type { DirectorProposal, ProposedShot, ProposedLocation, ProposedWardrobe } from '../services/director-proposal.service'

interface ProposalCardProps {
    proposal: DirectorProposal
    onRatingChange: (proposalId: string, rating: number) => void
    onCherryPick?: (proposalId: string, itemType: 'location' | 'wardrobe' | 'shot', itemId: string) => void
    cherryPickedItems?: Set<string>
}

export function ProposalCard({
    proposal,
    onRatingChange,
    onCherryPick,
    cherryPickedItems = new Set()
}: ProposalCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [hoveredRating, setHoveredRating] = useState(0)

    const renderStars = () => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        onClick={() => onRatingChange(proposal.id, star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                    >
                        <Star
                            className={cn(
                                'w-5 h-5 transition-colors',
                                (hoveredRating || proposal.overallRating || 0) >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground'
                            )}
                        />
                    </button>
                ))}
            </div>
        )
    }

    const renderCherryPickButton = (type: 'location' | 'wardrobe' | 'shot', id: string) => {
        const key = `${proposal.id}_${type}_${id}`
        const isPicked = cherryPickedItems.has(key)

        return (
            <Button
                variant={isPicked ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCherryPick?.(proposal.id, type, id)}
                className="h-7 px-2"
            >
                <Check className={cn('w-3 h-3', isPicked ? 'opacity-100' : 'opacity-50')} />
            </Button>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg">{proposal.directorName}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {proposal.logline}
                        </p>
                    </div>
                    <div className="ml-4">
                        {renderStars()}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Concept Overview */}
                <p className="text-sm text-foreground/80">
                    {proposal.conceptOverview}
                </p>

                {/* Summary Badges */}
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {proposal.locations.length} Locations
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Shirt className="w-3 h-3" />
                        {proposal.wardrobeLooks.length} Looks
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {proposal.keyShots.length} Key Shots
                    </Badge>
                </div>

                {/* Expand/Collapse Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="w-full"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Hide Details
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Show Details
                        </>
                    )}
                </Button>

                {/* Expanded Details */}
                {expanded && (
                    <div className="space-y-4 pt-2 border-t">
                        {/* Locations */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Locations
                            </h4>
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
                                                {shot.sectionType}
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
        </Card>
    )
}
