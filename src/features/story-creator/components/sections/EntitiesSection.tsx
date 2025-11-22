'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, MapPin, ArrowRight } from 'lucide-react'
import type { ExtractedEntity } from '../../types/story.types'

interface EntitiesSectionProps {
    entities: ExtractedEntity[]
    onContinue: () => void
}

/**
 * Entities Section - Review extracted characters and locations
 * Simple tabbed view without editing (for now)
 */
export default function EntitiesSection({
    entities,
    onContinue
}: EntitiesSectionProps) {
    const characters = entities.filter(e => e.type === 'character')
    const locations = entities.filter(e => e.type === 'location')

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">Characters & Locations</h2>
                <p className="text-slate-400">
                    Review extracted entities. These will be used as @tags in image prompts.
                </p>
            </div>

            {/* Tabbed View */}
            <Tabs defaultValue="characters" className="w-full">
                <TabsList className="bg-slate-800 border border-slate-700">
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
                        <Card className="p-8 bg-slate-900/50 border-slate-700">
                            <div className="flex flex-col items-center justify-center text-center">
                                <User className="w-12 h-12 text-slate-600 mb-3" />
                                <p className="text-slate-400 font-medium mb-1">No characters detected</p>
                                <p className="text-xs text-slate-500">
                                    Your story might not have named characters
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {characters.map((char) => (
                                <Card key={char.tag} className="p-4 bg-slate-800 border-slate-700">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{char.name}</span>
                                                <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-green-400">
                                                    @{char.tag}
                                                </code>
                                            </div>
                                            {char.description && (
                                                <p className="text-sm text-slate-400 line-clamp-2">
                                                    {char.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Locations Tab */}
                <TabsContent value="locations" className="mt-4 space-y-3">
                    {locations.length === 0 ? (
                        <Card className="p-8 bg-slate-900/50 border-slate-700">
                            <div className="flex flex-col items-center justify-center text-center">
                                <MapPin className="w-12 h-12 text-slate-600 mb-3" />
                                <p className="text-slate-400 font-medium mb-1">No locations detected</p>
                                <p className="text-xs text-slate-500">
                                    Try adding location descriptions to your story
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {locations.map((loc) => (
                                <Card key={loc.tag} className="p-4 bg-slate-800 border-slate-700">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">{loc.name}</span>
                                                <code className="text-xs bg-slate-900 px-2 py-0.5 rounded text-blue-400">
                                                    @{loc.tag}
                                                </code>
                                            </div>
                                            {loc.description && (
                                                <p className="text-sm text-slate-400 line-clamp-2">
                                                    {loc.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-700">
                <div className="flex justify-end">
                    <Button
                        onClick={onContinue}
                        size="lg"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Continue to Shots Review
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
