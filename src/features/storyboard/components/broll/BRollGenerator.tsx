'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Film, Sparkles, Trash2, Play } from 'lucide-react'
import { useStoryboardStore } from '../../store'

export function BRollGenerator() {
    const { storyText, brollShots, setBRollShots, currentStyleGuide, selectedModel } = useStoryboardStore()

    const [isGenerating, setIsGenerating] = useState(false)
    const [shotCount, setShotCount] = useState(5)
    const [error, setError] = useState<string | null>(null)

    const handleGenerateBRoll = async () => {
        if (!storyText.trim()) return

        setIsGenerating(true)
        setError(null)

        try {
            const response = await fetch('/api/storyboard/broll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyText: storyText.trim(),
                    count: shotCount,
                    model: selectedModel
                })
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'B-Roll generation failed')
            }

            const result = await response.json()

            // Create B-Roll shot objects
            const newBRollShots = result.prompts.map((prompt: string, i: number) => ({
                id: `broll-${Date.now()}-${i}`,
                storyboard_id: '',
                context_text: storyText.slice(0, 200),
                prompt,
                status: 'pending',
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }))

            setBRollShots([...brollShots, ...newBRollShots])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleRemoveBRoll = (id: string) => {
        setBRollShots(brollShots.filter(s => s.id !== id))
    }

    const handleGenerateBRollImages = async () => {
        // This would trigger image generation for B-Roll shots
        // Using the same Nano Banana Pro pipeline
        console.log('Generating B-Roll images...')
    }

    if (!storyText.trim()) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No story text yet.</p>
                    <p className="text-sm">Enter a story to generate B-Roll shots.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Film className="w-5 h-5" />
                        B-Roll Generator
                    </CardTitle>
                    <CardDescription>
                        Generate contextual reinforcement shots that support your narrative
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Number of B-Roll Shots</Label>
                            <Input
                                type="number"
                                min={1}
                                max={10}
                                value={shotCount}
                                onChange={(e) => setShotCount(parseInt(e.target.value) || 5)}
                                className="w-32"
                            />
                        </div>
                        <Button
                            onClick={handleGenerateBRoll}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate B-Roll Ideas
                                </>
                            )}
                        </Button>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {currentStyleGuide && (
                        <p className="text-sm text-muted-foreground">
                            Style will be applied: {currentStyleGuide.name}
                        </p>
                    )}
                </CardContent>
            </Card>

            {brollShots.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                            <span>Generated B-Roll Shots ({brollShots.length})</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateBRollImages}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Generate Images
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {brollShots.map((shot, index) => (
                                    <div
                                        key={shot.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
                                    >
                                        <Badge variant="secondary" className="mt-0.5">
                                            B{index + 1}
                                        </Badge>
                                        <p className="flex-1 text-sm">{shot.prompt}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleRemoveBRoll(shot.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
