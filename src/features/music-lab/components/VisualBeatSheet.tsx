import { DirectorProposal } from '../services/director-proposal.service'
import { Badge } from '@/components/ui/badge'
import { MapPin, Shirt } from 'lucide-react'

// Dummy sections if none provided (simulating "Verse 1", "Chorus", "Verse 2")
const DEFAULT_SECTIONS = [
    { type: 'verse', label: 'Verse 1', start: '0:00', end: '0:45' },
    { type: 'chorus', label: 'Chorus', start: '0:45', end: '1:10' },
    { type: 'verse', label: 'Verse 2', start: '1:10', end: '1:55' },
    { type: 'bridge', label: 'Bridge', start: '2:30', end: '2:50' },
]

interface VisualBeatSheetProps {
    proposal: DirectorProposal
}

export function VisualBeatSheet({ proposal }: VisualBeatSheetProps) {
    // Simple logic to distribute locations/wardrobe across sections for visualization
    const getLocationForSection = (index: number) => {
        return proposal.locations[index % proposal.locations.length]
    }

    const getWardrobeForSection = (index: number) => {
        return proposal.wardrobeLooks[index % proposal.wardrobeLooks.length]
    }

    return (
        <div className="w-[400px]">
            <div className="mb-2 flex items-center justify-between">
                <h4 className="font-semibold text-sm">Director&apos;s Beat Sheet</h4>
                <Badge variant="outline" className="text-[10px]">Visual Plan</Badge>
            </div>

            <div className="space-y-1">
                {DEFAULT_SECTIONS.map((section, i) => {
                    const loc = getLocationForSection(i)
                    const ward = getWardrobeForSection(i)

                    return (
                        <div key={i} className="grid grid-cols-[80px_1fr] gap-2 text-xs border rounded p-1.5 hover:bg-muted/50 transition-colors">
                            <div className="flex flex-col justify-center border-r pr-2">
                                <span className="font-medium text-primary uppercase text-[10px]">{section.label}</span>
                                <span className="text-muted-foreground text-[9px]">{section.start}</span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-foreground/90">
                                    <MapPin className="w-3 h-3 text-blue-500" />
                                    <span className="truncate">{loc?.name || 'TBD'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Shirt className="w-3 h-3 text-purple-500" />
                                    <span className="truncate">{ward?.lookName || 'Standard'}</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-2 text-[10px] text-muted-foreground text-center border-t pt-1">
                + {proposal.locations.length} Locations • {proposal.wardrobeLooks.length} Looks
            </div>
        </div>
    )
}
