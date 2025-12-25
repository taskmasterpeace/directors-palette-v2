'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Film, Sparkles, Trash2, Play, CheckCircle, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useStoryboardStore } from '../../store'
import { useCreditsStore } from '@/features/credits/store/credits.store'
import { toast } from 'sonner'

export function BRollGenerator() {
    const {
        storyText,
        brollShots,
        setBRollShots,
        updateBRollShot,
        currentStyleGuide,
        selectedModel,
        generationSettings
    } = useStoryboardStore()
    const { balance, fetchBalance } = useCreditsStore()

    const [isGenerating, setIsGenerating] = useState(false)
    const [isGeneratingImages, setIsGeneratingImages] = useState(false)
    const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 })
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

    // Helper to poll for prediction completion
    const pollPrediction = async (predictionId: string): Promise<{ output: string; status: string }> => {
        const maxAttempts = 60  // 2 minute timeout
        for (let i = 0; i < maxAttempts; i++) {
            const res = await fetch(`/api/generation/status/${predictionId}`)
            const data = await res.json()

            if (data.status === 'succeeded') {
                return { output: data.persistedUrl || data.output, status: 'succeeded' }
            }
            if (data.status === 'failed') {
                throw new Error(data.error || 'Generation failed')
            }

            // Wait 2 seconds between polls
            await new Promise(r => setTimeout(r, 2000))
        }
        throw new Error('Generation timed out')
    }

    const handleGenerateBRollImages = async () => {
        // Filter shots that need generation (pending or ready status)
        const shotsToGenerate = brollShots.filter(
            s => s.status === 'pending' || s.status === 'ready'
        )

        if (shotsToGenerate.length === 0) {
            toast.error('No B-Roll shots ready for generation')
            return
        }

        // Credit check
        const costPerShot = 20  // cents for nano-banana-pro
        const totalCost = shotsToGenerate.length * costPerShot

        try {
            await fetchBalance()
        } catch {
            // Continue anyway, API will catch it
        }

        if (balance < totalCost) {
            toast.error(
                `Insufficient credits. Need ${totalCost} tokens but you have ${balance}.`,
                { duration: 5000 }
            )
            return
        }

        // Confirm generation
        const confirmed = confirm(
            `Generate ${shotsToGenerate.length} B-Roll images for approximately ${totalCost} tokens?\n\nYour balance: ${balance} tokens`
        )
        if (!confirmed) return

        setIsGeneratingImages(true)
        setImageProgress({ current: 0, total: shotsToGenerate.length })

        const { aspectRatio, resolution } = generationSettings

        for (let i = 0; i < shotsToGenerate.length; i++) {
            const shot = shotsToGenerate[i]
            setImageProgress({ current: i + 1, total: shotsToGenerate.length })

            // Update status to generating
            updateBRollShot(shot.id, { status: 'generating' })

            try {
                // Build prompt with style guide if available
                const finalPrompt = currentStyleGuide
                    ? `${currentStyleGuide.style_prompt}, ${shot.prompt}`
                    : shot.prompt

                // Call image generation API
                const response = await fetch('/api/generation/image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'nano-banana-pro',
                        prompt: finalPrompt,
                        modelSettings: { aspectRatio, resolution }
                    })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Generation failed')
                }

                const { predictionId, galleryId } = await response.json()

                // Poll for completion
                const result = await pollPrediction(predictionId)

                // Update shot with completed status and image URL
                updateBRollShot(shot.id, {
                    status: 'completed',
                    generated_image_url: result.output,
                    gallery_id: galleryId,
                    metadata: {
                        ...shot.metadata,
                        predictionId,
                        generatedAt: new Date().toISOString()
                    }
                })
            } catch (err) {
                // Update shot with failed status
                updateBRollShot(shot.id, {
                    status: 'failed',
                    metadata: {
                        ...shot.metadata,
                        error: err instanceof Error ? err.message : 'Unknown error'
                    }
                })
            }
        }

        setIsGeneratingImages(false)

        // Show completion summary
        const completed = brollShots.filter(s => s.status === 'completed').length
        const failed = brollShots.filter(s => s.status === 'failed').length

        if (failed === 0) {
            toast.success(`All ${completed} B-Roll images generated successfully!`)
        } else {
            toast.warning(`Generated ${completed} images, ${failed} failed`)
        }
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
                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
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
                            <div className="flex items-center gap-2">
                                {isGeneratingImages && (
                                    <Badge variant="secondary" className="text-xs">
                                        {imageProgress.current}/{imageProgress.total}
                                    </Badge>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleGenerateBRollImages}
                                    disabled={isGeneratingImages || brollShots.filter(s => s.status === 'pending' || s.status === 'ready').length === 0}
                                >
                                    {isGeneratingImages ? (
                                        <>
                                            <LoadingSpinner size="sm" color="current" className="mr-2" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Generate Images
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Progress bar during generation */}
                        {isGeneratingImages && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Generating image {imageProgress.current} of {imageProgress.total}...</span>
                                    <span>{Math.round((imageProgress.current / imageProgress.total) * 100)}%</span>
                                </div>
                                <Progress value={(imageProgress.current / imageProgress.total) * 100} />
                            </div>
                        )}

                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {brollShots.map((shot, index) => (
                                    <div
                                        key={shot.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                                            shot.status === 'completed' ? 'bg-green-500/5 border-green-500/30' :
                                            shot.status === 'failed' ? 'bg-red-500/5 border-red-500/30' :
                                            shot.status === 'generating' ? 'bg-blue-500/5 border-blue-500/30' :
                                            'bg-card/50'
                                        }`}
                                    >
                                        <Badge variant="secondary" className="mt-0.5">
                                            B{index + 1}
                                        </Badge>

                                        {/* Show image thumbnail if generated */}
                                        {shot.generated_image_url && (
                                            <img
                                                src={shot.generated_image_url}
                                                alt={`B-Roll ${index + 1}`}
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm line-clamp-2">{shot.prompt}</p>
                                            {shot.status === 'failed' && typeof shot.metadata?.error === 'string' && (
                                                <p className="text-xs text-destructive mt-1">
                                                    {shot.metadata.error}
                                                </p>
                                            )}
                                        </div>

                                        {/* Status indicator */}
                                        <div className="flex-shrink-0">
                                            {shot.status === 'generating' && (
                                                <LoadingSpinner size="sm" color="accent" />
                                            )}
                                            {shot.status === 'completed' && (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            )}
                                            {shot.status === 'failed' && (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleRemoveBRoll(shot.id)}
                                            disabled={isGeneratingImages}
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
