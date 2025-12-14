'use client'

/**
 * Prompt Organizer Modal
 * 
 * Modal for viewing and editing structured prompt components.
 */

import { useState, useEffect, useCallback } from 'react'
import { Wand2, RefreshCw, Check, Copy, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { promptParserService } from '../../services/prompt-parser.service'
import type { StructuredPrompt, DetectedReference } from '../../types/prompt-organizer.types'

interface PromptOrganizerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prompt: string
    onApply: (newPrompt: string) => void
}

export function PromptOrganizerModal({
    open,
    onOpenChange,
    prompt,
    onApply
}: PromptOrganizerModalProps) {
    const [isParsing, setIsParsing] = useState(false)
    const [structured, setStructured] = useState<StructuredPrompt | null>(null)
    const [references, setReferences] = useState<DetectedReference[]>([])
    const [previewPrompt, setPreviewPrompt] = useState('')

    // Parse prompt when modal opens
    useEffect(() => {
        if (open && prompt) {
            parsePrompt()
        }
    }, [open, prompt])

    // Update preview when structured changes
    useEffect(() => {
        if (structured) {
            setPreviewPrompt(promptParserService.reconstruct(structured))
        }
    }, [structured])

    const parsePrompt = useCallback(async () => {
        setIsParsing(true)
        try {
            const result = await promptParserService.parse(prompt)
            setStructured(result.structured)
            setReferences(result.references)
        } catch (error) {
            console.error('Parse error:', error)
        } finally {
            setIsParsing(false)
        }
    }, [prompt])

    const handleFieldChange = (field: string, value: string) => {
        if (!structured) return

        if (field.startsWith('subject.')) {
            const subField = field.replace('subject.', '') as keyof typeof structured.subject
            setStructured({
                ...structured,
                subject: {
                    ...structured.subject,
                    [subField]: value || undefined
                }
            })
        } else {
            setStructured({
                ...structured,
                [field]: value || undefined
            })
        }
    }

    const handleApply = () => {
        onApply(previewPrompt)
        onOpenChange(false)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(previewPrompt)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-primary" />
                        Prompt Organizer
                    </DialogTitle>
                </DialogHeader>

                {isParsing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Analyzing prompt...</p>
                    </div>
                ) : structured ? (
                    <div className="space-y-6">
                        {/* Detected References */}
                        {references.length > 0 && (
                            <div className="space-y-2">
                                <Label>Detected References</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {references.map((ref, i) => (
                                        <Badge key={i} variant="secondary" className="text-sm">
                                            {ref.tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subject Section */}
                        <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                            <h3 className="font-medium">Subject</h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Reference</Label>
                                    <Input
                                        value={structured.subject.reference || ''}
                                        onChange={(e) => handleFieldChange('subject.reference', e.target.value)}
                                        placeholder="@character"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Emotion</Label>
                                    <Input
                                        value={structured.subject.emotion || ''}
                                        onChange={(e) => handleFieldChange('subject.emotion', e.target.value)}
                                        placeholder="contemplative, joyful, intense..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={structured.subject.description || ''}
                                    onChange={(e) => handleFieldChange('subject.description', e.target.value)}
                                    placeholder="Subject description..."
                                    className="min-h-[60px]"
                                />
                            </div>
                        </div>

                        {/* Scene Elements */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Wardrobe</Label>
                                <Input
                                    value={structured.wardrobe || ''}
                                    onChange={(e) => handleFieldChange('wardrobe', e.target.value)}
                                    placeholder="Clothing description..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input
                                    value={structured.location || ''}
                                    onChange={(e) => handleFieldChange('location', e.target.value)}
                                    placeholder="Setting/environment..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Lighting</Label>
                                <Input
                                    value={structured.lighting || ''}
                                    onChange={(e) => handleFieldChange('lighting', e.target.value)}
                                    placeholder="Golden hour, dramatic..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Framing</Label>
                                <Input
                                    value={structured.framing || ''}
                                    onChange={(e) => handleFieldChange('framing', e.target.value)}
                                    placeholder="Close-up, wide shot..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Camera Angle</Label>
                                <Input
                                    value={structured.angle || ''}
                                    onChange={(e) => handleFieldChange('angle', e.target.value)}
                                    placeholder="Low angle, high angle..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Camera Movement</Label>
                                <Input
                                    value={structured.cameraMovement || ''}
                                    onChange={(e) => handleFieldChange('cameraMovement', e.target.value)}
                                    placeholder="For video: dolly, pan..."
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">Video only</p>
                            </div>
                        </div>

                        {/* Additional */}
                        <div className="space-y-2">
                            <Label>Additional Details</Label>
                            <Textarea
                                value={structured.additional || ''}
                                onChange={(e) => handleFieldChange('additional', e.target.value)}
                                placeholder="Other details..."
                                className="min-h-[60px]"
                            />
                        </div>

                        {/* Live Preview */}
                        <div className="space-y-2 p-4 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <Label>Preview</Label>
                                <Button variant="ghost" size="sm" onClick={handleCopy}>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground min-h-[40px]">
                                {previewPrompt || 'Edit fields above to generate prompt...'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => parsePrompt()}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-parse
                            </Button>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApply}>
                                <Check className="w-4 h-4 mr-2" />
                                Apply
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>Failed to parse prompt.</p>
                        <Button variant="outline" onClick={parsePrompt} className="mt-4">
                            Try Again
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
