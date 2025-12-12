'use client'

import { useState } from 'react'
import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useWildcardsBrowserStore } from '../store'

export function WildcardAIGenerator() {
    const { toast } = useToast()
    const {
        draftName,
        draftContent,
        draftCategory,
        draftDescription,
        setDraftContent,
        isGenerating,
        setIsGenerating,
    } = useWildcardsBrowserStore()

    const [error, setError] = useState<string | null>(null)

    // Count existing entries
    const existingEntries = draftContent.split('\n').filter(l => l.trim())
    const hasMinimumEntry = existingEntries.length >= 1
    const hasName = draftName.trim().length > 0

    const canGenerate = hasName && hasMinimumEntry && !isGenerating

    const handleGenerate = async () => {
        if (!canGenerate) return

        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch('/api/wildcards/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: draftName,
                    existingEntries: existingEntries,
                    category: draftCategory || undefined,
                    description: draftDescription || undefined,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to generate entries')
            }

            const data = await response.json()

            if (data.entries && data.entries.length > 0) {
                // Append new entries to existing content
                const newContent = draftContent.trim()
                    ? `${draftContent.trim()}\n${data.entries.join('\n')}`
                    : data.entries.join('\n')

                setDraftContent(newContent)

                toast({
                    title: 'Entries Generated',
                    description: `Added ${data.entries.length} new entries to your wildcard.`,
                })
            } else {
                toast({
                    title: 'No New Entries',
                    description: 'The AI could not generate additional entries. Try different examples.',
                    variant: 'destructive',
                })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate entries'
            setError(message)
            toast({
                title: 'Generation Failed',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Card className="bg-card/50 border-primary/20">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    AI Assistant
                </CardTitle>
                <CardDescription className="text-xs">
                    Let AI generate more entries based on your examples
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Requirements checklist */}
                <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${hasName ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {hasName ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        Wildcard name entered
                    </div>
                    <div className={`flex items-center gap-2 ${hasMinimumEntry ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {hasMinimumEntry ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        At least 1 example entry added
                    </div>
                </div>

                {error && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </p>
                )}

                <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                >
                    {isGenerating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate More Entries
                        </>
                    )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                    Uses AI to synthesize ~10 additional entries in the same style
                </p>
            </CardContent>
        </Card>
    )
}
