'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { MapPin, ImagePlus, Upload, Link, X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import type { StoryboardLocation } from '../../types/storyboard.types'

interface LocationCardProps {
    location: StoryboardLocation
    index: number
    onUpdate: (index: number, updates: Partial<StoryboardLocation>) => void
}

function LocationCard({ location, index, onUpdate }: LocationCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload')
    const [imageUrl, setImageUrl] = useState(location.reference_image_url || '')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Auto-expand when reference is enabled but no image yet
    useEffect(() => {
        if (location.has_reference && !location.reference_image_url) {
            setIsExpanded(true)
        }
    }, [location.has_reference, location.reference_image_url])

    const handleToggleReference = () => {
        onUpdate(index, { has_reference: !location.has_reference })
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const base64 = reader.result as string
            onUpdate(index, { reference_image_url: base64 })
            setImageUrl(base64)
        }
        reader.readAsDataURL(file)
    }

    const handleUrlSubmit = () => {
        if (imageUrl.trim()) {
            onUpdate(index, { reference_image_url: imageUrl.trim() })
        }
    }

    const handleRemoveImage = () => {
        onUpdate(index, { reference_image_url: undefined })
        setImageUrl('')
    }

    const handleDescriptionChange = (description: string) => {
        onUpdate(index, { description })
    }

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="rounded-lg border bg-card/50 hover:bg-card/80 transition-colors overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-3 flex-1 cursor-pointer">
                            {/* Reference Image Thumbnail */}
                            {location.reference_image_url ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-primary/30 flex-shrink-0">
                                    <img
                                        src={location.reference_image_url}
                                        alt={location.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-5 h-5 text-muted-foreground" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{location.name}</span>
                                    <Badge variant="outline" className="text-xs font-mono">
                                        {location.tag}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                        {location.mentions} mentions
                                    </Badge>
                                    {location.has_reference && location.reference_image_url && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                {location.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                        {location.description}
                                    </p>
                                )}
                            </div>

                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-1 sm:gap-2 text-sm ml-2 sm:ml-3 flex-shrink-0">
                        <span className="text-muted-foreground text-xs hidden sm:inline">Reference</span>
                        <Switch
                            checked={location.has_reference}
                            onCheckedChange={handleToggleReference}
                        />
                    </div>
                </div>

                {/* Expanded Content */}
                <CollapsibleContent>
                    <div className="px-3 pb-3 border-t bg-muted/20">
                        <div className="pt-3 space-y-4">
                            {/* Reference Image Section */}
                            {location.has_reference && (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Reference Image</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Add a reference image to help establish the visual style of this location.
                                    </p>

                                    {location.reference_image_url ? (
                                        <div className="relative">
                                            <img
                                                src={location.reference_image_url}
                                                alt={location.name}
                                                className="w-full max-h-48 object-contain rounded-lg border"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={handleRemoveImage}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={imageInputMode === 'upload' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setImageInputMode('upload')}
                                                >
                                                    <Upload className="w-3 h-3 mr-1" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    variant={imageInputMode === 'url' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setImageInputMode('url')}
                                                >
                                                    <Link className="w-3 h-3 mr-1" />
                                                    URL
                                                </Button>
                                            </div>

                                            {imageInputMode === 'upload' ? (
                                                <div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                        className="hidden"
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-24 border-dashed"
                                                        onClick={() => fileInputRef.current?.click()}
                                                    >
                                                        <div className="text-center">
                                                            <ImagePlus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                                                            <span className="text-sm">Click to upload image</span>
                                                        </div>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Enter image URL..."
                                                        value={imageUrl}
                                                        onChange={(e) => setImageUrl(e.target.value)}
                                                        className="flex-1"
                                                    />
                                                    <Button onClick={handleUrlSubmit}>Add</Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Description</Label>
                                <Textarea
                                    placeholder="Visual description of this location..."
                                    value={location.description || ''}
                                    onChange={(e) => handleDescriptionChange(e.target.value)}
                                    className="min-h-[60px] text-sm"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This description will be included in prompts when shots occur at this location.
                                </p>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    )
}

export function LocationList() {
    const { extractionResult, locations, setLocations } = useStoryboardStore()

    // Initialize locations from extraction result if not already set
    const displayLocations = locations.length > 0
        ? locations
        : (extractionResult?.locations || []).map((l, i) => ({
            id: `temp-${i}`,
            storyboard_id: '',
            name: l.name,
            tag: l.tag,
            mentions: l.mentions,
            has_reference: false,
            reference_image_url: undefined,
            description: l.description,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }))

    // Sync locations to store if using extraction result
    useEffect(() => {
        if (extractionResult && locations.length === 0) {
            setLocations(displayLocations)
        }
    }, [extractionResult, locations.length, setLocations, displayLocations])

    const handleUpdateLocation = (index: number, updates: Partial<StoryboardLocation>) => {
        const updated = displayLocations.map((l, i) =>
            i === index ? { ...l, ...updates } : l
        )
        setLocations(updated)
    }

    if (!extractionResult && locations.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No locations extracted yet.</p>
                    <p className="text-sm">Go to the Story tab and extract locations first.</p>
                </CardContent>
            </Card>
        )
    }

    const locationsWithRef = displayLocations.filter(l => l.has_reference && l.reference_image_url).length

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Locations ({displayLocations.length})
                </CardTitle>
                <CardDescription>
                    {locationsWithRef > 0 && (
                        <span className="text-green-600">{locationsWithRef} with reference images</span>
                    )}
                    {locationsWithRef === 0 && 'Toggle reference to add location images'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {displayLocations.map((location, index) => (
                        <LocationCard
                            key={location.id || index}
                            location={location}
                            index={index}
                            onUpdate={handleUpdateLocation}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
