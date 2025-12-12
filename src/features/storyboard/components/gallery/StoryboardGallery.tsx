'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Images, Film, Grid3X3, CheckCircle, AlertCircle, Loader2, Eye, Download, Info, Clock } from 'lucide-react'
import { useStoryboardStore } from '../../store'
import { BRollGenerator } from '../broll/BRollGenerator'
import { ContactSheetModal } from '../contact-sheet/ContactSheetModal'
import type { GeneratedShotPrompt } from '../../types/storyboard.types'

interface StoryboardGalleryProps {
    chapterIndex?: number
}

export function StoryboardGallery({ chapterIndex = 0 }: StoryboardGalleryProps) {
    const {
        breakdownResult,
        brollShots,
        contactSheetVariants,
        generatedImages,
        generatedPrompts,
        chapters,
        setInternalTab
    } = useStoryboardStore()

    // Filter segments by chapter
    // chapterIndex of -1 means "All Chapters" view - show all segments
    const filteredSegments = useMemo(() => {
        if (!breakdownResult?.segments) return []
        if (!chapters || chapters.length === 0) return breakdownResult.segments

        // "All Chapters" view - show all segments
        if (chapterIndex < 0) return breakdownResult.segments

        const activeChapter = chapters[chapterIndex]
        if (!activeChapter || activeChapter.segmentIndices.length === 0) {
            return breakdownResult.segments
        }

        return breakdownResult.segments.filter(s =>
            activeChapter.segmentIndices.includes(s.sequence)
        )
    }, [breakdownResult?.segments, chapters, chapterIndex])

    const [selectedShot, setSelectedShot] = useState<GeneratedShotPrompt | null>(null)
    const [contactSheetOpen, setContactSheetOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)

    const handleOpenContactSheet = (sequence: number) => {
        const shot = generatedPrompts.find(p => p.sequence === sequence)
        if (shot) {
            setSelectedShot(shot)
            setContactSheetOpen(true)
        }
    }

    const generatedCount = Object.values(generatedImages).filter(img => img.status === 'completed').length
    const pendingCount = Object.values(generatedImages).filter(img => img.status === 'pending' || img.status === 'generating').length
    const failedCount = Object.values(generatedImages).filter(img => img.status === 'failed').length

    if (filteredSegments.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                    <Images className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No shots in this chapter yet.</p>
                    <p className="text-sm">Go to the Generate tab to create your storyboard.</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setInternalTab('generation')}
                    >
                        Go to Generate
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Tabs defaultValue="shots">
                <TabsList className="grid grid-cols-2 w-full max-w-md">
                    <TabsTrigger value="shots" className="flex items-center gap-2">
                        <Images className="w-4 h-4" />
                        Shots ({filteredSegments.length})
                        {generatedCount > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                                {generatedCount} ready
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="broll" className="flex items-center gap-2">
                        <Film className="w-4 h-4" />
                        B-Roll ({brollShots.length})
                    </TabsTrigger>
                </TabsList>

                {/* Main Shots Tab */}
                <TabsContent value="shots" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Images className="w-5 h-5" />
                                    Generated Storyboard
                                </div>
                                {/* Status Summary */}
                                <div className="flex items-center gap-3 text-sm">
                                    {generatedCount > 0 && (
                                        <span className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            {generatedCount}
                                        </span>
                                    )}
                                    {pendingCount > 0 && (
                                        <span className="flex items-center gap-1 text-amber-600">
                                            <Clock className="w-4 h-4" />
                                            {pendingCount}
                                        </span>
                                    )}
                                    {failedCount > 0 && (
                                        <span className="flex items-center gap-1 text-red-600">
                                            <AlertCircle className="w-4 h-4" />
                                            {failedCount}
                                        </span>
                                    )}
                                </div>
                            </CardTitle>
                            <CardDescription>
                                Click on any shot to extract a 3x3 contact sheet. Hover for actions.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[500px]">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredSegments.map((segment) => {
                                        const shotId = `shot-${segment.sequence}`
                                        const hasVariants = contactSheetVariants.some(
                                            v => v.storyboard_shot_id === shotId
                                        )
                                        const generatedImage = generatedImages[segment.sequence]

                                        return (
                                            <div
                                                key={segment.sequence}
                                                className="group relative"
                                            >
                                                <div
                                                    className="aspect-video rounded-lg border bg-muted/20 flex items-center justify-center cursor-pointer hover:border-primary transition-colors relative overflow-hidden"
                                                    style={{ borderColor: segment.color }}
                                                >
                                                    {/* Show generated image or placeholder */}
                                                    {generatedImage?.imageUrl ? (
                                                        <img
                                                            src={generatedImage.imageUrl}
                                                            alt={`Shot ${segment.sequence}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="text-center p-2">
                                                            {generatedImage?.status === 'generating' ? (
                                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                                            ) : generatedImage?.status === 'failed' ? (
                                                                <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
                                                            ) : generatedImage?.status === 'completed' ? (
                                                                <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                                                            ) : (
                                                                <Images className="w-6 h-6 mx-auto text-muted-foreground/30" />
                                                            )}
                                                            <Badge
                                                                className="mt-2"
                                                                style={{ backgroundColor: segment.color }}
                                                            >
                                                                Shot {segment.sequence}
                                                            </Badge>
                                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                                {segment.text.slice(0, 50)}...
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Shot number badge always visible */}
                                                    <Badge
                                                        className="absolute top-1 left-1 text-[10px]"
                                                        style={{ backgroundColor: segment.color }}
                                                    >
                                                        {segment.sequence}
                                                    </Badge>

                                                    {/* Status indicator */}
                                                    {generatedImage && (
                                                        <div className="absolute top-1 right-1">
                                                            {generatedImage.status === 'completed' && generatedImage.imageUrl && (
                                                                <Badge variant="secondary" className="text-[10px] bg-green-500/80">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                </Badge>
                                                            )}
                                                            {generatedImage.status === 'generating' && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                                </Badge>
                                                            )}
                                                            {generatedImage.status === 'failed' && (
                                                                <Badge variant="destructive" className="text-[10px]">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}

                                                    {hasVariants && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="absolute bottom-1 right-1 text-[10px]"
                                                        >
                                                            <Grid3X3 className="w-3 h-3 mr-1" />
                                                            3x3
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Hover Actions */}
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2 p-2">
                                                    {generatedImage?.imageUrl && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => setPreviewImage(generatedImage.imageUrl || null)}
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            Preview
                                                        </Button>
                                                    )}
                                                    {generatedImage?.imageUrl && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => handleOpenContactSheet(segment.sequence)}
                                                        >
                                                            <Grid3X3 className="w-4 h-4 mr-1" />
                                                            3x3 Sheet
                                                        </Button>
                                                    )}
                                                    {generatedImage?.imageUrl && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => {
                                                                const link = document.createElement('a')
                                                                link.href = generatedImage.imageUrl!
                                                                link.download = `shot-${segment.sequence}.png`
                                                                link.click()
                                                            }}
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            Download
                                                        </Button>
                                                    )}

                                                    {/* Metadata Info */}
                                                    {generatedImage?.generationTimestamp && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="w-full text-muted-foreground hover:text-white"
                                                                    >
                                                                        <Info className="w-4 h-4 mr-1" />
                                                                        Metadata
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top" className="max-w-[280px] text-xs">
                                                                    <div className="space-y-1">
                                                                        {generatedImage.chapterTitle && (
                                                                            <p><span className="text-muted-foreground">Chapter:</span> {generatedImage.chapterTitle}</p>
                                                                        )}
                                                                        {generatedImage.styleGuideUsed && (
                                                                            <p><span className="text-muted-foreground">Style:</span> {generatedImage.styleGuideUsed.name}</p>
                                                                        )}
                                                                        {generatedImage.generationConfig && (
                                                                            <p><span className="text-muted-foreground">Config:</span> {generatedImage.generationConfig.aspectRatio} / {generatedImage.generationConfig.resolution}</p>
                                                                        )}
                                                                        {generatedImage.appliedWildcards && Object.keys(generatedImage.appliedWildcards).length > 0 && (
                                                                            <p><span className="text-muted-foreground">Wildcards:</span> {Object.keys(generatedImage.appliedWildcards).join(', ')}</p>
                                                                        )}
                                                                        <p><span className="text-muted-foreground">Generated:</span> {new Date(generatedImage.generationTimestamp).toLocaleString()}</p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* B-Roll Tab */}
                <TabsContent value="broll" className="mt-4">
                    <BRollGenerator />
                </TabsContent>
            </Tabs>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img
                            src={previewImage}
                            alt="Preview"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setPreviewImage(null)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}

            {/* Contact Sheet Modal */}
            <ContactSheetModal
                open={contactSheetOpen}
                onOpenChange={setContactSheetOpen}
                shot={selectedShot}
            />
        </div>
    )
}
