'use client'

/**
 * Prompt Organizer Modal
 *
 * Modal for viewing and editing structured prompt components.
 * Uses comprehensive Page2Prompt token system.
 */

import { useState, useEffect, useCallback } from 'react'
import { Wand2, RefreshCw, Check, Copy, ChevronDown, ChevronRight, Camera, Users, Palette, Move, Sparkles } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { promptParserService } from '../../services/prompt-parser.service'
import type { StructuredPrompt, DetectedReference } from '../../types/prompt-organizer.types'
import { logger } from '@/lib/logger'

interface PromptOrganizerModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    prompt: string
    onApply: (newPrompt: string) => void
}

// Field options for dropdowns
const SHOT_SIZE_OPTIONS = ['ECU', 'BCU', 'CU', 'MCU', 'MS', 'MCS', 'KNEE', 'MWS', 'FS', 'WS', 'EWS', 'EST']
const CAMERA_ANGLE_OPTIONS = ['eye-level', 'low-angle', 'high-angle', 'worms-eye', 'birds-eye', 'overhead', 'hip-level', 'dutch-angle']
const SUBJECT_FACING_OPTIONS = ['frontal', 'three-quarter', 'profile', 'three-quarter-back', 'from-behind']
const SHOT_TYPE_OPTIONS = ['single', 'two-shot', 'group-shot', 'over-shoulder', 'reaction', 'insert', 'pov']
const FRAMING_OPTIONS = ['centered', 'rule-of-thirds', 'symmetrical', 'asymmetrical', 'leading-lines', 'frame-within-frame', 'negative-space', 'tight-framing']
const ACTION_OPTIONS = ['standing', 'sitting', 'lying-down', 'leaning', 'crouching', 'kneeling', 'walking', 'running', 'jumping', 'climbing', 'falling', 'talking', 'listening', 'looking-at', 'looking-away', 'reaching', 'holding', 'pointing', 'crying', 'laughing', 'screaming', 'thinking', 'reacting', 'fighting', 'dancing', 'embracing', 'kissing']
const SHOT_PURPOSE_OPTIONS = ['moment', 'establishing', 'transition', 'broll', 'reaction', 'insert']
const LENS_EFFECT_OPTIONS = ['sharp', 'soft-focus', 'anamorphic', 'vintage-lens', 'tilt-shift', 'macro', 'fisheye', 'telephoto-compression']
const DEPTH_OF_FIELD_OPTIONS = ['shallow-dof', 'deep-focus', 'rack-focus', 'split-diopter', 'bokeh']
const COLOR_GRADE_OPTIONS = ['neutral', 'warm', 'cool', 'desaturated', 'vibrant', 'teal-orange', 'monochromatic', 'cross-processed', 'bleach-bypass']
const FILM_GRAIN_OPTIONS = ['none', 'fine-grain', 'medium-grain', 'heavy-grain', '35mm', '16mm', '8mm']
const CAMERA_MOVEMENT_OPTIONS = ['static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'dolly-in', 'dolly-out', 'tracking-left', 'tracking-right', 'crane-up', 'crane-down', 'zoom-in', 'zoom-out', 'handheld', 'steadicam', 'orbit', 'push-in', 'pull-back']
const MOVEMENT_INTENSITY_OPTIONS = ['subtle', 'gentle', 'moderate', 'dynamic', 'aggressive']
const SUBJECT_MOTION_OPTIONS = ['static', 'slight-movement', 'walking', 'running', 'gesturing', 'turning', 'dancing', 'fighting']

interface SectionProps {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    defaultOpen?: boolean
    color: string
}

function Section({ title, icon, children, defaultOpen = true, color }: SectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className={`flex items-center gap-2 w-full p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors`}>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span className={color}>{icon}</span>
                <span className="font-medium">{title}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1">
                {children}
            </CollapsibleContent>
        </Collapsible>
    )
}

interface SelectFieldProps {
    label: string
    value: string | undefined
    options: string[]
    onChange: (value: string) => void
    placeholder?: string
    allowCustom?: boolean
}

function SelectField({ label, value, options, onChange, placeholder, allowCustom = true }: SelectFieldProps) {
    const [isCustom, setIsCustom] = useState(false)

    return (
        <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {isCustom ? (
                <div className="flex gap-1">
                    <Input
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="h-8 text-sm"
                    />
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsCustom(false)}>
                        ✕
                    </Button>
                </div>
            ) : (
                <div className="flex flex-wrap gap-1">
                    {options.map((opt) => (
                        <Badge
                            key={opt}
                            variant={value === opt ? 'default' : 'outline'}
                            className="cursor-pointer text-xs hover:bg-primary/20 transition-colors"
                            onClick={() => onChange(value === opt ? '' : opt)}
                        >
                            {opt}
                        </Badge>
                    ))}
                    {allowCustom && (
                        <Badge
                            variant="outline"
                            className="cursor-pointer text-xs hover:bg-primary/20 border-dashed"
                            onClick={() => setIsCustom(true)}
                        >
                            + custom
                        </Badge>
                    )}
                </div>
            )}
        </div>
    )
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

    // Define parsePrompt before using it in useEffect
    const parsePrompt = useCallback(async () => {
        setIsParsing(true)
        try {
            const result = await promptParserService.parse(prompt)
            setStructured(result.structured)
            setReferences(result.references)
        } catch (error) {
            logger.shotCreator.error('Parse error', { error: error instanceof Error ? error.message : String(error) })
        } finally {
            setIsParsing(false)
        }
    }, [prompt])

    // Parse prompt when modal opens
    useEffect(() => {
        if (open && prompt) {
            parsePrompt()
        }
    }, [open, prompt, parsePrompt])

    // Update preview when structured changes
    useEffect(() => {
        if (structured) {
            setPreviewPrompt(promptParserService.reconstruct(structured))
        }
    }, [structured])

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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-primary" />
                        Prompt Organizer
                    </DialogTitle>
                </DialogHeader>

                {isParsing ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <LoadingSpinner size="lg" className="mb-4" />
                        <p className="text-muted-foreground">Analyzing prompt...</p>
                    </div>
                ) : structured ? (
                    <div className="space-y-4">
                        {/* Detected References */}
                        {references.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">References:</span>
                                {references.map((ref, i) => (
                                    <Badge key={i} variant="secondary" className="text-sm">
                                        {ref.tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* CINEMATOGRAPHY Section */}
                        <Section
                            title="Cinematography"
                            icon={<Camera className="w-4 h-4" />}
                            color="text-blue-400"
                            defaultOpen={true}
                        >
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <SelectField
                                    label="Shot Size"
                                    value={structured.shotSize}
                                    options={SHOT_SIZE_OPTIONS}
                                    onChange={(v) => handleFieldChange('shotSize', v)}
                                    placeholder="e.g., MS, CU, WS"
                                />
                                <SelectField
                                    label="Camera Angle"
                                    value={structured.cameraAngle}
                                    options={CAMERA_ANGLE_OPTIONS}
                                    onChange={(v) => handleFieldChange('cameraAngle', v)}
                                    placeholder="e.g., eye-level, low-angle"
                                />
                                <SelectField
                                    label="Subject Facing"
                                    value={structured.subjectFacing}
                                    options={SUBJECT_FACING_OPTIONS}
                                    onChange={(v) => handleFieldChange('subjectFacing', v)}
                                    placeholder="e.g., frontal, profile"
                                />
                                <SelectField
                                    label="Shot Type"
                                    value={structured.shotType}
                                    options={SHOT_TYPE_OPTIONS}
                                    onChange={(v) => handleFieldChange('shotType', v)}
                                    placeholder="e.g., single, two-shot"
                                />
                                <SelectField
                                    label="Framing"
                                    value={structured.framing}
                                    options={FRAMING_OPTIONS}
                                    onChange={(v) => handleFieldChange('framing', v)}
                                    placeholder="e.g., centered, rule-of-thirds"
                                />
                            </div>
                        </Section>

                        {/* CONTENT Section */}
                        <Section
                            title="Content"
                            icon={<Users className="w-4 h-4" />}
                            color="text-green-400"
                            defaultOpen={true}
                        >
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Subject Reference</Label>
                                        <Input
                                            value={structured.subject.reference || ''}
                                            onChange={(e) => handleFieldChange('subject.reference', e.target.value)}
                                            placeholder="@character"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Subject Description</Label>
                                        <Input
                                            value={structured.subject.description || ''}
                                            onChange={(e) => handleFieldChange('subject.description', e.target.value)}
                                            placeholder="man, woman, person..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                <SelectField
                                    label="Action (what subject is doing)"
                                    value={structured.action}
                                    options={ACTION_OPTIONS}
                                    onChange={(v) => handleFieldChange('action', v)}
                                    placeholder="e.g., standing, running, talking"
                                />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Emotion</Label>
                                        <Input
                                            value={structured.subject.emotion || ''}
                                            onChange={(e) => handleFieldChange('subject.emotion', e.target.value)}
                                            placeholder="contemplative, joyful, intense..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Wardrobe</Label>
                                        <Input
                                            value={structured.wardrobe || ''}
                                            onChange={(e) => handleFieldChange('wardrobe', e.target.value)}
                                            placeholder="Clothing description..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Foreground</Label>
                                        <Input
                                            value={structured.foreground || ''}
                                            onChange={(e) => handleFieldChange('foreground', e.target.value)}
                                            placeholder="out-of-focus elements, foliage..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Background / Location</Label>
                                        <Input
                                            value={structured.background || ''}
                                            onChange={(e) => handleFieldChange('background', e.target.value)}
                                            placeholder="urban city, nature, interior..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>

                                <SelectField
                                    label="Shot Purpose"
                                    value={structured.shotPurpose}
                                    options={SHOT_PURPOSE_OPTIONS}
                                    onChange={(v) => handleFieldChange('shotPurpose', v)}
                                    placeholder="moment, establishing, broll..."
                                    allowCustom={false}
                                />
                            </div>
                        </Section>

                        {/* VISUAL LOOK Section */}
                        <Section
                            title="Visual Look"
                            icon={<Palette className="w-4 h-4" />}
                            color="text-purple-400"
                            defaultOpen={false}
                        >
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <SelectField
                                        label="Lens Effect"
                                        value={structured.lensEffect}
                                        options={LENS_EFFECT_OPTIONS}
                                        onChange={(v) => handleFieldChange('lensEffect', v)}
                                        placeholder="sharp, soft-focus, anamorphic..."
                                    />
                                    <SelectField
                                        label="Depth of Field"
                                        value={structured.depthOfField}
                                        options={DEPTH_OF_FIELD_OPTIONS}
                                        onChange={(v) => handleFieldChange('depthOfField', v)}
                                        placeholder="shallow-dof, deep-focus..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Lighting</Label>
                                    <Input
                                        value={structured.lighting || ''}
                                        onChange={(e) => handleFieldChange('lighting', e.target.value)}
                                        placeholder="golden hour, dramatic rim light, soft natural..."
                                        className="h-8 text-sm"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <SelectField
                                        label="Color Grade"
                                        value={structured.colorGrade}
                                        options={COLOR_GRADE_OPTIONS}
                                        onChange={(v) => handleFieldChange('colorGrade', v)}
                                        placeholder="neutral, warm, teal-orange..."
                                    />
                                    <SelectField
                                        label="Film Grain"
                                        value={structured.filmGrain}
                                        options={FILM_GRAIN_OPTIONS}
                                        onChange={(v) => handleFieldChange('filmGrain', v)}
                                        placeholder="none, 35mm, fine-grain..."
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* MOTION Section */}
                        <Section
                            title="Motion (Video)"
                            icon={<Move className="w-4 h-4" />}
                            color="text-orange-400"
                            defaultOpen={false}
                        >
                            <div className="space-y-4">
                                <SelectField
                                    label="Camera Movement"
                                    value={structured.cameraMovement}
                                    options={CAMERA_MOVEMENT_OPTIONS}
                                    onChange={(v) => handleFieldChange('cameraMovement', v)}
                                    placeholder="static, dolly-in, pan-left..."
                                />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <SelectField
                                        label="Movement Intensity"
                                        value={structured.movementIntensity}
                                        options={MOVEMENT_INTENSITY_OPTIONS}
                                        onChange={(v) => handleFieldChange('movementIntensity', v)}
                                        placeholder="subtle, moderate, dynamic..."
                                        allowCustom={false}
                                    />
                                    <SelectField
                                        label="Subject Motion"
                                        value={structured.subjectMotion}
                                        options={SUBJECT_MOTION_OPTIONS}
                                        onChange={(v) => handleFieldChange('subjectMotion', v)}
                                        placeholder="static, walking, gesturing..."
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* STYLE Section */}
                        <Section
                            title="Style & Additional"
                            icon={<Sparkles className="w-4 h-4" />}
                            color="text-amber-400"
                            defaultOpen={false}
                        >
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Style Prefix</Label>
                                        <Input
                                            value={structured.stylePrefix || ''}
                                            onChange={(e) => handleFieldChange('stylePrefix', e.target.value)}
                                            placeholder="cinematic, photorealistic..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-muted-foreground">Style Suffix</Label>
                                        <Input
                                            value={structured.styleSuffix || ''}
                                            onChange={(e) => handleFieldChange('styleSuffix', e.target.value)}
                                            placeholder="film grain, ARRI look..."
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Additional Details</Label>
                                    <Textarea
                                        value={structured.additional || ''}
                                        onChange={(e) => handleFieldChange('additional', e.target.value)}
                                        placeholder="Any other details not categorized above..."
                                        className="min-h-[60px] text-sm"
                                    />
                                </div>
                            </div>
                        </Section>

                        {/* Live Preview */}
                        <div className="space-y-2 p-4 rounded-lg border bg-muted/20">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Generated Prompt</Label>
                                <Button variant="ghost" size="sm" onClick={handleCopy}>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground min-h-[60px] whitespace-pre-wrap">
                                {previewPrompt || 'Edit fields above to generate prompt...'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-2">
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
