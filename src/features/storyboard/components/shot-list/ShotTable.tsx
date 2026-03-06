'use client'

import { useState, useCallback } from 'react'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { SplitSquareVertical, Download, Copy, CheckCircle } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { ShotTableRow } from './ShotTableRow'
import { toast } from 'sonner'

interface ShotTableProps {
    chapterIndex?: number
}

export function ShotTable({ chapterIndex = 0 }: ShotTableProps) {
    const {
        generatedPrompts,
        characters,
        breakdownResult,
        chapters,
        isPreviewCollapsed,
        storyText,
        selectedModel,
        updateGeneratedPrompt,
        updateGeneratedShot,
        deleteShotBySequence,
        insertShotsAfter,
    } = useStoryboardStore()

    const [copiedExport, setCopiedExport] = useState(false)
    const [expandingSequence, setExpandingSequence] = useState<number | null>(null)

    const handleExpandWithCharacter = useCallback(async (sequence: number, characterTag: string, characterDesc: string) => {
        setExpandingSequence(sequence)
        try {
            const prompt = generatedPrompts.find(p => p.sequence === sequence)
            if (!prompt) return

            const res = await fetch('/api/storyboard/expand-shot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shotSequence: sequence,
                    characterTag,
                    characterDescription: characterDesc,
                    existingPrompt: prompt.prompt,
                    storyContext: storyText,
                    model: selectedModel,
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            const newShots: GeneratedShotPrompt[] = data.shots.map((shot: { prompt: string; shotType: string }, i: number) => ({
                sequence: sequence + i + 1,
                originalText: '',
                prompt: shot.prompt,
                shotType: (shot.shotType || 'medium') as GeneratedShotPrompt['shotType'],
                characterRefs: characters.filter(c => {
                    const tag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                    return shot.prompt.toLowerCase().includes(c.name.toLowerCase()) || shot.prompt.includes(tag)
                }),
                edited: false,
            }))

            insertShotsAfter(sequence, newShots)
            toast.success(`Added ${newShots.length} coverage shot${newShots.length > 1 ? 's' : ''} for ${characterTag}`)
        } catch {
            toast.error('Failed to generate coverage shots')
        } finally {
            setExpandingSequence(null)
        }
    }, [generatedPrompts, characters, storyText, selectedModel, insertShotsAfter])

    // Filter prompts by chapter
    const filteredPrompts = (() => {
        if (!chapters || chapters.length === 0 || chapterIndex < 0) return generatedPrompts
        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) return generatedPrompts
        return generatedPrompts.filter(p =>
            activeChapter.segmentIndices.includes(p.sequence)
        )
    })()

    // Export: copy to clipboard
    const handleExportClipboard = useCallback(async () => {
        const lines = filteredPrompts.map(p => {
            const charTags = p.characterRefs.map(c =>
                '@' + c.name.toLowerCase().replace(/\s+/g, '_')
            ).join(' ')
            return `#${p.sequence} | ${p.shotType.toUpperCase()} | ${p.prompt}\n   Characters: ${charTags || '—'}`
        })

        const title = breakdownResult?.segments?.[0]?.text?.substring(0, 50) || 'Untitled'
        const text = `SHOT LIST — ${title}...\nGenerated: ${new Date().toISOString().split('T')[0]}\n\n${lines.join('\n\n')}`

        await navigator.clipboard.writeText(text)
        setCopiedExport(true)
        setTimeout(() => setCopiedExport(false), 2000)
        toast.success('Shot list copied to clipboard')
    }, [filteredPrompts, breakdownResult])

    // Export: CSV download
    const handleExportCSV = useCallback(() => {
        const header = 'Sequence,Shot Type,Description,Characters'
        const rows = filteredPrompts.map(p => {
            const charTags = p.characterRefs.map(c =>
                '@' + c.name.toLowerCase().replace(/\s+/g, '_')
            ).join('; ')
            const escapedPrompt = `"${p.prompt.replace(/"/g, '""')}"`
            return `${p.sequence},${p.shotType},${escapedPrompt},"${charTags}"`
        })

        const csv = [header, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `shot-list-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')
    }, [filteredPrompts])

    const handlePromptChange = (sequence: number, newPrompt: string) => {
        updateGeneratedPrompt(sequence, newPrompt)
    }

    const handleCharacterRefsChange = (sequence: number, characterRefs: import('../../types/storyboard.types').StoryboardCharacter[]) => {
        updateGeneratedShot(sequence, { characterRefs })
    }

    const handleDeleteShot = (sequence: number) => {
        deleteShotBySequence(sequence)
    }

    if (filteredPrompts.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <SplitSquareVertical className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No shots generated yet.</p>
                    <p className="text-sm">Generate shot prompts first.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SplitSquareVertical className="w-4 h-4" />
                        Shot Table
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={handleExportClipboard}
                        >
                            {copiedExport ? (
                                <><CheckCircle className="w-3 h-3 mr-1 text-green-500" />Copied</>
                            ) : (
                                <><Copy className="w-3 h-3 mr-1" />Copy</>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={handleExportCSV}
                        >
                            <Download className="w-3 h-3 mr-1" />CSV
                        </Button>
                        <Badge variant="outline">{filteredPrompts.length} shots</Badge>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className={isPreviewCollapsed ? "h-[calc(100vh-340px)]" : "h-[500px]"}>
                    <Table>
                        <TableHeader>
                            <TableRow className="text-xs">
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead className="w-24">Type</TableHead>
                                <TableHead>Shot Description</TableHead>
                                <TableHead className="w-48">Characters</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPrompts.map((prompt) => (
                                <ShotTableRow
                                    key={`shot-${prompt.sequence}`}
                                    prompt={prompt}
                                    characters={characters}
                                    onPromptChange={handlePromptChange}
                                    onCharacterRefsChange={handleCharacterRefsChange}
                                    onDelete={handleDeleteShot}
                                    onExpandWithCharacter={handleExpandWithCharacter}
                                    isExpanding={expandingSequence === prompt.sequence}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
