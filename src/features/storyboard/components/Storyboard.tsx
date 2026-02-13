'use client'

import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, Users, Palette, SplitSquareVertical, Play, Images, Clapperboard, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useStoryboardStore } from "../store"
import { StoryInput } from "./story-input/StoryInput"
import { CharacterList } from "./entities/CharacterList"
import { LocationList } from "./entities/LocationList"
import { CharacterSheetGenerator } from "./entities/CharacterSheetGenerator"
import { GranularitySelect } from "./shot-list/GranularitySelect"
import { DirectorSelector } from "./shot-list/DirectorSelector"
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
import { ContactSheetModal } from "./contact-sheet/ContactSheetModal"
import { BRollSheetModal } from "./broll-sheet/BRollSheetModal"

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
        updateGeneratedShot,
        // For tab completion indicators
        storyText,
        characters,
        locations,
        currentStyleGuide,
        selectedPresetStyle,
        generatedImages,
        // Contact Sheet Modal
        contactSheetModalOpen,
        contactSheetShotId,
        closeContactSheetModal,
        // B-Roll Modal
        brollModalOpen,
        brollShotSequence,
        brollReferenceUrl,
        closeBRollModal
    } = useStoryboardStore()

    // Calculate tab completion states
    const tabStates = useMemo(() => ({
        input: {
            completed: !!storyText && storyText.trim().length > 0,
            enabled: true,
            tooltip: storyText?.trim() ? `${storyText.split(/\s+/).length} words` : 'Enter your story'
        },
        style: {
            completed: !!(currentStyleGuide || selectedPresetStyle),
            enabled: true,
            tooltip: currentStyleGuide?.name || (selectedPresetStyle ? 'Preset style selected' : 'Choose a visual style')
        },
        entities: {
            completed: characters.length > 0 || locations.length > 0,
            enabled: true,
            tooltip: characters.length > 0 || locations.length > 0
                ? `${characters.length} characters, ${locations.length} locations`
                : 'Add characters and locations'
        },
        shots: {
            completed: promptsGenerated && generatedPrompts.length > 0,
            enabled: !!storyText?.trim(),
            tooltip: promptsGenerated
                ? `${generatedPrompts.length} shot prompts generated`
                : 'Generate shot prompts'
        },
        generation: {
            completed: Object.keys(generatedImages).length > 0,
            enabled: promptsGenerated && generatedPrompts.length > 0,
            tooltip: Object.keys(generatedImages).length > 0
                ? `${Object.keys(generatedImages).length} images generated`
                : 'Generate images from prompts'
        },
        gallery: {
            completed: Object.values(generatedImages).some(img => img.status === 'completed'),
            enabled: Object.keys(generatedImages).length > 0,
            tooltip: Object.values(generatedImages).filter(img => img.status === 'completed').length > 0
                ? `${Object.values(generatedImages).filter(img => img.status === 'completed').length} completed images`
                : 'View generated images'
        }
    }), [storyText, currentStyleGuide, selectedPresetStyle, characters, locations, promptsGenerated, generatedPrompts, generatedImages])

    // Derived active shot for Shot Lab
    const activeShot = activeLabShotSequence !== null ? generatedPrompts.find(s => s.sequence === activeLabShotSequence) : null

    // Derived shot for Contact Sheet Modal (contactSheetShotId is the sequence number as string)
    const contactSheetShot = contactSheetShotId !== null
        ? generatedPrompts.find(s => s.sequence === Number(contactSheetShotId))
        : null

    const [directorOpen, setDirectorOpen] = useState(false)
    const [localDirectorId, setLocalDirectorId] = useState<string | null>(null)

    // Pitch Dialog State
    const [pitchOpen, setPitchOpen] = useState(false)
    const [currentPitch, setCurrentPitch] = useState<DirectorPitch | null>(null)

    const handleGeneratePitch = () => {
        if (!localDirectorId || !generatedPrompts.length) return

        const director = DIRECTORS.find(d => d.id === localDirectorId)
        if (!director) return

        const pitch = StoryDirectorService.generateDirectorPitch(generatedPrompts, director)
        setCurrentPitch(pitch)
        setPitchOpen(true)
        setDirectorOpen(false)
    }

    const handleGreenlightPitch = () => {
        if (!localDirectorId) return
        const director = DIRECTORS.find(d => d.id === localDirectorId)
        if (!director) return

        const enhanced = StoryDirectorService.enhanceGeneratedPrompts(generatedPrompts, director)
        setGeneratedPrompts(enhanced)
        setPitchOpen(false)
        setLocalDirectorId(null)
        setCurrentPitch(null)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden p-3 sm:p-4">
            {/* Workflow Tabs with Step Numbers */}
            <Tabs value={internalTab} onValueChange={(v) => setInternalTab(v as typeof internalTab)} className="flex-1 flex flex-col overflow-hidden">
                {/* Save Indicator & Help */}
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <StoryboardHelp />
                    <SaveIndicator />
                </div>
                <TooltipProvider>
                    <TabsList className="grid grid-cols-6 w-full h-auto min-h-[44px] p-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger value="input" className="flex items-center gap-1.5 py-2 px-3 relative">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.input.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.input.completed ? <Check className="w-3.5 h-3.5" /> : '1'}
                                    </span>
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Story</span><span className="sm:hidden">Story</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{tabStates.input.tooltip}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger value="style" className="flex items-center gap-1.5 py-2 px-3 relative">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.style.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.style.completed ? <Check className="w-3.5 h-3.5" /> : '2'}
                                    </span>
                                    <Palette className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Style</span><span className="sm:hidden">Style</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{tabStates.style.tooltip}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger value="entities" className="flex items-center gap-1.5 py-2 px-3 relative">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.entities.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.entities.completed ? <Check className="w-3.5 h-3.5" /> : '3'}
                                    </span>
                                    <Users className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Characters</span><span className="sm:hidden">Chars</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">{tabStates.entities.tooltip}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger
                                    value="shots"
                                    disabled={!tabStates.shots.enabled}
                                    className={`flex items-center gap-1.5 py-2 px-3 relative ${!tabStates.shots.enabled ? 'opacity-40' : ''}`}
                                >
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.shots.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.shots.completed ? <Check className="w-3.5 h-3.5" /> : '4'}
                                    </span>
                                    <SplitSquareVertical className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Shots</span><span className="sm:hidden">Shots</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {!tabStates.shots.enabled ? 'Enter story text first' : tabStates.shots.tooltip}
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger
                                    value="generation"
                                    disabled={!tabStates.generation.enabled}
                                    className={`flex items-center gap-1.5 py-2 px-3 relative ${!tabStates.generation.enabled ? 'opacity-40' : ''}`}
                                >
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.generation.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.generation.completed ? <Check className="w-3.5 h-3.5" /> : '5'}
                                    </span>
                                    <Play className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Generate</span><span className="sm:hidden">Gen</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {!tabStates.generation.enabled ? 'Generate shot prompts first' : tabStates.generation.tooltip}
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <TabsTrigger
                                    value="gallery"
                                    disabled={!tabStates.gallery.enabled}
                                    className={`flex items-center gap-1.5 py-2 px-3 relative ${!tabStates.gallery.enabled ? 'opacity-40' : ''}`}
                                >
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${tabStates.gallery.completed ? 'bg-green-500 text-white' : 'bg-primary/20'}`}>
                                        {tabStates.gallery.completed ? <Check className="w-3.5 h-3.5" /> : '6'}
                                    </span>
                                    <Images className="w-4 h-4" />
                                    <span className="text-xs"><span className="hidden sm:inline">Results</span><span className="sm:hidden">Results</span></span>
                                </TabsTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                                {!tabStates.gallery.enabled ? 'Generate images first' : tabStates.gallery.tooltip}
                            </TooltipContent>
                        </Tooltip>
                    </TabsList>
                </TooltipProvider>

                {/* Story Input Tab */}
                <TabsContent value="input" className="mt-3 flex-1 overflow-auto">
                    <StoryInput />
                </TabsContent>

                {/* Style Tab */}
                <TabsContent value="style" className="mt-3 flex-1 overflow-auto space-y-3">
                    <StyleGuideEditor />
                    <StyleGuideGenerator />
                </TabsContent>

                {/* Characters Tab */}
                <TabsContent value="entities" className="mt-3 flex-1 overflow-auto space-y-3">
                    <CharacterList />
                    <CharacterSheetGenerator />
                    <LocationList />
                </TabsContent>

                {/* Shots Tab */}
                <TabsContent value="shots" className="mt-3 flex-1 overflow-auto space-y-2">
                    {/* Director Selector - choose before generating prompts */}
                    <DirectorSelector />

                    {/* Compact Toolbar */}
                    <div className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded-md">
                        <GranularitySelect />

                        {/* Director Commission Button (re-apply to existing prompts) */}
                        {promptsGenerated && (
                            <Dialog open={directorOpen} onOpenChange={setDirectorOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 border-amber-500/20 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                                        <Clapperboard className="w-3.5 h-3.5" />
                                        Re-Commission
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Re-Commission a Director</DialogTitle>
                                        <DialogDescription>
                                            Change the director&apos;s visual style on your existing prompts.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-[400px] pr-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            {DIRECTORS.map(director => (
                                                <div
                                                    key={director.id}
                                                    className={`p-3 border rounded-lg cursor-pointer transition-all ${localDirectorId === director.id ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:border-primary/50"}`}
                                                    onClick={() => setLocalDirectorId(director.id)}
                                                >
                                                    <div className="font-semibold text-sm flex items-center gap-2">
                                                        {director.name}
                                                        {localDirectorId === director.id && <Check className="w-3 h-3 text-primary" />}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{director.description}</div>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {director.coreIntent.primaryFocus.slice(0, 2).map(tag => (
                                                            <span key={tag} className="px-1.5 py-0.5 bg-muted rounded text-xs">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <DialogFooter>
                                        <Button onClick={handleGeneratePitch} disabled={!localDirectorId}>
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
                        director={DIRECTORS.find(d => d.id === localDirectorId) || null}
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
                <TabsContent value="generation" className="mt-3 flex-1 overflow-auto">
                    <ChapterTabs>
                        {(chapterIndex) => (
                            <GenerationQueue chapterIndex={chapterIndex} />
                        )}
                    </ChapterTabs>
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery" className="mt-3 flex-1 overflow-auto">
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

            {/* Contact Sheet (Angles) Modal - accessible from shot breakdown */}
            <ContactSheetModal
                open={contactSheetModalOpen}
                onOpenChange={(open) => !open && closeContactSheetModal()}
                shot={contactSheetShot || null}
            />

            {/* B-Roll Sheet Modal - accessible from shot breakdown */}
            <BRollSheetModal
                open={brollModalOpen}
                onOpenChange={(open) => !open && closeBRollModal()}
                referenceImageUrl={brollReferenceUrl}
                shotNumber={brollShotSequence || undefined}
            />
        </div>
    )
}
