'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, MapPin, ArrowRight, Image as ImageIcon, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ExtractedEntity, StoryShot } from '../../types/story.types'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'
import { useMemo, useState } from 'react'
import { ReferenceSelectionModal } from '../ReferenceSelectionModal'
import { CharacterReferenceUpload } from '../CharacterReferenceUpload'
import { EntityCoverageService } from '../../services/entity-coverage.service'

interface EntitiesSectionProps {
    entities: ExtractedEntity[]
    shots: StoryShot[]
    onContinue: () => void
}

/**
 * Entities Section - Review extracted characters and locations
 * Displays reference images and allows selection/upload
 */
export default function EntitiesSection({
    entities,
    shots,
    onContinue
}: EntitiesSectionProps) {
    const characters = entities.filter(e => e.type === 'character')
    const locations = entities.filter(e => e.type === 'location')

    // Get gallery images to find reference assignments
    const galleryImages = useUnifiedGalleryStore(state => state.images)

    // Calculate entity coverage
    const coverage = useMemo(() =>
        EntityCoverageService.analyzeEntityCoverage(entities, shots, galleryImages),
        [entities, shots, galleryImages]
    )

    const summary = useMemo(() =>
        EntityCoverageService.getCoverageSummary(coverage),
        [coverage]
    )

    // Helper to get coverage for specific entity
    const getEntityCoverage = (tag: string) => {
        return coverage.find(c => c.entityTag === tag)
    }

    // Modal state
    const [selectionModal, setSelectionModal] = useState<{
        open: boolean
        entity: ExtractedEntity | null
    }>({ open: false, entity: null })

    const [uploadModal, setUploadModal] = useState<{
        open: boolean
        entity: ExtractedEntity | null
    }>({ open: false, entity: null })

    // Find reference image for each entity by matching @tag
    const findReferenceImage = useMemo(() => (tag: string) => {
        const normalizedTag = tag.startsWith('@') ? tag : `@${tag}`
        return galleryImages.find(img => img.reference === normalizedTag)
    }, [galleryImages])

    const openSelectionModal = (entity: ExtractedEntity) => {
        setSelectionModal({ open: true, entity })
    }

    const openUploadModal = (entity: ExtractedEntity) => {
        setUploadModal({ open: true, entity })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Characters & Locations</h2>
                <p className="text-muted-foreground">
                    Review extracted entities. These will be used as @tags in image prompts.
                </p>
            </div>

            {/* Coverage Summary */}
            {shots.length > 0 && (
                <Card className="p-4 bg-blue-900/20 border-blue-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-blue-300 mb-1">Entity Coverage</div>
                            <div className="text-xs text-muted-foreground">
                                {summary.usedEntities} of {summary.totalEntities} entities used in shots
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-emerald-400">{summary.usedEntities}</div>
                                <div className="text-xs text-muted-foreground">Used</div>
                            </div>
                            {summary.unusedEntities > 0 && (
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-400">{summary.unusedEntities}</div>
                                    <div className="text-xs text-muted-foreground">Unused</div>
                                </div>
                            )}
                            <div className="text-center">
                                <div className="text-2xl font-bold text-accent">{summary.entitiesWithReferences}</div>
                                <div className="text-xs text-muted-foreground">Have Refs</div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Tabbed View */}
            <Tabs defaultValue="characters" className="w-full">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="characters" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Characters ({characters.length})
                    </TabsTrigger>
                    <TabsTrigger value="locations" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Locations ({locations.length})
                    </TabsTrigger>
                </TabsList>

                {/* Characters Tab */}
                <TabsContent value="characters" className="mt-4 space-y-3">
                    {characters.length === 0 ? (
                        <Card className="p-8 bg-background/50 border-border">
                            <div className="flex flex-col items-center justify-center text-center">
                                <User className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground font-medium mb-1">No characters detected</p>
                                <p className="text-xs text-muted-foreground">
                                    Your story might not have named characters
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {characters.map((char) => {
                                const referenceImage = findReferenceImage(char.tag)
                                return (
                                    <Card key={char.tag} className="p-4 bg-card border-border">
                                        <div className="flex items-start gap-3">
                                            {/* Reference Image Thumbnail */}
                                            <div className="flex-shrink-0">
                                                {referenceImage ? (
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500/50">
                                                        <img
                                                            src={referenceImage.url}
                                                            alt={char.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-lg bg-background border-2 border-border flex items-center justify-center">
                                                        <User className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Entity Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-white">{char.name}</span>
                                                    <code className="text-xs bg-background px-2 py-0.5 rounded text-emerald-400">
                                                        @{char.tag}
                                                    </code>
                                                </div>
                                                {char.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                        {char.description}
                                                    </p>
                                                )}
                                                {/* Coverage Badges */}
                                                {shots.length > 0 && (() => {
                                                    const entityCov = getEntityCoverage(char.tag)
                                                    return entityCov && (
                                                        <div className="flex gap-2 mb-2">
                                                            {entityCov.shotCount > 0 ? (
                                                                <Badge variant="secondary" className="text-xs bg-green-900/50 text-emerald-400 border-green-700">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    Used in {entityCov.shotCount} shot{entityCov.shotCount !== 1 ? 's' : ''}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs bg-orange-900/50 text-orange-400 border-orange-700">
                                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                                    Not used yet
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-7"
                                                        onClick={() => openSelectionModal(char)}
                                                    >
                                                        <ImageIcon className="w-3 h-3 mr-1" />
                                                        Select
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-7"
                                                        onClick={() => openUploadModal(char)}
                                                    >
                                                        <Upload className="w-3 h-3 mr-1" />
                                                        Upload
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations" className="mt-4 space-y-3">
                    {locations.length === 0 ? (
                        <Card className="p-8 bg-background/50 border-border">
                            <div className="flex flex-col items-center justify-center text-center">
                                <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground font-medium mb-1">No locations detected</p>
                                <p className="text-xs text-muted-foreground">
                                    Try adding location descriptions to your story
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {locations.map((loc) => {
                                const referenceImage = findReferenceImage(loc.tag)
                                return (
                                    <Card key={loc.tag} className="p-4 bg-card border-border">
                                        <div className="flex items-start gap-3">
                                            {/* Reference Image Thumbnail */}
                                            <div className="flex-shrink-0">
                                                {referenceImage ? (
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-accent/50">
                                                        <img
                                                            src={referenceImage.url}
                                                            alt={loc.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-lg bg-background border-2 border-border flex items-center justify-center">
                                                        <MapPin className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Entity Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-white">{loc.name}</span>
                                                    <code className="text-xs bg-background px-2 py-0.5 rounded text-accent">
                                                        @{loc.tag}
                                                    </code>
                                                </div>
                                                {loc.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                                        {loc.description}
                                                    </p>
                                                )}
                                                {/* Coverage Badges */}
                                                {shots.length > 0 && (() => {
                                                    const entityCov = getEntityCoverage(loc.tag)
                                                    return entityCov && (
                                                        <div className="flex gap-2 mb-2">
                                                            {entityCov.shotCount > 0 ? (
                                                                <Badge variant="secondary" className="text-xs bg-green-900/50 text-emerald-400 border-green-700">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    Used in {entityCov.shotCount} shot{entityCov.shotCount !== 1 ? 's' : ''}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs bg-orange-900/50 text-orange-400 border-orange-700">
                                                                    <AlertCircle className="w-3 h-3 mr-1" />
                                                                    Not used yet
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-7"
                                                        onClick={() => openSelectionModal(loc)}
                                                    >
                                                        <ImageIcon className="w-3 h-3 mr-1" />
                                                        Select
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-7"
                                                        onClick={() => openUploadModal(loc)}
                                                    >
                                                        <Upload className="w-3 h-3 mr-1" />
                                                        Upload
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border">
                <div className="flex justify-end">
                    <Button
                        onClick={onContinue}
                        size="lg"
                        className="bg-primary hover:bg-primary/90"
                    >
                        Continue to Shots Review
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Selection Modal */}
            {selectionModal.entity && (
                <ReferenceSelectionModal
                    open={selectionModal.open}
                    onOpenChange={(open) => setSelectionModal({ open, entity: null })}
                    entityTag={selectionModal.entity.tag}
                    entityName={selectionModal.entity.name}
                    entityType={selectionModal.entity.type}
                />
            )}

            {/* Upload Modal */}
            {uploadModal.entity && (
                <CharacterReferenceUpload
                    open={uploadModal.open}
                    onOpenChange={(open) => setUploadModal({ open, entity: null })}
                    entityTag={uploadModal.entity.tag}
                    entityName={uploadModal.entity.name}
                    entityType={uploadModal.entity.type}
                />
            )}
        </div>
    )
}
