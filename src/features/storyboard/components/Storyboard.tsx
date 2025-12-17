'use client'

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, Users, Palette, SplitSquareVertical, Play, Images, Clapperboard, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useStoryboardStore } from "../store"
import { StoryInput } from "./story-input/StoryInput"
import { CharacterList } from "./entities/CharacterList"
import { LocationList } from "./entities/LocationList"
import { CharacterSheetGenerator } from "./entities/CharacterSheetGenerator"
import { GranularitySelect } from "./shot-list/GranularitySelect"
import { ShotTextPreview } from "./shot-list/ShotTextPreview"
import { ShotBreakdown } from "./shot-list/ShotBreakdown"
import { StyleGuideEditor } from "./style-guides/StyleGuideEditor"
import { StyleGuideGenerator } from "./style-guides/StyleGuideGenerator"
import { GenerationQueue } from "./generation/GenerationQueue"
import { StoryboardGallery } from "./gallery/StoryboardGallery"
import { ChapterTabs } from "./chapter-view"
import { SaveIndicator } from "./shared"
import { DIRECTORS } from "@/features/music-lab/data/directors.data"
import { StoryDirectorService } from "../services/story-director.service"
import { StoryboardHelp } from "./StoryboardHelp"
import { ShotLab } from "./ShotLab/ShotLab"
import { DirectorProposalDialog } from "./DirectorProposalDialog"

import { DirectorPitch } from "../types"

export function Storyboard() {
    const {
        internalTab,
        setInternalTab,
        isPreviewCollapsed,
        generatedPrompts,
        setGeneratedPrompts,
        promptsGenerated,
        isShotLabOpen,
        activeLabShotSequence,
        closeShotLab,
        updateGeneratedShot
    } = useStoryboardStore()

    // Derived active shot for Shot Lab
    const activeShot = activeLabShotSequence !== null ? generatedPrompts.find(s => s.sequence === activeLabShotSequence) : null

    const [directorOpen, setDirectorOpen] = useState(false)
    const [selectedDirectorId, setSelectedDirectorId] = useState<string | null>(null)

    // Pitch Dialog State
    const [pitchOpen, setPitchOpen] = useState(false)
    const [currentPitch, setCurrentPitch] = useState<DirectorPitch | null>(null)

    const handleGeneratePitch = () => {
        if (!selectedDirectorId || !generatedPrompts.length) return

        const director = DIRECTORS.find(d => d.id === selectedDirectorId)
        if (!director) return

        // Open Pitch Dialog first
        const pitch = StoryDirectorService.generateDirectorPitch(generatedPrompts, director)
        setCurrentPitch(pitch)
        setPitchOpen(true)
        setDirectorOpen(false)
    }

    const handleGreenlightPitch = () => {
        if (!selectedDirectorId) return
        const director = DIRECTORS.find(d => d.id === selectedDirectorId)
        if (!director) return

        const enhanced = StoryDirectorService.enhanceGeneratedPrompts(generatedPrompts, director)
        setGeneratedPrompts(enhanced)
        setPitchOpen(false)
        setSelectedDirectorId(null)
        setCurrentPitch(null)
    }

    return (
        <div className="space-y-2">
            {/* Workflow Tabs with Step Numbers */}
            <Tabs value={internalTab} onValueChange={(v) => setInternalTab(v as typeof internalTab)}>
                {/* Save Indicator & Help */}
                <div className="flex items-center justify-between mb-1">
                    <StoryboardHelp />
                    <SaveIndicator />
                </div>
                <TabsList className="grid grid-cols-6 w-full h-auto p-1">
                    <TabsTrigger value="input" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">1</span>
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Story</span>
                    </TabsTrigger>
                    <TabsTrigger value="style" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">2</span>
                        <Palette className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Style</span>
                    </TabsTrigger>
                    <TabsTrigger value="entities" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">3</span>
                        <Users className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Characters</span>
                    </TabsTrigger>
                    <TabsTrigger value="shots" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">4</span>
                        <SplitSquareVertical className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Shots</span>
                    </TabsTrigger>
                    <TabsTrigger value="generation" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">5</span>
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Generate</span>
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="flex items-center gap-1 py-1.5 px-2">
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20 text-[10px] font-bold">6</span>
                        <Images className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-xs">Results</span>
                    </TabsTrigger>
                </TabsList>

                {/* Story Input Tab */}
                <TabsContent value="input" className="mt-2">
                    <StoryInput />
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="mt-2 space-y-3">
                    <StyleGuideEditor />
                    <StyleGuideGenerator />
                </TabsContent>

                {/* Characters Tab */}
                <TabsContent value="entities" className="mt-2 space-y-3">
                    <CharacterList />
                    <CharacterSheetGenerator />
                    <LocationList />
                </TabsContent>

                {/* Shots Tab */}
                <TabsContent value="shots" className="mt-2 space-y-2">
                    {/* Compact Toolbar */}
                    <div className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded-md">
                        <GranularitySelect />

                        {/* Director Commission Button */}
                        {promptsGenerated && (
                            <Dialog open={directorOpen} onOpenChange={setDirectorOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                        <Clapperboard className="w-3.5 h-3.5" />
                                        Commission Vision
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Commission a Director</DialogTitle>
                                        <DialogDescription>
                                            Select a director to apply their unique visual style to all your shots.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-[400px] pr-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            {DIRECTORS.map(director => (
                                                <div
                                                    key={director.id}
                                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedDirectorId === director.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"}`}
                                                    onClick={() => setSelectedDirectorId(director.id)}
                                                >
                                                    <div className="font-semibold text-sm flex items-center gap-2">
                                                        {director.name}
                                                        {selectedDirectorId === director.id && <Check className="w-3 h-3 text-primary" />}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{director.description}</div>
                                                    {/* Mini tags */}
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {director.coreIntent.primaryFocus.slice(0, 2).map(tag => (
                                                            <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter>
                                        <Button onClick={handleGeneratePitch} disabled={!selectedDirectorId}>
                                            Generate Pitch
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>

                    {/* Pitch Dialog */}
                    <DirectorProposalDialog
                        open={pitchOpen}
                        onOpenChange={setPitchOpen}
                        pitch={currentPitch}
                        director={DIRECTORS.find(d => d.id === selectedDirectorId) || null}
                        onConfirm={handleGreenlightPitch}
                    />

                    {/* Chapter Tabs with Responsive Layout */}
                    <ChapterTabs>
                        {(chapterIndex) => (
                            <div className={`grid gap-2 transition-all duration-200 ${isPreviewCollapsed ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                                {/* Color-Coded Preview - Collapsible */}
                                <div className="transition-all duration-200">
                                    <ShotTextPreview chapterIndex={chapterIndex} />
                                </div>
                                {/* Shot Breakdown - Expands when preview collapsed */}
                                <div className="transition-all duration-200">
                                    <ShotBreakdown chapterIndex={chapterIndex} />
                                </div>
                            </div>
                        )}
                    </ChapterTabs>
                </TabsContent>

                {/* Generation Tab */}
                <TabsContent value="generation" className="mt-2">
                    <ChapterTabs>
                        {(chapterIndex) => (
                            <GenerationQueue chapterIndex={chapterIndex} />
                        )}
                    </ChapterTabs>
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery" className="mt-2">
                    <ChapterTabs>
                        {(chapterIndex) => (
                            <StoryboardGallery chapterIndex={chapterIndex} />
                        )}
                    </ChapterTabs>
                </TabsContent>
            </Tabs>

            {/* Global Shot Lab Modal */}
            {activeShot && (
                <ShotLab
                    open={isShotLabOpen}
                    onOpenChange={(open) => !open && closeShotLab()}
                    shot={activeShot}
                    onUpdateShot={(updated) => updateGeneratedShot(updated.sequence, updated)}
                />
            )}
        </div>
    )
}
