'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Wand2, Upload, X, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PromptEditor, type PromptVariable, applyVariablesToPrompt } from '../shared/PromptEditor'
import { styleGeneratorService, DEFAULT_STYLE_GUIDE_PROMPT } from '../../services/style-generator.service'
import { useStoryboardStore } from '../../store'
import { useDropzone } from 'react-dropzone'

type GenerationStatus = 'idle' | 'generating' | 'completed' | 'failed'

export function StyleGuideGenerator() {
    const { setCurrentStyleGuide, addStyleGuide } = useStoryboardStore()

    const [styleName, setStyleName] = useState('')
    const [referenceImage, setReferenceImage] = useState<string | null>(null)
    const [referenceFile, setReferenceFile] = useState<File | null>(null)
    const [prompt, setPrompt] = useState(DEFAULT_STYLE_GUIDE_PROMPT)
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
    const [generatedGalleryId, setGeneratedGalleryId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const onDrop = useCallback((acceptedFiles: File[]) => {
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

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        },
        maxFiles: 1
    })

    const removeReferenceImage = () => {
        setReferenceImage(null)
        setReferenceFile(null)
    }

    const variables: PromptVariable[] = [
        {
            name: 'STYLE_NAME',
            value: styleName || '[Style Name]',
            description: 'Name of the visual style',
            editable: false
        }
    ]

    const handleGenerate = async () => {
        if (!styleName.trim()) {
            setError('Please enter a style name')
            return
        }

        setGenerationStatus('generating')
        setError(null)
        setGeneratedGalleryId(null)

        try {
            const result = await styleGeneratorService.generateStyleGuide({
                styleName: styleName.trim(),
                prompt,
                referenceImageUrl: referenceImage || undefined,
                aspectRatio: '21:9'
            })

            if (result.success) {
                setGenerationStatus('completed')
                setGeneratedGalleryId(result.galleryId || null)
            } else {
                setGenerationStatus('failed')
                setError(result.error || 'Generation failed')
            }
        } catch (err) {
            setGenerationStatus('failed')
            setError(err instanceof Error ? err.message : 'Generation failed')
        }
    }

    const handleSaveAsStyleGuide = () => {
        if (!styleName.trim()) return

        const guide = {
            id: `generated-${Date.now()}`,
            user_id: '',
            name: styleName.trim(),
            description: `Generated style guide for ${styleName}`,
            style_prompt: applyVariablesToPrompt(prompt, variables),
            reference_image_url: referenceImage || undefined,
            metadata: {
                generated: true,
                original_prompt: prompt,
                gallery_id: generatedGalleryId
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
                    Generate a visual style guide image using AI. Upload a reference image and enter a style name.
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
                        <div
                            {...getRootProps()}
                            className={`
                                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                            `}
                        >
                            <input {...getInputProps()} />
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                {isDragActive
                                    ? 'Drop the image here...'
                                    : 'Drag & drop an image, or click to select'
                                }
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                PNG, JPG, WEBP up to 10MB
                            </p>
                        </div>
                    )}
                </div>

                {/* Prompt Editor */}
                <PromptEditor
                    title="Generation Prompt"
                    prompt={prompt}
                    variables={variables}
                    onPromptChange={setPrompt}
                    collapsible={true}
                    defaultOpen={false}
                />

                {/* Aspect Ratio Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">21:9</Badge>
                    <span>Cinematic ultra-wide aspect ratio</span>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                {/* Generation Status */}
                {generatedGalleryId && (
                    <div className="space-y-2">
                        <Label>Generation Started</Label>
                        <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Style guide is being generated. It will appear in the Gallery when complete.</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                <div className="flex-1">
                                    <div className="text-xs font-medium">{styleName} Style Guide</div>
                                    <div className="text-xs text-muted-foreground font-mono truncate">
                                        {generatedGalleryId}
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">Processing</Badge>
                            </div>
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
                            <LoadingSpinner size="sm" color="current" className="mr-2" />
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
