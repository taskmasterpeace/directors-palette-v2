# Storyboard Director's Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat shot list with a spreadsheet-style shot table, upgrade the LLM to generate director-style shot sequences with proper character coverage, add @ autocomplete for characters, and enable AI "write them in" when adding characters to shots.

**Architecture:** The Shots tab's card-based `ShotBreakdown` component is replaced by a table-based `ShotTable`. The `generateShotPrompts` LLM system prompt is upgraded to think like a director (proper shot sequences, main character coverage). Shot Creator's existing `PromptAutocomplete` and `usePromptAutocomplete` are adapted for storyboard character @ mentions. A new `/api/storyboard/expand-shot` route handles AI-generated coverage shots when adding a character.

**Tech Stack:** Next.js 15, React 19, TypeScript, Zustand, OpenRouter LLM (tool calling), Shot Creator autocomplete components

---

### Task 1: Add Store Actions for Shot Insertion and Export

**Files:**
- Modify: `src/features/storyboard/store/slices/generation.slice.ts`

**Step 1: Add `insertShotsAfter` action**

Add after the `clearGeneratedPrompts` action (line ~148):

```typescript
insertShotsAfter: (afterSequence: number, newShots: GeneratedShotPrompt[]) => set((state) => {
    // Find insert position
    const insertIndex = state.generatedPrompts.findIndex(p => p.sequence === afterSequence)
    if (insertIndex === -1) return state

    // Insert new shots
    const before = state.generatedPrompts.slice(0, insertIndex + 1)
    const after = state.generatedPrompts.slice(insertIndex + 1)
    const merged = [...before, ...newShots, ...after]

    // Renumber all sequences starting from 1
    const renumbered = merged.map((p, i) => ({ ...p, sequence: i + 1 }))

    return {
        generatedPrompts: renumbered,
        promptsGenerated: renumbered.length > 0
    }
}),
deleteShotBySequence: (sequence: number) => set((state) => {
    const filtered = state.generatedPrompts.filter(p => p.sequence !== sequence)
    const renumbered = filtered.map((p, i) => ({ ...p, sequence: i + 1 }))
    return {
        generatedPrompts: renumbered,
        promptsGenerated: renumbered.length > 0
    }
}),
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/store/slices/generation.slice.ts
git commit -m "feat(storyboard): add insertShotsAfter and deleteShotBySequence store actions"
git push origin main
```

---

### Task 2: Create the ShotTable Component

**Files:**
- Create: `src/features/storyboard/components/shot-list/ShotTable.tsx`

This is the main spreadsheet-style table that replaces ShotBreakdown's card list.

**Step 1: Create ShotTable.tsx**

```tsx
'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { SplitSquareVertical, Download, Copy, CheckCircle, Trash2 } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { ShotTableRow } from './ShotTableRow'
import { toast } from 'sonner'
import type { GeneratedShotPrompt, StoryboardCharacter } from '../../types/storyboard.types'

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
        updateGeneratedPrompt,
        updateGeneratedShot,
        deleteShotBySequence,
    } = useStoryboardStore()

    const [copiedExport, setCopiedExport] = useState(false)

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

    const handleCharacterRefsChange = (sequence: number, characterRefs: StoryboardCharacter[]) => {
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
                                />
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds (ShotTable isn't wired in yet, but should compile)

**Step 3: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotTable.tsx
git commit -m "feat(storyboard): create ShotTable spreadsheet component"
git push origin main
```

---

### Task 3: Create ShotTableRow with Inline Editing and @ Autocomplete

**Files:**
- Create: `src/features/storyboard/components/shot-list/ShotTableRow.tsx`

This is the individual row — inline-editable description with @ autocomplete and character tag badges.

**Step 1: Create ShotTableRow.tsx**

```tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Check, X, Trash2, Users } from 'lucide-react'
import { PromptAutocomplete } from '@/features/shot-creator/components/prompt-autocomplete/PromptAutocomplete'
import type { AutocompleteOption } from '@/features/shot-creator/types/autocomplete.types'
import type { GeneratedShotPrompt, StoryboardCharacter } from '../../types/storyboard.types'

function getShotTypeColor(type: string) {
    switch (type) {
        case 'establishing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        case 'wide': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        case 'medium': return 'bg-green-500/20 text-green-400 border-green-500/30'
        case 'close-up': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        case 'detail': return 'bg-red-500/20 text-red-400 border-red-500/30'
        default: return 'bg-muted text-muted-foreground'
    }
}

interface ShotTableRowProps {
    prompt: GeneratedShotPrompt
    characters: StoryboardCharacter[]
    onPromptChange: (sequence: number, newPrompt: string) => void
    onCharacterRefsChange: (sequence: number, characterRefs: StoryboardCharacter[]) => void
    onDelete: (sequence: number) => void
}

export function ShotTableRow({
    prompt,
    characters,
    onPromptChange,
    onCharacterRefsChange,
    onDelete,
}: ShotTableRowProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(prompt.prompt)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // @ autocomplete state
    const [autocompleteOpen, setAutocompleteOpen] = useState(false)
    const [autocompleteQuery, setAutocompleteQuery] = useState('')
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteOption[]>([])
    const [autocompleteIndex, setAutocompleteIndex] = useState(0)
    const [triggerPosition, setTriggerPosition] = useState(0)
    const [autocompletePos, setAutocompletePos] = useState({ top: 0, left: 0 })

    // Build character autocomplete items
    const buildCharacterOptions = useCallback((query: string): AutocompleteOption[] => {
        return characters
            .filter(c => {
                const tag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                return tag.includes(query.toLowerCase()) || c.name.toLowerCase().includes(query.toLowerCase())
            })
            .map(c => ({
                type: 'reference' as const,
                value: '@' + c.name.toLowerCase().replace(/\s+/g, '_'),
                label: c.name,
                image: { url: c.reference_image_url || '', id: c.id } as AutocompleteOption extends { image: infer I } ? I : never,
                thumbnailUrl: c.reference_image_url || '',
            })) as AutocompleteOption[]
    }, [characters])

    // Handle text change with @ detection
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value
        const cursorPos = e.target.selectionStart || 0
        setEditedPrompt(text)

        // Detect @ trigger
        const textBeforeCursor = text.slice(0, cursorPos)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')

        if (lastAtIndex !== -1) {
            const queryText = textBeforeCursor.slice(lastAtIndex + 1)
            if (/^[a-zA-Z0-9_-]*$/.test(queryText)) {
                const options = buildCharacterOptions(queryText)
                if (options.length > 0) {
                    setAutocompleteOpen(true)
                    setAutocompleteQuery(queryText)
                    setAutocompleteItems(options)
                    setAutocompleteIndex(0)
                    setTriggerPosition(lastAtIndex)

                    // Position dropdown below textarea
                    if (textareaRef.current) {
                        const rect = textareaRef.current.getBoundingClientRect()
                        setAutocompletePos({
                            top: rect.bottom + 4,
                            left: rect.left,
                        })
                    }
                    return
                }
            }
        }
        setAutocompleteOpen(false)
    }, [buildCharacterOptions])

    // Handle autocomplete selection
    const handleAutocompleteSelect = useCallback((item: AutocompleteOption) => {
        const before = editedPrompt.slice(0, triggerPosition)
        const cursorPos = textareaRef.current?.selectionStart || editedPrompt.length
        const after = editedPrompt.slice(cursorPos)
        const newText = before + item.value + ' ' + after
        setEditedPrompt(newText)
        setAutocompleteOpen(false)

        // Refocus textarea
        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = triggerPosition + item.value.length + 1
                textareaRef.current.focus()
                textareaRef.current.setSelectionRange(newPos, newPos)
            }
        }, 0)
    }, [editedPrompt, triggerPosition])

    // Handle keyboard in textarea
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!autocompleteOpen) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setAutocompleteIndex(i => Math.min(i + 1, autocompleteItems.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setAutocompleteIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            const item = autocompleteItems[autocompleteIndex]
            if (item) handleAutocompleteSelect(item)
        } else if (e.key === 'Escape') {
            setAutocompleteOpen(false)
        }
    }, [autocompleteOpen, autocompleteItems, autocompleteIndex, handleAutocompleteSelect])

    const handleSave = () => {
        onPromptChange(prompt.sequence, editedPrompt)
        setIsEditing(false)
        setAutocompleteOpen(false)
    }

    const handleCancel = () => {
        setEditedPrompt(prompt.prompt)
        setIsEditing(false)
        setAutocompleteOpen(false)
    }

    // Sync edited prompt if external update
    useEffect(() => {
        if (!isEditing) setEditedPrompt(prompt.prompt)
    }, [prompt.prompt, isEditing])

    // Character tag badges for the Characters cell
    const charTags = prompt.characterRefs.map(c => ({
        tag: '@' + c.name.toLowerCase().replace(/\s+/g, '_'),
        name: c.name,
        thumbnail: c.reference_image_url,
        id: c.id,
    }))

    // Characters not yet in this shot (for quick-add)
    const availableChars = characters.filter(
        c => !prompt.characterRefs.some(r => r.id === c.id)
    )

    const handleAddCharacter = (char: StoryboardCharacter) => {
        onCharacterRefsChange(prompt.sequence, [...prompt.characterRefs, char])
    }

    const handleRemoveCharacter = (charId: string) => {
        onCharacterRefsChange(prompt.sequence, prompt.characterRefs.filter(c => c.id !== charId))
    }

    return (
        <TableRow className="group align-top">
            {/* # */}
            <TableCell className="text-center font-bold text-sm">
                {prompt.sequence}
            </TableCell>

            {/* Type */}
            <TableCell>
                <Badge variant="outline" className={`text-xs py-0 ${getShotTypeColor(prompt.shotType)}`}>
                    {prompt.shotType}
                </Badge>
            </TableCell>

            {/* Description */}
            <TableCell className="max-w-0">
                {isEditing ? (
                    <div className="space-y-1 relative">
                        <Textarea
                            ref={textareaRef}
                            value={editedPrompt}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            className="min-h-[80px] text-xs"
                            autoFocus
                        />
                        <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={handleCancel}>
                                <X className="w-3 h-3" />
                            </Button>
                            <Button size="sm" className="h-6 px-2" onClick={handleSave}>
                                <Check className="w-3 h-3" />
                            </Button>
                        </div>
                        {autocompleteOpen && (
                            <PromptAutocomplete
                                items={autocompleteItems}
                                selectedIndex={autocompleteIndex}
                                onSelect={handleAutocompleteSelect}
                                onSelectIndex={setAutocompleteIndex}
                                position={autocompletePos}
                            />
                        )}
                    </div>
                ) : (
                    <div
                        className="text-xs leading-relaxed cursor-pointer hover:bg-muted/30 rounded p-1 -m-1 line-clamp-3"
                        onClick={() => setIsEditing(true)}
                        title="Click to edit"
                    >
                        {prompt.prompt}
                    </div>
                )}
            </TableCell>

            {/* Characters */}
            <TableCell>
                <TooltipProvider>
                    <div className="flex flex-wrap gap-1">
                        {charTags.map(ct => (
                            <Tooltip key={ct.id}>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-amber-400 group/tag">
                                        {ct.thumbnail ? (
                                            <img src={ct.thumbnail} alt={ct.name} className="w-4 h-4 rounded-full object-cover" />
                                        ) : (
                                            <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                                <Users className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                        {ct.tag}
                                        <button
                                            className="ml-0.5 opacity-0 group-hover/tag:opacity-100 hover:text-red-400"
                                            onClick={() => handleRemoveCharacter(ct.id)}
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    {ct.thumbnail && <img src={ct.thumbnail} alt={ct.name} className="w-24 h-24 object-cover rounded" />}
                                    <p className="text-xs font-medium mt-1">{ct.name}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                        {/* Quick-add dropdown */}
                        {availableChars.length > 0 && (
                            <div className="relative group/add">
                                <button className="flex items-center gap-0.5 rounded-full border border-dashed border-muted-foreground/30 py-0.5 px-1.5 text-[10px] text-muted-foreground hover:border-primary/50 hover:text-primary">
                                    +
                                </button>
                                <div className="absolute z-20 top-full left-0 mt-1 hidden group-hover/add:block bg-popover border rounded-md shadow-md p-1 min-w-[160px]">
                                    {availableChars.map(char => (
                                        <button
                                            key={char.id}
                                            className="w-full flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted"
                                            onClick={() => handleAddCharacter(char)}
                                        >
                                            {char.reference_image_url ? (
                                                <img src={char.reference_image_url} alt={char.name} className="w-5 h-5 rounded-full object-cover" />
                                            ) : (
                                                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="w-3 h-3" />
                                                </span>
                                            )}
                                            <span className="font-medium">{char.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </TooltipProvider>
            </TableCell>

            {/* Actions */}
            <TableCell>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(prompt.sequence)}
                >
                    <Trash2 className="w-3 h-3" />
                </Button>
            </TableCell>
        </TableRow>
    )
}
```

**Step 2: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotTableRow.tsx
git commit -m "feat(storyboard): create ShotTableRow with inline editing and @ autocomplete"
git push origin main
```

---

### Task 4: Wire ShotTable into the Shots Tab

**Files:**
- Modify: `src/features/storyboard/components/shot-list/ShotBreakdown.tsx`

The ShotBreakdown component currently handles both the "Generate Prompts" controls AND the shot list display. We'll keep ShotBreakdown for the generation controls (buttons, progress, errors) but replace the `EditableShot` card list at the bottom with `ShotTable`.

**Step 1: Import ShotTable and replace the card list**

In `ShotBreakdown.tsx`, add import at top:
```typescript
import { ShotTable } from './ShotTable'
```

**Step 2: Replace the shot list Card**

Replace the entire `{/* Shot List */}` Card section (lines ~562-654) — the one that wraps the `ScrollArea` with `EditableShot` components — with:

```tsx
{/* Shot Table */}
{promptsGenerated && (
    <ShotTable chapterIndex={chapterIndex} />
)}

{/* Pre-generation shot list (raw segments, no table yet) */}
{!promptsGenerated && breakdownResult && (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SplitSquareVertical className="w-4 h-4" />
                    Story Segments
                </div>
                <Badge variant="outline">{breakdownResult.total_count} segments</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
                Click &quot;Generate Shot Prompts&quot; to transform these into cinematic shot descriptions.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className={isPreviewCollapsed ? "h-[calc(100vh-300px)] pr-4" : "h-[500px] pr-4"}>
                <div className="space-y-2">
                    {locationFilteredSegments.map((segment) => (
                        <EditableShot
                            key={segment.sequence}
                            segment={segment}
                            generatedPrompt={undefined}
                            characters={characterNames}
                            locations={locationNames}
                            shotNote={shotNotes[segment.sequence]}
                            hasGeneratedImage={false}
                            onPromptChange={handlePromptChange}
                            onNoteChange={setShotNote}
                        />
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
)}
```

This keeps `EditableShot` for pre-generation segments (where users can add director's notes) but shows the `ShotTable` once prompts are generated.

**Step 3: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Manual test**

Run: `cd D:/git/directors-palette-v2 && node node_modules/next/dist/bin/next dev --port 3002 2>&1 &`

1. Go to `http://localhost:3002`, open storyboard
2. Enter any story text, extract entities, generate prompts
3. Verify the shot table appears with columns: #, Type, Description, Characters
4. Click a description to edit — verify @ autocomplete shows characters
5. Click + in Characters cell to add a character via dropdown

**Step 5: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotBreakdown.tsx
git commit -m "feat(storyboard): wire ShotTable into Shots tab, keep EditableShot for pre-gen segments"
git push origin main
```

---

### Task 5: Upgrade LLM Prompt for Director-Style Shot Generation

**Files:**
- Modify: `src/features/storyboard/services/openrouter.service.ts` (the `generateShotPrompts` method, starting at line 247)

**Step 1: Update the system prompt**

Replace the system prompt content string (lines 281-300) with:

```typescript
content: `You are a film director planning shot coverage for a visual storyboard. Your task is to convert story text segments into detailed STILL IMAGE descriptions suitable for AI image generation.

DIRECTOR'S APPROACH:
- Think like a director planning coverage for each scene
- For key moments, generate a SEQUENCE of shots: establishing → wide → medium → close-up (use judgment — not every moment needs all four)
- When a segment introduces a new location, start with an establishing shot
- When a character is doing something important, show it across multiple angles
- Follow natural cinematic grammar: don't jump from establishing straight to close-up without a medium

CHARACTER COVERAGE:
${characters_with_roles}
- Main characters should appear in 70%+ of shots — they are the visual through-line
- For documentary-style: the main subject should be visually present in most shots (shown directly, or referenced visually through belongings, documents, silhouettes, etc.)
- When a character appears, use their @name tag (e.g., @geechi_gotti)
- Each shot MUST list which characters are visible in it

IMPORTANT RULES:
- These are STILL IMAGES, not video. Do NOT use movement terms like "dolly", "crane", "rack focus", "pan", "tilt"
- Focus on composition, framing, lighting, and atmosphere
- For BATTLE RAP scenes: DO NOT include microphones. Battle rap is face-to-face without mics.
- You may generate MORE shots than input segments — a single story beat can need 2-4 shots for proper coverage
- Number your output shots sequentially starting from the first segment's sequence number

For each shot, describe:
1. Shot type (establishing, wide, medium, close-up, or detail)
2. Subject and action/pose — WHO is in this shot
3. Setting/environment details
4. Mood/atmosphere and lighting
5. Composition and framing${styleContext}${characterContext}${locationContext}${storyOverview}`
```

**Step 2: Build the characters_with_roles string**

Before the `messages` array, add:

```typescript
// Build character role context for director-style coverage
const characters_with_roles = characterDescriptions && Object.keys(characterDescriptions).length > 0
    ? Object.entries(characterDescriptions)
        .map(([name, desc]) => `- ${name}: ${desc || 'no description'}`)
        .join('\n')
    : 'No specific characters defined.'
```

**Step 3: Update the tool schema to allow more shots than segments**

In the `generate_shot_prompts` tool schema (lines 325-359), update the `shots` array description:

```typescript
shots: {
    type: 'array',
    description: 'Array of shot descriptions. You may generate MORE shots than input segments for proper director coverage.',
    items: {
        type: 'object',
        properties: {
            sequence: {
                type: 'number',
                description: 'Sequential shot number (may exceed input segment count for multi-shot coverage)'
            },
            prompt: {
                type: 'string',
                description: 'Detailed visual description for image generation (2-3 sentences). Include @character_tags for characters visible in the shot.'
            },
            shotType: {
                type: 'string',
                enum: ['establishing', 'wide', 'medium', 'close-up', 'detail'],
                description: 'The type of camera shot'
            },
            characterTags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of @character_tags visible in this shot (e.g., ["@geechi_gotti", "@det_berger"])'
            }
        },
        required: ['sequence', 'prompt', 'shotType']
    }
}
```

**Step 4: Update the response parsing to handle characterTags**

After parsing the tool response (around line 370), update:

```typescript
const result = JSON.parse(toolCall.function.arguments) as {
    shots: Array<{ sequence: number; prompt: string; shotType: string; characterTags?: string[] }>
}
return result.shots
```

**Step 5: Update the ShotBreakdown.tsx `generatePrompts` function**

In `ShotBreakdown.tsx`, the `characterRefs` building logic (around line 324) currently only matches characters with `has_reference`. Update it to match ALL characters:

Replace:
```typescript
characterRefs: characters.filter(c =>
    c.has_reference &&
    (promptLower.includes(c.name.toLowerCase()) ||
        processedPrompt.includes('@' + c.name.toLowerCase().replace(/\s+/g, '_')))
),
```

With:
```typescript
characterRefs: characters.filter(c => {
    const tag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
    // Match by tag in prompt, by name in prompt, or by API-returned characterTags
    const apiTags = (shot as { characterTags?: string[] }).characterTags || []
    return promptLower.includes(c.name.toLowerCase()) ||
        processedPrompt.includes(tag) ||
        apiTags.some(t => t === tag)
}),
```

**Step 6: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/features/storyboard/services/openrouter.service.ts src/features/storyboard/components/shot-list/ShotBreakdown.tsx
git commit -m "feat(storyboard): upgrade LLM to director-style shot generation with character coverage"
git push origin main
```

---

### Task 6: Create expand-shot API Route (AI "Write Them In")

**Files:**
- Create: `src/app/api/storyboard/expand-shot/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { shotSequence, characterTag, characterDescription, existingPrompt, storyContext, model } = body

        if (!existingPrompt || !characterTag) {
            return NextResponse.json(
                { error: 'existingPrompt and characterTag are required' },
                { status: 400 }
            )
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            )
        }

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

        const messages = [
            {
                role: 'system' as const,
                content: `You are a film director. A character needs to be added to a scene. Generate 1-3 new shots that naturally introduce and cover this character in the context of the existing scene.

Rules:
- These are STILL IMAGES, not video
- Use appropriate shot types: medium for introduction, close-up for emphasis
- Each new shot should show the character (${characterTag}) doing something relevant to the scene
- Reference the character using their @tag: ${characterTag}
- ${characterDescription ? `Character appearance: ${characterDescription}` : 'No specific appearance description available.'}
- Keep the visual style and atmosphere consistent with the existing shot`
            },
            {
                role: 'user' as const,
                content: `The current shot #${shotSequence} is:
"${existingPrompt}"

${storyContext ? `Story context: ${storyContext.substring(0, 1000)}` : ''}

Generate 1-3 new shots that add ${characterTag} to this scene. These will be inserted after shot #${shotSequence}.`
            }
        ]

        const tool = {
            type: 'function' as const,
            function: {
                name: 'expand_shot_with_character',
                description: 'Generate new shots that introduce a character into a scene',
                parameters: {
                    type: 'object',
                    properties: {
                        shots: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    prompt: {
                                        type: 'string',
                                        description: 'Detailed visual description for image generation'
                                    },
                                    shotType: {
                                        type: 'string',
                                        enum: ['establishing', 'wide', 'medium', 'close-up', 'detail']
                                    }
                                },
                                required: ['prompt', 'shotType']
                            },
                            minItems: 1,
                            maxItems: 3
                        }
                    },
                    required: ['shots']
                }
            }
        }

        const response = await service.callWithTool(messages, tool)
        const toolCall = response.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        const result = JSON.parse(toolCall.function.arguments) as {
            shots: Array<{ prompt: string; shotType: string }>
        }

        return NextResponse.json({ shots: result.shots })
    } catch (error) {
        logger.api.error('Expand shot error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to expand shot' },
            { status: 500 }
        )
    }
}
```

**Step 2: Check if `callWithTool` is public**

Check `openrouter.service.ts` — if `callWithTool` is private, change it to public (it's called `callWithTool` around line 100-ish). If it's already public or accessible via the service instance, we're good.

If it's private, the simplest fix is: in `openrouter.service.ts`, change `private async callWithTool` to `async callWithTool`.

**Step 3: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/storyboard/expand-shot/route.ts src/features/storyboard/services/openrouter.service.ts
git commit -m "feat(storyboard): add expand-shot API for AI character coverage generation"
git push origin main
```

---

### Task 7: Wire "Add Character → AI Expand" into ShotTableRow

**Files:**
- Modify: `src/features/storyboard/components/shot-list/ShotTableRow.tsx`
- Modify: `src/features/storyboard/components/shot-list/ShotTable.tsx`

**Step 1: Add expand-shot call to ShotTableRow**

In `ShotTableRow.tsx`, add props and logic:

Add to the `ShotTableRowProps` interface:
```typescript
onExpandWithCharacter?: (sequence: number, characterTag: string, characterDesc: string) => Promise<void>
isExpanding?: boolean
```

Update the `handleAddCharacter` function:
```typescript
const handleAddCharacter = async (char: StoryboardCharacter) => {
    // Add character to refs immediately
    onCharacterRefsChange(prompt.sequence, [...prompt.characterRefs, char])

    // Check if character is already mentioned in the prompt text
    const tag = '@' + char.name.toLowerCase().replace(/\s+/g, '_')
    const promptLower = prompt.prompt.toLowerCase()
    const alreadyMentioned = promptLower.includes(char.name.toLowerCase()) || prompt.prompt.includes(tag)

    // If character is NOT already in the prompt, trigger AI expansion
    if (!alreadyMentioned && onExpandWithCharacter) {
        await onExpandWithCharacter(prompt.sequence, tag, char.description || '')
    }
}
```

**Step 2: Add expand handler in ShotTable.tsx**

In `ShotTable.tsx`, add the expand handler:

```typescript
const [expandingSequence, setExpandingSequence] = useState<number | null>(null)
const storyText = useStoryboardStore(s => s.storyText)
const selectedModel = useStoryboardStore(s => s.selectedModel)
const insertShotsAfter = useStoryboardStore(s => s.insertShotsAfter)

const handleExpandWithCharacter = async (sequence: number, characterTag: string, characterDesc: string) => {
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

        // Build GeneratedShotPrompt objects for the new shots
        const newShots: GeneratedShotPrompt[] = data.shots.map((shot: { prompt: string; shotType: string }, i: number) => ({
            sequence: sequence + i + 1, // temporary, will be renumbered
            originalText: '',
            prompt: shot.prompt,
            shotType: shot.shotType as GeneratedShotPrompt['shotType'],
            characterRefs: characters.filter(c => {
                const tag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                return shot.prompt.toLowerCase().includes(c.name.toLowerCase()) || shot.prompt.includes(tag)
            }),
            edited: false,
        }))

        insertShotsAfter(sequence, newShots)
        toast.success(`Added ${newShots.length} coverage shot${newShots.length > 1 ? 's' : ''} for ${characterTag}`)
    } catch (err) {
        toast.error('Failed to generate coverage shots')
    } finally {
        setExpandingSequence(null)
    }
}
```

Pass to each row:
```tsx
<ShotTableRow
    ...
    onExpandWithCharacter={handleExpandWithCharacter}
    isExpanding={expandingSequence === prompt.sequence}
/>
```

**Step 3: Verify build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Manual test**

1. Open storyboard with the Geechi Gotti story
2. Generate prompts
3. On a shot that doesn't have Geechi, click + in the Characters cell and add him
4. Verify 1-3 new rows appear after that shot with appropriate coverage

**Step 5: Commit**

```bash
git add src/features/storyboard/components/shot-list/ShotTableRow.tsx src/features/storyboard/components/shot-list/ShotTable.tsx
git commit -m "feat(storyboard): wire AI character expansion into shot table"
git push origin main
```

---

### Task 8: Final Integration Test and Cleanup

**Files:**
- Possibly: minor tweaks to any files from tasks 1-7

**Step 1: Full build**

Run: `cd D:/git/directors-palette-v2 && rm -rf .next && npm run build 2>&1 | tail -10`
Expected: Clean build, no errors

**Step 2: End-to-end test**

1. Open `http://localhost:3002`
2. Go to Storyboard
3. Paste the Geechi Gotti story
4. Extract entities → verify Geechi Gotti is main character
5. Generate shot prompts → verify:
   - Multiple shots per key moment (establishing → wide → medium → close-up sequences)
   - Geechi Gotti appears in 70%+ of shots
   - Shot table displays correctly with all columns
6. Click a shot description → edit with @ autocomplete
7. Add a character to a shot via + button → verify AI expansion generates new shots
8. Export: click Copy → verify clipboard has formatted shot list
9. Export: click CSV → verify file downloads

**Step 3: Fix any issues found**

Address any build errors, type errors, or UI issues.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(storyboard): complete director's coverage overhaul — shot table, AI character coverage, @ autocomplete, export"
git push origin main
```
