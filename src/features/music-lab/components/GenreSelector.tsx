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
import { useMusicLabStore } from '../store/music-lab.store'
import type { MusicGenre } from '../types/music-lab.types'

export function GenreSelector() {
    const { project, setGenre } = useMusicLabStore()

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
                    <Input
                        value={project.genreSelection?.genre || ''}
                        onChange={(e) => setGenre({
                            genre: e.target.value as MusicGenre,
                            subgenre: project.genreSelection?.subgenre || ''
                        })}
                        placeholder="e.g., Hip-Hop, R&B, Pop, Rock, Electronic..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Subgenre / Style</Label>
                    <Input
                        value={project.genreSelection?.subgenre || ''}
                        onChange={(e) => handleSubgenreChange(e.target.value)}
                        placeholder="e.g., Trap, Neo-Soul, Dream Pop..."
                    />
                </div>
            </CardContent>
        </Card>
    )
}
