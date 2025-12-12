'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Maximize2, Minimize2, Copy, Check } from 'lucide-react'

interface ExpandablePromptProps {
    prompt: string
    sequence: number
    shotType?: string
    color?: string
    onEdit?: (newPrompt: string) => void
    readOnly?: boolean
}

export function ExpandablePrompt({
    prompt,
    sequence,
    shotType,
    color,
    onEdit,
    readOnly = false
}: ExpandablePromptProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [localPrompt, setLocalPrompt] = useState(prompt)
    const [copied, setCopied] = useState(false)

    const handleChange = useCallback((value: string) => {
        setLocalPrompt(value)
        onEdit?.(value)
    }, [onEdit])

    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(localPrompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [localPrompt])

    const handleClose = useCallback(() => {
        setIsExpanded(false)
    }, [])

    // Collapsed view - compact preview
    if (!isExpanded) {
        return (
            <div
                className="group relative p-2 rounded-lg border bg-card/50 hover:bg-card/80 cursor-pointer transition-colors"
                onClick={() => setIsExpanded(true)}
            >
                <div className="flex items-start gap-2">
                    <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: color || '#6b7280' }}
                    >
                        {sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                        {shotType && (
                            <Badge variant="outline" className="text-[10px] capitalize py-0 mb-1">
                                {shotType}
                            </Badge>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {prompt}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsExpanded(true)
                        }}
                    >
                        <Maximize2 className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        )
    }

    // Expanded view - full screen modal
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal Content */}
            <Card className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: color || '#6b7280' }}
                            >
                                {sequence}
                            </div>
                            <span>Shot {sequence} Prompt</span>
                            {shotType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                    {shotType}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <Check className="w-3 h-3 mr-1 text-green-500" />
                                ) : (
                                    <Copy className="w-3 h-3 mr-1" />
                                )}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={handleClose}
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-y-auto max-h-[calc(90vh-80px)]">
                    <Textarea
                        value={localPrompt}
                        onChange={(e) => handleChange(e.target.value)}
                        readOnly={readOnly}
                        className="min-h-[400px] font-mono text-sm resize-none"
                        placeholder="Enter shot prompt..."
                    />
                    {!readOnly && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Changes are saved automatically
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
