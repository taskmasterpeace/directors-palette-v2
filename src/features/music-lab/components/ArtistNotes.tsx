'use client'

/**
 * Artist Notes Component
 * 
 * Free-form notes from the artist for directors.
 */

import { MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useMusicLabStore } from '../store/music-lab.store'

export function ArtistNotes() {
    const { project, setArtistNotes } = useMusicLabStore()
    const notes = project.artistNotes || { perSectionNotes: {} }

    const handleChange = (field: string, value: string) => {
        setArtistNotes({
            ...notes,
            [field]: value
        })
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="w-5 h-5" />
                    Notes for Directors
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Tell directors what you want in your own words
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Vision Statement</Label>
                    <Textarea
                        value={notes.visionStatement || ''}
                        onChange={(e) => handleChange('visionStatement', e.target.value)}
                        placeholder="What's the overall feeling or story you want to convey? What should viewers feel when watching?"
                        className="min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Location Ideas</Label>
                    <Textarea
                        value={notes.locationPreferences || ''}
                        onChange={(e) => handleChange('locationPreferences', e.target.value)}
                        placeholder="Any specific types of locations or settings you envision? Indoor/outdoor preferences?"
                        className="min-h-[80px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Wardrobe Thoughts</Label>
                    <Textarea
                        value={notes.wardrobeIdeas || ''}
                        onChange={(e) => handleChange('wardrobeIdeas', e.target.value)}
                        placeholder="How do you want to look? Any specific outfits, colors, or styles in mind?"
                        className="min-h-[80px]"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Reference Videos / Artists</Label>
                    <Textarea
                        value={notes.moodReferences || ''}
                        onChange={(e) => handleChange('moodReferences', e.target.value)}
                        placeholder="Any music videos, films, or artists that inspire the look you're going for?"
                        className="min-h-[80px]"
                    />
                </div>
            </CardContent>
        </Card>
    )
}
