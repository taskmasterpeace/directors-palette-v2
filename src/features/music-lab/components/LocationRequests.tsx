'use client'

/**
 * Location Requests Component
 * 
 * User can specify locations they want in the music video.
 */

import { useState } from 'react'
import { MapPin, Plus, X, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useMusicLabStore } from '../store/music-lab.store'
import type { SongSectionType } from '../types/music-lab.types'

const SECTION_TYPES: SongSectionType[] = [
    'intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro'
]

export function LocationRequests() {
    const { project, addLocationRequest, removeLocationRequest } = useMusicLabStore()
    const [isAdding, setIsAdding] = useState(false)
    const [newLocation, setNewLocation] = useState({
        name: '',
        description: '',
        forSections: [] as SongSectionType[],
        isRequired: false
    })

    const handleAdd = () => {
        if (!newLocation.name.trim()) return

        addLocationRequest({
            name: newLocation.name,
            description: newLocation.description,
            forSections: newLocation.forSections,
            isRequired: newLocation.isRequired
        })

        setNewLocation({
            name: '',
            description: '',
            forSections: [],
            isRequired: false
        })
        setIsAdding(false)
    }

    const toggleSection = (section: SongSectionType) => {
        setNewLocation(prev => ({
            ...prev,
            forSections: prev.forSections.includes(section)
                ? prev.forSections.filter(s => s !== section)
                : [...prev.forSections, section]
        }))
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5" />
                        Location Requests
                    </CardTitle>
                    {!isAdding && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAdding(true)}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Location
                        </Button>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    Specify locations you want included in your music video
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Existing locations */}
                {project.locationRequests?.map(location => (
                    <div
                        key={location.id}
                        className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{location.name}</span>
                                {location.isRequired && (
                                    <Badge variant="secondary" className="text-xs">
                                        <Star className="w-3 h-3 mr-1" />
                                        Required
                                    </Badge>
                                )}
                            </div>
                            {location.description && (
                                <p className="text-sm text-muted-foreground">{location.description}</p>
                            )}
                            {location.forSections && location.forSections.length > 0 && (
                                <div className="flex gap-1 flex-wrap mt-2">
                                    {location.forSections.map(section => (
                                        <Badge key={section} variant="outline" className="text-xs">
                                            {section}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLocationRequest(location.id)}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ))}

                {/* Add new location form */}
                {isAdding && (
                    <div className="p-4 rounded-lg border border-dashed space-y-4">
                        <Input
                            value={newLocation.name}
                            onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Location name (e.g., 'Urban rooftop')"
                        />
                        <Textarea
                            value={newLocation.description}
                            onChange={(e) => setNewLocation(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Description (optional) - e.g., 'At golden hour, overlooking the city skyline'"
                            className="min-h-[80px]"
                        />

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Suggested for sections:</p>
                            <div className="flex gap-2 flex-wrap">
                                {SECTION_TYPES.map(section => (
                                    <Badge
                                        key={section}
                                        variant={newLocation.forSections.includes(section) ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => toggleSection(section)}
                                    >
                                        {section}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="required"
                                checked={newLocation.isRequired}
                                onCheckedChange={(checked) =>
                                    setNewLocation(prev => ({ ...prev, isRequired: !!checked }))
                                }
                            />
                            <label htmlFor="required" className="text-sm">
                                This location is required (directors must include it)
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleAdd} disabled={!newLocation.name.trim()}>
                                Add Location
                            </Button>
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {!isAdding && (!project.locationRequests || project.locationRequests.length === 0) && (
                    <div className="text-center py-6 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No locations specified yet</p>
                        <p className="text-sm">Directors will suggest locations based on your lyrics</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
