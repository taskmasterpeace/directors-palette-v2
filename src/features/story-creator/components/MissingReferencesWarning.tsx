'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowLeft, Play } from 'lucide-react'
import type { StoryShot } from '../types/story.types'

interface MissingReferencesWarningProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    missingReferences: MissingReferenceInfo[]
    onAssignReferences: () => void
    onContinueAnyway: () => void
}

export interface MissingReferenceInfo {
    tag: string
    shotNumbers: number[]
}

/**
 * Warning modal shown before generation when shots have missing reference images
 */
export function MissingReferencesWarning({
    open,
    onOpenChange,
    missingReferences,
    onAssignReferences,
    onContinueAnyway
}: MissingReferencesWarningProps) {
    const totalAffectedShots = missingReferences.reduce((sum, ref) => sum + ref.shotNumbers.length, 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-background border-orange-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Missing Reference Images
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Some shots reference entities without assigned reference images.
                        Images may lack character consistency.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    <div className="bg-card rounded-lg p-4 border border-border">
                        <div className="text-sm text-foreground mb-3">
                            <strong>{missingReferences.length}</strong> {missingReferences.length === 1 ? 'tag' : 'tags'} missing references in{' '}
                            <strong>{totalAffectedShots}</strong> {totalAffectedShots === 1 ? 'shot' : 'shots'}
                        </div>

                        {missingReferences.map((ref) => (
                            <div key={ref.tag} className="mb-3 last:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <code className="text-sm bg-background px-2 py-1 rounded text-orange-400">
                                        {ref.tag}
                                    </code>
                                    <Badge variant="secondary" className="text-xs">
                                        {ref.shotNumbers.length} {ref.shotNumbers.length === 1 ? 'shot' : 'shots'}
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground pl-2">
                                    Used in shots: {ref.shotNumbers.join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 What are reference images?</h4>
                        <p className="text-xs text-muted-foreground">
                            Reference images help maintain visual consistency across shots.
                            When you assign a reference to a character or location tag,
                            the AI uses that image to generate similar-looking results.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={onAssignReferences}
                        className="flex-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Assign References
                    </Button>
                    <Button
                        onClick={onContinueAnyway}
                        className="flex-1 bg-primary hover:bg-primary/90"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Continue Anyway
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/**
 * Analyzes shots to find missing reference tags
 */
export function analyzeMissingReferences(
    shots: StoryShot[],
    galleryImages: Array<{ reference?: string }>
): MissingReferenceInfo[] {
    // Get all reference tags from gallery
    const assignedTags = new Set(
        galleryImages
            .filter(img => img.reference)
            .map(img => img.reference!)
    )

    // Find all @tags used in shot prompts
    const tagsUsage = new Map<string, number[]>()

    shots.forEach((shot) => {
        const tagMatches = shot.prompt.match(/@[a-z0-9_]+/gi)
        if (tagMatches) {
            tagMatches.forEach((tag) => {
                const normalizedTag = tag.toLowerCase()
                if (!assignedTags.has(normalizedTag)) {
                    const shotNumbers = tagsUsage.get(normalizedTag) || []
                    shotNumbers.push(shot.sequence_number)
                    tagsUsage.set(normalizedTag, shotNumbers)
                }
            })
        }
    })

    // Convert to array and sort by number of shots affected
    return Array.from(tagsUsage.entries())
        .map(([tag, shotNumbers]) => ({
            tag,
            shotNumbers: shotNumbers.sort((a, b) => a - b)
        }))
        .sort((a, b) => b.shotNumbers.length - a.shotNumbers.length)
}
