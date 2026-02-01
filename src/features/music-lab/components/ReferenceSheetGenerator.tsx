'use client'

/**
 * Reference Sheet Generator
 *
 * Card-based UI for generating Identity Lock, Wardrobe Sheet, and Location Sheet
 * in the Music Lab workflow. These sheets provide consistent character/wardrobe/location
 * references for music video production.
 */

import { useState } from 'react'
import { User, Shirt, MapPin, Loader2, RefreshCw, Check, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMusicLabStore } from '../store/music-lab.store'
import { referenceSheetService } from '../services/reference-sheet.service'
import type { WardrobeItem, LocationItem } from '../types/reference-sheet.types'

export function ReferenceSheetGenerator() {
    const {
        project,
        referenceSheets,
        setIdentityLockInput,
        setIdentityLockResult,
        setIdentityLockStatus,
        setWardrobeInput,
        setWardrobeResult,
        setWardrobeStatus,
        setLocationInput,
        setLocationResult,
        setLocationStatus
    } = useMusicLabStore()

    // Local state for editing
    const [expandedCard, setExpandedCard] = useState<'identity' | 'wardrobe' | 'location' | null>(null)

    // Identity Lock handlers
    const handleGenerateIdentityLock = async () => {
        const { artistName, artistDescription } = referenceSheets.identityLock
        if (!artistDescription.trim()) return

        setIdentityLockStatus('generating')
        const result = await referenceSheetService.generateIdentityLock(
            artistName,
            artistDescription,
            project.artist?.imageUrl
        )
        setIdentityLockResult(result.imageUrl || null, result.error)
    }

    // Wardrobe Sheet handlers
    const handleAddWardrobe = () => {
        const newId = String(Date.now())
        const newWardrobe: WardrobeItem = {
            id: newId,
            name: `Look ${referenceSheets.wardrobeSheet.wardrobes.length + 1}`,
            description: ''
        }
        setWardrobeInput(
            referenceSheets.wardrobeSheet.characterName,
            [...referenceSheets.wardrobeSheet.wardrobes, newWardrobe]
        )
    }

    const handleRemoveWardrobe = (id: string) => {
        setWardrobeInput(
            referenceSheets.wardrobeSheet.characterName,
            referenceSheets.wardrobeSheet.wardrobes.filter(w => w.id !== id)
        )
    }

    const handleUpdateWardrobe = (id: string, field: 'name' | 'description', value: string) => {
        setWardrobeInput(
            referenceSheets.wardrobeSheet.characterName,
            referenceSheets.wardrobeSheet.wardrobes.map(w =>
                w.id === id ? { ...w, [field]: value } : w
            )
        )
    }

    const handleGenerateWardrobeSheet = async () => {
        const { characterName, wardrobes } = referenceSheets.wardrobeSheet
        if (!characterName.trim() || wardrobes.length === 0) return

        setWardrobeStatus('generating')
        const result = await referenceSheetService.generateWardrobeSheet(
            characterName,
            wardrobes,
            referenceSheets.identityLock.imageUrl || project.artist?.imageUrl
        )
        setWardrobeResult(result.imageUrl || null, result.error)
    }

    // Location Sheet handlers
    const handleAddLocation = () => {
        const newId = String(Date.now())
        const newLocation: LocationItem = {
            id: newId,
            name: `Location ${referenceSheets.locationSheet.locations.length + 1}`,
            description: ''
        }
        setLocationInput(
            referenceSheets.locationSheet.characterName,
            [...referenceSheets.locationSheet.locations, newLocation]
        )
    }

    const handleRemoveLocation = (id: string) => {
        setLocationInput(
            referenceSheets.locationSheet.characterName,
            referenceSheets.locationSheet.locations.filter(l => l.id !== id)
        )
    }

    const handleUpdateLocation = (id: string, field: 'name' | 'description', value: string) => {
        setLocationInput(
            referenceSheets.locationSheet.characterName,
            referenceSheets.locationSheet.locations.map(l =>
                l.id === id ? { ...l, [field]: value } : l
            )
        )
    }

    const handleGenerateLocationSheet = async () => {
        const { characterName, locations } = referenceSheets.locationSheet
        if (!characterName.trim() || locations.length === 0) return

        setLocationStatus('generating')
        const result = await referenceSheetService.generateLocationSheet(
            characterName,
            locations,
            referenceSheets.identityLock.imageUrl || project.artist?.imageUrl
        )
        setLocationResult(result.imageUrl || null, result.error)
    }

    // Status indicator component
    const StatusIndicator = ({ status }: { status: 'idle' | 'generating' | 'complete' | 'error' }) => {
        switch (status) {
            case 'generating':
                return <Loader2 className="w-4 h-4 animate-spin text-primary" />
            case 'complete':
                return <Check className="w-4 h-4 text-green-500" />
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />
            default:
                return null
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Reference Sheets</h2>
                <p className="text-sm text-muted-foreground">
                    Generate visual anchors for consistent character across all shots
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Identity Lock Card */}
                <Card className={expandedCard === 'identity' ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="w-4 h-4" />
                                Identity Lock
                            </CardTitle>
                            <StatusIndicator status={referenceSheets.identityLock.status} />
                        </div>
                        <CardDescription className="text-xs">
                            7-panel turnaround for character consistency
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {referenceSheets.identityLock.imageUrl ? (
                            <div className="relative group">
                                <img
                                    src={referenceSheets.identityLock.imageUrl}
                                    alt="Identity Lock"
                                    className="w-full rounded-md"
                                />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        setIdentityLockStatus('idle')
                                        setIdentityLockResult(null)
                                    }}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regenerate
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder="Artist name"
                                    value={referenceSheets.identityLock.artistName}
                                    onChange={(e) => setIdentityLockInput(
                                        e.target.value,
                                        referenceSheets.identityLock.artistDescription
                                    )}
                                />
                                <Textarea
                                    placeholder="Visual description (e.g., African American woman, mid-20s, long braids, warm smile...)"
                                    value={referenceSheets.identityLock.artistDescription}
                                    onChange={(e) => setIdentityLockInput(
                                        referenceSheets.identityLock.artistName,
                                        e.target.value
                                    )}
                                    rows={3}
                                />
                                <Button
                                    className="w-full"
                                    onClick={handleGenerateIdentityLock}
                                    disabled={
                                        referenceSheets.identityLock.status === 'generating' ||
                                        !referenceSheets.identityLock.artistDescription.trim()
                                    }
                                >
                                    {referenceSheets.identityLock.status === 'generating' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Identity Lock'
                                    )}
                                </Button>
                            </>
                        )}
                        {referenceSheets.identityLock.error && (
                            <p className="text-xs text-red-500">{referenceSheets.identityLock.error}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Wardrobe Sheet Card */}
                <Card className={expandedCard === 'wardrobe' ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Shirt className="w-4 h-4" />
                                Wardrobe Sheet
                            </CardTitle>
                            <StatusIndicator status={referenceSheets.wardrobeSheet.status} />
                        </div>
                        <CardDescription className="text-xs">
                            {referenceSheets.wardrobeSheet.wardrobes.length} of 6 looks
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {referenceSheets.wardrobeSheet.imageUrl ? (
                            <div className="relative group">
                                <img
                                    src={referenceSheets.wardrobeSheet.imageUrl}
                                    alt="Wardrobe Sheet"
                                    className="w-full rounded-md"
                                />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        setWardrobeStatus('idle')
                                        setWardrobeResult(null)
                                    }}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regenerate
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder="Character name (for header)"
                                    value={referenceSheets.wardrobeSheet.characterName}
                                    onChange={(e) => setWardrobeInput(
                                        e.target.value,
                                        referenceSheets.wardrobeSheet.wardrobes
                                    )}
                                />
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {referenceSheets.wardrobeSheet.wardrobes.map((wardrobe) => (
                                        <div key={wardrobe.id} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-1">
                                                <Input
                                                    placeholder="Look name"
                                                    value={wardrobe.name}
                                                    onChange={(e) => handleUpdateWardrobe(wardrobe.id, 'name', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                                <Input
                                                    placeholder="Description"
                                                    value={wardrobe.description}
                                                    onChange={(e) => handleUpdateWardrobe(wardrobe.id, 'description', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            {referenceSheets.wardrobeSheet.wardrobes.length > 1 && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => handleRemoveWardrobe(wardrobe.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {referenceSheets.wardrobeSheet.wardrobes.length < 6 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleAddWardrobe}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Wardrobe
                                    </Button>
                                )}
                                <Button
                                    className="w-full"
                                    onClick={handleGenerateWardrobeSheet}
                                    disabled={
                                        referenceSheets.wardrobeSheet.status === 'generating' ||
                                        !referenceSheets.wardrobeSheet.characterName.trim() ||
                                        referenceSheets.wardrobeSheet.wardrobes.length === 0
                                    }
                                >
                                    {referenceSheets.wardrobeSheet.status === 'generating' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Wardrobe Sheet'
                                    )}
                                </Button>
                            </>
                        )}
                        {referenceSheets.wardrobeSheet.error && (
                            <p className="text-xs text-red-500">{referenceSheets.wardrobeSheet.error}</p>
                        )}
                    </CardContent>
                </Card>

                {/* Location Sheet Card */}
                <Card className={expandedCard === 'location' ? 'ring-2 ring-primary' : ''}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="w-4 h-4" />
                                Location Sheet
                            </CardTitle>
                            <StatusIndicator status={referenceSheets.locationSheet.status} />
                        </div>
                        <CardDescription className="text-xs">
                            {referenceSheets.locationSheet.locations.length} of 6 locations
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {referenceSheets.locationSheet.imageUrl ? (
                            <div className="relative group">
                                <img
                                    src={referenceSheets.locationSheet.imageUrl}
                                    alt="Location Sheet"
                                    className="w-full rounded-md"
                                />
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                        setLocationStatus('idle')
                                        setLocationResult(null)
                                    }}
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Regenerate
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Input
                                    placeholder="Character name (for header)"
                                    value={referenceSheets.locationSheet.characterName}
                                    onChange={(e) => setLocationInput(
                                        e.target.value,
                                        referenceSheets.locationSheet.locations
                                    )}
                                />
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {referenceSheets.locationSheet.locations.map((location) => (
                                        <div key={location.id} className="flex gap-2 items-start">
                                            <div className="flex-1 space-y-1">
                                                <Input
                                                    placeholder="Location name"
                                                    value={location.name}
                                                    onChange={(e) => handleUpdateLocation(location.id, 'name', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                                <Input
                                                    placeholder="Description"
                                                    value={location.description}
                                                    onChange={(e) => handleUpdateLocation(location.id, 'description', e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            {referenceSheets.locationSheet.locations.length > 1 && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => handleRemoveLocation(location.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {referenceSheets.locationSheet.locations.length < 6 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={handleAddLocation}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Location
                                    </Button>
                                )}
                                <Button
                                    className="w-full"
                                    onClick={handleGenerateLocationSheet}
                                    disabled={
                                        referenceSheets.locationSheet.status === 'generating' ||
                                        !referenceSheets.locationSheet.characterName.trim() ||
                                        referenceSheets.locationSheet.locations.length === 0
                                    }
                                >
                                    {referenceSheets.locationSheet.status === 'generating' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Location Sheet'
                                    )}
                                </Button>
                            </>
                        )}
                        {referenceSheets.locationSheet.error && (
                            <p className="text-xs text-red-500">{referenceSheets.locationSheet.error}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
