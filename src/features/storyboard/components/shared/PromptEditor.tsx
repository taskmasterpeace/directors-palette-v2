'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface PromptVariable {
    name: string
    value: string
    description?: string
    editable?: boolean
}

interface PromptEditorProps {
    title: string
    prompt: string
    variables: PromptVariable[]
    onPromptChange?: (prompt: string) => void
    onVariableChange?: (name: string, value: string) => void
    collapsible?: boolean
    defaultOpen?: boolean
    className?: string
}

/**
 * Renders prompt text with highlighted variables
 */
function HighlightedPrompt({
    prompt,
    variables
}: {
    prompt: string
    variables: PromptVariable[]
}) {
    const parts = useMemo(() => {
        const result: Array<{ type: 'text' | 'variable'; content: string; variable?: PromptVariable }> = []
        let currentIndex = 0

        // Find all variable placeholders
        const regex = /<([A-Z_]+)>/g
        let match

        while ((match = regex.exec(prompt)) !== null) {
            // Add text before variable
            if (match.index > currentIndex) {
                result.push({
                    type: 'text',
                    content: prompt.slice(currentIndex, match.index)
                })
            }

            // Add variable
            const varName = match[1]
            const variable = variables.find(v => v.name === varName)
            result.push({
                type: 'variable',
                content: match[0],
                variable
            })

            currentIndex = match.index + match[0].length
        }

        // Add remaining text
        if (currentIndex < prompt.length) {
            result.push({
                type: 'text',
                content: prompt.slice(currentIndex)
            })
        }

        return result
    }, [prompt, variables])

    return (
        <div className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (part.type === 'variable') {
                    return (
                        <span
                            key={index}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold"
                            title={part.variable?.value || 'Not set'}
                        >
                            {part.content}
                        </span>
                    )
                }
                return <span key={index}>{part.content}</span>
            })}
        </div>
    )
}

/**
 * Applies variable values to prompt template
 */
export function applyVariablesToPrompt(prompt: string, variables: PromptVariable[]): string {
    let result = prompt
    for (const variable of variables) {
        const regex = new RegExp(`<${variable.name}>`, 'g')
        result = result.replace(regex, variable.value)
    }
    return result
}

export function PromptEditor({
    title,
    prompt,
    variables,
    onPromptChange,
    onVariableChange,
    collapsible = true,
    defaultOpen = false,
    className = ''
}: PromptEditorProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const [isEditing, setIsEditing] = useState(false)
    const [editedPrompt, setEditedPrompt] = useState(prompt)

    const handleSaveEdit = () => {
        onPromptChange?.(editedPrompt)
        setIsEditing(false)
    }

    const handleCancelEdit = () => {
        setEditedPrompt(prompt)
        setIsEditing(false)
    }

    const content = (
        <div className="space-y-4">
            {/* Variables */}
            {variables.filter(v => v.editable !== false).length > 0 && (
                <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Variables</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {variables.filter(v => v.editable !== false).map((variable) => (
                            <div key={variable.name} className="space-y-1">
                                <Label className="text-xs font-medium">{variable.name.replace(/_/g, ' ')}</Label>
                                <Input
                                    value={variable.value}
                                    onChange={(e) => onVariableChange?.(variable.name, e.target.value)}
                                    placeholder={variable.description || `Enter ${variable.name.toLowerCase()}`}
                                    className="h-8 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Prompt Template */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Prompt Template</Label>
                    {onPromptChange && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            <Edit3 className="w-3 h-3 mr-1" />
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-2">
                        <Textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            className="min-h-[100px] font-mono text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit}>
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-3 rounded-lg border bg-muted/30">
                        <HighlightedPrompt prompt={prompt} variables={variables} />
                    </div>
                )}
            </div>

            {/* Final Prompt Preview */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview (with variables applied)</Label>
                <div className="p-3 rounded-lg border bg-card/50 text-sm">
                    {applyVariablesToPrompt(prompt, variables)}
                </div>
            </div>
        </div>
    )

    if (!collapsible) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{title}</CardTitle>
                </CardHeader>
                <CardContent>{content}</CardContent>
            </Card>
        )
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
            <Card>
                <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Edit3 className="w-4 h-4" />
                                {title}
                            </span>
                            {isOpen ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </CardTitle>
                    </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <CardContent>{content}</CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    )
}
