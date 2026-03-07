'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Check, X, Trash2, Users } from 'lucide-react'
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

interface AutocompleteOption {
    tag: string
    label: string
    thumbnail?: string
    characterId: string
    character: StoryboardCharacter
    isNumberedRef: boolean
}

interface ShotTableRowProps {
    prompt: GeneratedShotPrompt
    characters: StoryboardCharacter[]
    referenceIndexMap: Record<string, number>
    onPromptChange: (sequence: number, newPrompt: string) => void
    onCharacterRefsChange: (sequence: number, characterRefs: StoryboardCharacter[]) => void
    onDelete: (sequence: number) => void
    onExpandWithCharacter?: (sequence: number, characterTag: string, characterDesc: string) => Promise<void>
    isExpanding?: boolean
}

export function ShotTableRow({
    prompt,
    characters,
    referenceIndexMap,
    onPromptChange,
    onCharacterRefsChange,
    onDelete,
    onExpandWithCharacter,
    isExpanding,
}: ShotTableRowProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(prompt.prompt)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // @ autocomplete state
    const [autocompleteOpen, setAutocompleteOpen] = useState(false)
    const [autocompleteIndex, setAutocompleteIndex] = useState(0)
    const [triggerPosition, setTriggerPosition] = useState(0)
    const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([])

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
                // Build combined options: name tags + @reference_N tags
                const options: AutocompleteOption[] = []
                for (const c of characters) {
                    const nameTag = '@' + c.name.toLowerCase().replace(/\s+/g, '_')
                    options.push({
                        tag: nameTag,
                        label: c.name,
                        thumbnail: c.reference_image_url,
                        characterId: c.id,
                        character: c,
                        isNumberedRef: false,
                    })
                    const refNum = referenceIndexMap[c.id]
                    if (refNum !== undefined) {
                        options.push({
                            tag: `@reference_${refNum}`,
                            label: `Reference ${refNum} (${c.name})`,
                            thumbnail: c.reference_image_url,
                            characterId: c.id,
                            character: c,
                            isNumberedRef: true,
                        })
                    }
                }

                const query = queryText.toLowerCase()
                const matches = options.filter(opt =>
                    opt.tag.slice(1).toLowerCase().includes(query) || opt.label.toLowerCase().includes(query)
                )
                if (matches.length > 0) {
                    setAutocompleteOpen(true)
                    setFilteredOptions(matches)
                    setAutocompleteIndex(0)
                    setTriggerPosition(lastAtIndex)
                    return
                }
            }
        }
        setAutocompleteOpen(false)
    }, [characters, referenceIndexMap])

    // Handle autocomplete selection
    const handleAutocompleteSelect = useCallback((option: AutocompleteOption) => {
        const tag = option.tag
        const before = editedPrompt.slice(0, triggerPosition)
        const cursorPos = textareaRef.current?.selectionStart || editedPrompt.length
        const after = editedPrompt.slice(cursorPos)
        const newText = before + tag + ' ' + after
        setEditedPrompt(newText)
        setAutocompleteOpen(false)

        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = triggerPosition + tag.length + 1
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
            setAutocompleteIndex(i => Math.min(i + 1, filteredOptions.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setAutocompleteIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault()
            const option = filteredOptions[autocompleteIndex]
            if (option) handleAutocompleteSelect(option)
        } else if (e.key === 'Escape') {
            setAutocompleteOpen(false)
        }
    }, [autocompleteOpen, filteredOptions, autocompleteIndex, handleAutocompleteSelect])

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

    const handleAddCharacter = async (char: StoryboardCharacter) => {
        onCharacterRefsChange(prompt.sequence, [...prompt.characterRefs, char])

        // If character NOT already mentioned in prompt text, trigger AI expansion
        const tag = '@' + char.name.toLowerCase().replace(/\s+/g, '_')
        const promptLower = prompt.prompt.toLowerCase()
        const alreadyMentioned = promptLower.includes(char.name.toLowerCase()) || prompt.prompt.includes(tag)

        if (!alreadyMentioned && onExpandWithCharacter) {
            await onExpandWithCharacter(prompt.sequence, tag, char.description || '')
        }
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
                        {/* Inline @ autocomplete dropdown */}
                        {autocompleteOpen && (
                            <div className="absolute z-20 top-full left-0 mt-1 bg-popover border rounded-md shadow-md p-1 min-w-[220px] max-h-[200px] overflow-y-auto">
                                {filteredOptions.map((opt, idx) => (
                                    <button
                                        key={`${opt.characterId}-${opt.isNumberedRef ? 'ref' : 'name'}`}
                                        className={`w-full flex items-center gap-2 p-1.5 rounded text-xs hover:bg-muted ${idx === autocompleteIndex ? 'bg-muted' : ''}`}
                                        onMouseDown={(e) => { e.preventDefault(); handleAutocompleteSelect(opt) }}
                                    >
                                        {opt.thumbnail ? (
                                            <img src={opt.thumbnail} alt={opt.label} className="w-5 h-5 rounded-full object-cover" />
                                        ) : (
                                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                                <Users className="w-3 h-3" />
                                            </span>
                                        )}
                                        <span className="font-medium">{opt.label}</span>
                                        <span className={`ml-auto ${opt.isNumberedRef ? 'text-cyan-400' : 'text-muted-foreground'}`}>{opt.tag}</span>
                                    </button>
                                ))}
                            </div>
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
                                    {isExpanding ? (
                                        <span className="animate-spin">↻</span>
                                    ) : '+'}
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
