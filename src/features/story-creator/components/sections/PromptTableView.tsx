'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, Users, MapPin, FileText, Film } from 'lucide-react'
import type { StoryShot } from '../../types/story.types'
import { parseDynamicPrompt } from '@/features/shot-creator/helpers/prompt-syntax-feedback'
import { TitleCardService } from '../../services/title-card.service'

interface PromptTableViewProps {
    shots: StoryShot[]
}

/**
 * Prompt Table View - Shows all prompts in a table with copy functionality
 * Organizes by characters, locations, and displays bracket variations
 */
export default function PromptTableView({ shots }: PromptTableViewProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = async (shotId: string, prompt: string) => {
        try {
            await navigator.clipboard.writeText(prompt)
            setCopiedId(shotId)
            setTimeout(() => setCopiedId(null), 2000) // Reset after 2 seconds
        } catch (error) {
            console.error('Failed to copy:', error)
        }
    }

    const extractCharacters = (referenceTags: string[]): string[] => {
        // Characters start with @ and are not locations
        // Convention: character tags vs location tags
        return referenceTags.filter(tag => tag.startsWith('@'))
    }

    const extractLocations = (shot: StoryShot): string[] => {
        // Try to get location from chapter or metadata
        const locations: string[] = []
        if (shot.chapter) {
            locations.push(shot.chapter)
        }
        // Could add more sophisticated location detection here
        return locations
    }

    const analyzePrompt = (prompt: string) => {
        const result = parseDynamicPrompt(prompt)
        return {
            hasBrackets: result.hasBrackets,
            variationCount: result.totalCount,
            bracketContent: result.bracketContent
        }
    }

    if (shots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400">No shots to display</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Prompt Table
                    </h3>
                    <p className="text-sm text-slate-400">
                        {shots.length} prompt{shots.length !== 1 ? 's' : ''} • Click copy to clipboard
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800 border-b border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider w-16">
                                    #
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    <Users className="w-4 h-4 inline mr-1" />
                                    Characters
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Location
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Prompt
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider w-24">
                                    Copy
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-900 divide-y divide-slate-800">
                            {shots.map((shot) => {
                                const characters = extractCharacters(shot.reference_tags)
                                const locations = extractLocations(shot)
                                const promptAnalysis = analyzePrompt(shot.prompt)
                                const isCopied = copiedId === shot.id
                                const isTitleCard = TitleCardService.isTitleCard(shot)

                                return (
                                    <tr
                                        key={shot.id}
                                        className={`hover:bg-slate-800/50 transition-colors ${
                                            isTitleCard ? 'bg-yellow-900/10' : ''
                                        }`}
                                    >
                                        {/* Sequence Number */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {isTitleCard && (
                                                    <Film className="w-4 h-4 text-yellow-400" />
                                                )}
                                                <span className="text-sm text-slate-300 font-mono">
                                                    {shot.sequence_number}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Characters */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {characters.length > 0 ? (
                                                    characters.map((char) => (
                                                        <Badge
                                                            key={char}
                                                            variant="outline"
                                                            className="bg-green-900/20 border-green-700 text-green-400 text-xs"
                                                        >
                                                            {char}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-600">None</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Location/Chapter */}
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {locations.length > 0 ? (
                                                    locations.map((loc, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className="bg-blue-900/20 border-blue-700 text-blue-400 text-xs"
                                                        >
                                                            {loc}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-600">—</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Prompt */}
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <p className="text-sm text-slate-300 line-clamp-2">
                                                    {shot.prompt}
                                                </p>
                                                {promptAnalysis.hasBrackets && (
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-purple-900/20 border-purple-700 text-purple-400 text-xs"
                                                    >
                                                        {promptAnalysis.variationCount} variations
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>

                                        {/* Copy Button */}
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleCopy(shot.id, shot.prompt)}
                                                className={`transition-all ${
                                                    isCopied
                                                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/40'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`}
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4 mr-1" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="flex items-center gap-6 text-sm text-slate-400 px-4">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span>
                        {new Set(shots.flatMap(s => extractCharacters(s.reference_tags))).size} unique characters
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <span>
                        {new Set(shots.map(s => s.chapter).filter(Boolean)).size} locations/chapters
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span>
                        {shots.filter(s => analyzePrompt(s.prompt).hasBrackets).length} with variations
                    </span>
                </div>
            </div>
        </div>
    )
}
