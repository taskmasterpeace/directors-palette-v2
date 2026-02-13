'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, X, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { DropZone } from '@/components/ui/drop-zone'
import { useStoryboardStore } from '../../store'
import { safeJsonParse } from '@/features/shared/utils/safe-fetch'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

export function StyleGuideGenerator() {
    const { setCurrentStyleGuide, addStyleGuide } = useStoryboardStore()

    const [styleName, setStyleName] = useState('')
    const [styleDescription, setStyleDescription] = useState('')
    const [referenceImage, setReferenceImage] = useState<string | null>(null)
    const [referenceFile, setReferenceFile] = useState<File | null>(null)
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Accepted image file types for reference image
    const IMAGE_ACCEPT = {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    }

    const handleDropAccepted = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0]
            setReferenceFile(file)
            const reader = new FileReader()
            reader.onload = () => {
                setReferenceImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }, [])

    const removeReferenceImage = () => {
        setReferenceImage(null)
        setReferenceFile(null)
    }

    const handleGenerate = async () => {
        if (!styleName.trim()) {
            setError('Please enter a style name')
            return
        }

        setGenerationStatus('generating')
        setError(null)
        setGeneratedImageUrl(null)

        try {
            const response = await fetch(`/api/recipes/Storyboard Style Guide/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fieldValues: {
                        stage0_field0_style_name: styleName.trim(),
                        stage0_field1_style_description: styleDescription.trim(),
                    },
                    referenceImages: referenceImage ? [referenceImage] : [],
                    modelSettings: {
                        aspectRatio: '16:9',
                        outputFormat: 'png',
                    },
                    extraMetadata: {
                        source: 'storyboard',
                        assetType: 'style-guide',
                    },
                }),
            })

            const data = await safeJsonParse(response)

            if (!response.ok) {
                setGenerationStatus('failed')
                setError(data.error || 'Generation failed')
                return
            }

            if (data.success && data.imageUrl) {
                setGenerationStatus('completed')
                setGeneratedImageUrl(data.imageUrl)
            } else {
                setGenerationStatus('failed')
                setError(data.error || 'Generation failed')
            }
        } catch (err) {
            setGenerationStatus('failed')
            setError(err instanceof Error ? err.message : 'Generation failed')
        }
    }

    const handleSaveAsStyleGuide = () => {
        if (!styleName.trim() || !generatedImageUrl) return

        const guide = {
            id: `generated-${Date.now()}`,
            user_id: '',
            name: styleName.trim(),
            description: styleDescription.trim() || `Generated style guide for ${styleName}`,
            style_prompt: `Cinematic style guide: ${styleName.trim()}${styleDescription ? `. ${styleDescription.trim()}` : ''}`,
            reference_image_url: generatedImageUrl,
            metadata: {
                generated: true,
                recipe: 'Storyboard Style Guide',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        addStyleGuide(guide)
        setCurrentStyleGuide(guide)
    }

    return (
        <Card className="border-primary/20">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Style Guide Generator
                </CardTitle>
                <CardDescription>
                    Generate a cinematic 6-tile style guide using AI. Enter a style name and optionally upload a reference image.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Style Name Input */}
                <div className="space-y-2">
                    <Label htmlFor="styleName">Style Name</Label>
                    <Input
                        id="styleName"
                        placeholder="e.g., Claymation, Film Noir, Watercolor"
                        value={styleName}
                        onChange={(e) => setStyleName(e.target.value)}
                    />
                </div>

                {/* Style Description (optional) */}
                <div className="space-y-2">
                    <Label htmlFor="styleDescription">Style Description (optional)</Label>
                    <Textarea
                        id="styleDescription"
                        placeholder="e.g., Gritty urban realism with desaturated colors, harsh shadows, and handheld camera feel..."
                        value={styleDescription}
                        onChange={(e) => setStyleDescription(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Reference Image Upload */}
                <div className="space-y-2">
                    <Label>Reference Image (optional)</Label>
                    {referenceImage ? (
                        <div className="relative rounded-lg border overflow-hidden">
                            <img
                                src={referenceImage}
                                alt="Reference"
                                className="w-full h-32 object-cover"
                            />
                            <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-6 w-6"
                                onClick={removeReferenceImage}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                            <Badge className="absolute bottom-2 left-2 text-xs">
                                {referenceFile?.name || 'Reference image'}
                            </Badge>
                        </div>
                    ) : (
                        <DropZone
                            accept={IMAGE_ACCEPT}
                            maxFiles={1}
                            multiple={false}
                            onDropAccepted={handleDropAccepted}
                            idleText="Drag & drop an image, or click to select"
                            dragText="Drop the image here..."
                            acceptText="PNG, JPG, WEBP up to 10MB"
                            rejectText="Please upload an image file"
                        />
                    )}
                </div>

                {/* Aspect Ratio Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">16:9</Badge>
                    <span>Cinematic 6-tile grid (2x3)</span>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Generated Image Preview */}
                {generatedImageUrl && (
                    <div className="space-y-2">
                        <Label>Generated Style Guide</Label>
                        <div className="rounded-lg border overflow-hidden">
                            <img
                                src={generatedImageUrl}
                                alt={`${styleName} style guide`}
                                className="w-full"
                            />
                        </div>
                        <Button
                            onClick={handleSaveAsStyleGuide}
                            variant="secondary"
                            className="w-full"
                        >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Use as Active Style Guide
                        </Button>
                    </div>
                )}

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={!styleName.trim() || generationStatus === 'generating'}
                    className="w-full"
                    size="lg"
                >
                    {generationStatus === 'generating' ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Style Guide...
                        </>
                    ) : (
                        <>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Generate Style Guide
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
