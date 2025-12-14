'use client'

/**
 * Genre Selector Component
 * 
 * Genre and subgenre selection for Music Lab.
 */

import { Music2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMusicLabStore } from '../store/music-lab.store'
import type { MusicGenre } from '../types/music-lab.types'

const GENRES: { value: MusicGenre; label: string; subgenres: string[] }[] = [
    {
        value: 'hip-hop',
        label: 'Hip-Hop',
        subgenres: ['Trap', 'Boom Bap', 'Conscious', 'Drill', 'Lo-Fi', 'Melodic', 'Old School', 'Southern']
    },
    {
        value: 'r-and-b',
        label: 'R&B',
        subgenres: ['Contemporary', 'Neo-Soul', 'Classic', 'Alternative', 'PBR&B']
    },
    {
        value: 'pop',
        label: 'Pop',
        subgenres: ['Synth Pop', 'Dance Pop', 'Indie Pop', 'Alt Pop', 'K-Pop', 'Teen Pop']
    },
    {
        value: 'rock',
        label: 'Rock',
        subgenres: ['Alternative', 'Indie', 'Classic', 'Hard Rock', 'Punk', 'Metal', 'Grunge']
    },
    {
        value: 'electronic',
        label: 'Electronic',
        subgenres: ['House', 'Techno', 'Dubstep', 'EDM', 'Ambient', 'IDM', 'Drum & Bass']
    },
    {
        value: 'indie',
        label: 'Indie',
        subgenres: ['Indie Rock', 'Indie Folk', 'Indie Electronic', 'Dream Pop', 'Shoegaze']
    },
    {
        value: 'country',
        label: 'Country',
        subgenres: ['Modern', 'Classic', 'Country Pop', 'Outlaw', 'Bluegrass']
    },
    {
        value: 'latin',
        label: 'Latin',
        subgenres: ['Reggaeton', 'Latin Pop', 'Salsa', 'Bachata', 'Latin Trap']
    },
    {
        value: 'jazz',
        label: 'Jazz',
        subgenres: ['Contemporary', 'Classic', 'Fusion', 'Smooth', 'Bebop']
    },
    {
        value: 'classical',
        label: 'Classical',
        subgenres: ['Orchestral', 'Chamber', 'Contemporary', 'Minimalist', 'Film Score']
    },
    {
        value: 'other',
        label: 'Other',
        subgenres: []
    }
]

export function GenreSelector() {
    const { project, setGenre } = useMusicLabStore()
    const selectedGenre = GENRES.find(g => g.value === project.genreSelection?.genre)

    const handleGenreChange = (value: MusicGenre) => {
        setGenre({
            genre: value,
            subgenre: project.genreSelection?.subgenre || ''
        })
    }

    const handleSubgenreChange = (value: string) => {
        setGenre({
            genre: project.genreSelection?.genre || 'hip-hop',
            subgenre: value
        })
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Music2 className="w-5 h-5" />
                    Genre
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Primary Genre</Label>
                    <Select
                        value={project.genreSelection?.genre || 'hip-hop'}
                        onValueChange={handleGenreChange}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                        <SelectContent>
                            {GENRES.map(genre => (
                                <SelectItem key={genre.value} value={genre.value}>
                                    {genre.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Subgenre / Style</Label>
                    {selectedGenre && selectedGenre.subgenres.length > 0 ? (
                        <Select
                            value={project.genreSelection?.subgenre || ''}
                            onValueChange={handleSubgenreChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select subgenre (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {selectedGenre.subgenres.map(sub => (
                                    <SelectItem key={sub} value={sub}>
                                        {sub}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Input
                            value={project.genreSelection?.subgenre || ''}
                            onChange={(e) => handleSubgenreChange(e.target.value)}
                            placeholder="Describe the style (e.g., 'Boom Bap Revival')"
                        />
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
