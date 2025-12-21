'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { DirectorAvatar } from './DirectorAvatar'
import type { DirectorFingerprint, DirectorQuestion } from '../types/director.types'
import { cn } from '@/utils/utils'

interface DirectorQuestionsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    director: DirectorFingerprint
    onSubmit: (answers: Record<string, string>) => void
    onSkip: () => void
}

export function DirectorQuestionsDialog({
    open,
    onOpenChange,
    director,
    onSubmit,
    onSkip
}: DirectorQuestionsDialogProps) {
    // Initialize answers with defaults
    const defaultAnswers = useMemo(() => {
        const defaults: Record<string, string> = {}
        director.questions?.forEach(q => {
            const defaultOption = q.options.find(o => o.isDefault)
            if (defaultOption) {
                defaults[q.id] = defaultOption.value
            } else if (q.options.length > 0) {
                defaults[q.id] = q.options[0].value
            }
        })
        return defaults
    }, [director.questions])

    const [answers, setAnswers] = useState<Record<string, string>>(defaultAnswers)

    const questions = director.questions || []

    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }))
    }

    const handleSubmit = () => {
        onSubmit(answers)
    }

    const getCategoryColor = (category: DirectorQuestion['category']) => {
        switch (category) {
            case 'emotional': return 'border-l-rose-500'
            case 'visual': return 'border-l-blue-500'
            case 'narrative': return 'border-l-amber-500'
            case 'spectacle': return 'border-l-purple-500'
            default: return 'border-l-zinc-500'
        }
    }

    const getCategoryLabel = (category: DirectorQuestion['category']) => {
        switch (category) {
            case 'emotional': return 'Emotional'
            case 'visual': return 'Visual'
            case 'narrative': return 'Narrative'
            case 'spectacle': return 'Spectacle'
            default: return category
        }
    }

    if (questions.length === 0) {
        // No questions defined, skip automatically
        return null
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <DirectorAvatar director={director} className="h-12 w-12" />
                        <div>
                            <DialogTitle className="text-white">{director.name}</DialogTitle>
                            <DialogDescription className="text-sm">
                                wants to understand your vision better
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto">
                    {questions.map((question, index) => (
                        <div
                            key={question.id}
                            className={cn(
                                "space-y-3 pl-4 border-l-2",
                                getCategoryColor(question.category)
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-white font-medium">
                                    {index + 1}. {question.questionText}
                                </p>
                                <span className="text-xs text-muted-foreground bg-zinc-800 px-2 py-0.5 rounded">
                                    {getCategoryLabel(question.category)}
                                </span>
                            </div>

                            <RadioGroup
                                value={answers[question.id] || ''}
                                onValueChange={(value) => handleAnswerChange(question.id, value)}
                                className="space-y-2"
                            >
                                {question.options.map((option) => (
                                    <div
                                        key={option.value}
                                        className={cn(
                                            "flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                                            answers[question.id] === option.value
                                                ? "bg-zinc-800 border-zinc-600"
                                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                                        )}
                                        onClick={() => handleAnswerChange(question.id, option.value)}
                                    >
                                        <RadioGroupItem
                                            value={option.value}
                                            id={`${question.id}-${option.value}`}
                                            className="mt-0.5"
                                        />
                                        <Label
                                            htmlFor={`${question.id}-${option.value}`}
                                            className="flex-1 cursor-pointer"
                                        >
                                            <span className="text-white font-medium block">
                                                {option.label}
                                            </span>
                                            {option.description && (
                                                <span className="text-muted-foreground text-sm block mt-0.5">
                                                    {option.description}
                                                </span>
                                            )}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    ))}
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                        variant="ghost"
                        onClick={onSkip}
                        className="text-muted-foreground"
                    >
                        Skip Questions
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Continue with Vision
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
