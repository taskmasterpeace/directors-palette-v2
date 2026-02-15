'use client'

import { useState, useMemo } from "react"
import { FileText, Users, Palette, SplitSquareVertical, Play, Images, Clapperboard, Check, LayoutGrid, List } from "lucide-react"
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
import { CanvasView } from "./canvas/CanvasView"

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
        closeBRollModal,
        // View Mode
        viewMode,
        setViewMode
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

    // Sidebar tab config
    const sidebarTabs = [
        { id: 'input' as const, icon: FileText, label: 'Story', state: tabStates.input },
        { id: 'style' as const, icon: Palette, label: 'Style', state: tabStates.style },
        { id: 'entities' as const, icon: Users, label: 'Chars', state: tabStates.entities },
        { id: 'shots' as const, icon: SplitSquareVertical, label: 'Shots', state: tabStates.shots },
        { id: 'generation' as const, icon: Play, label: 'Gen', state: tabStates.generation },
        { id: 'gallery' as const, icon: Images, label: 'Results', state: tabStates.gallery },
    ]

    return (
        <div className="flex h-full overflow-hidden">
            {/* Vertical Sidebar */}
            <TooltipProvider>
                <div className="flex-shrink-0 w-14 border-r bg-muted/30 flex flex-col items-center py-2 gap-1">
                    {sidebarTabs.map((tab, i) => {
                        const Icon = tab.icon
                        const isActive = internalTab === tab.id
                        const isDisabled = !tab.state.enabled
                        return (
                            <Tooltip key={tab.id}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => !isDisabled && setInternalTab(tab.id)}
                                        disabled={isDisabled}
                                        className={`relative flex flex-col items-center gap-0.5 w-11 py-1.5 rounded-lg transition-all text-center
                                            ${isActive
                                                ? 'bg-background shadow-sm border border-border text-foreground'
                                                : isDisabled
                                                    ? 'opacity-30 cursor-not-allowed'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                            }`}
                                    >
                                        {/* Step number / check badge */}
                                        <span className={`absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold
                                            ${tab.state.completed ? 'bg-green-500 text-white' : isActive ? 'bg-amber-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                                            {tab.state.completed ? <Check className="w-2.5 h-2.5" /> : i + 1}
                                        </span>
                                        <Icon className="w-4 h-4" />
                                        <span className="text-[9px] leading-none">{tab.label}</span>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                    {!tab.state.enabled
                                        ? tab.id === 'shots' ? 'Enter story text first'
                                            : tab.id === 'generation' ? 'Generate shot prompts first'
                                                : 'Generate images first'
                                        : tab.state.tooltip}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                    {/* Spacer */}
                    <div className="flex-1" />
                    {/* Help + Save at bottom */}
                    <div className="flex flex-col items-center gap-1 pb-1">
                        <StoryboardHelp />
                        <SaveIndicator />
                    </div>
                </div>
            </TooltipProvider>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Slim content header bar */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0">
                    <span className="text-sm font-medium text-muted-foreground">
                        {sidebarTabs.find(t => t.id === internalTab)?.label}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle - only shown on gallery tab */}
                        {internalTab === 'gallery' && (
                            <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
                                <button
                                    onClick={() => setViewMode('tabs')}
                                    className={`p-1 rounded transition-colors ${viewMode === 'tabs' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="List View"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('canvas')}
                                    className={`p-1 rounded transition-colors ${viewMode === 'canvas' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Canvas View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tab Content (full height) */}
                <div className="flex-1 overflow-auto p-3">
                    {/* Story Input Tab */}
                    {internalTab === 'input' && <StoryInput />}

                    {/* Style Tab */}
                    {internalTab === 'style' && (
                        <div className="space-y-3">
                            <StyleGuideEditor />
                            <StyleGuideGenerator />
                        </div>
                    )}

                    {/* Characters Tab */}
                    {internalTab === 'entities' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <CharacterList />
                                <LocationList />
                            </div>
                            <div>
                                <CharacterSheetGenerator />
                            </div>
                        </div>
                    )}

                    {/* Shots Tab */}
                    {internalTab === 'shots' && (
                        <div className="space-y-2">
                            <DirectorSelector />

                            <div className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded-md">
                                <GranularitySelect />

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

                            <DirectorProposalDialog
                                open={pitchOpen}
                                onOpenChange={setPitchOpen}
                                pitch={currentPitch}
                                director={DIRECTORS.find(d => d.id === localDirectorId) || null}
                                onConfirm={handleGreenlightPitch}
                            />

                            <ChapterTabs>
                                {(chapterIndex) => (
                                    <div className={`grid gap-2 transition-all duration-200 ${isPreviewCollapsed ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
                                        <div className="transition-all duration-200">
                                            <ShotTextPreview chapterIndex={chapterIndex} />
                                        </div>
                                        <div className="transition-all duration-200">
                                            <ShotBreakdown chapterIndex={chapterIndex} />
                                        </div>
                                    </div>
                                )}
                            </ChapterTabs>
                        </div>
                    )}

                    {/* Generation Tab */}
                    {internalTab === 'generation' && (
                        <ChapterTabs>
                            {(chapterIndex) => (
                                <GenerationQueue chapterIndex={chapterIndex} />
                            )}
                        </ChapterTabs>
                    )}

                    {/* Gallery Tab */}
                    {internalTab === 'gallery' && (
                        viewMode === 'canvas' ? (
                            <CanvasView />
                        ) : (
                            <ChapterTabs>
                                {(chapterIndex) => (
                                    <StoryboardGallery chapterIndex={chapterIndex} />
                                )}
                            </ChapterTabs>
                        )
                    )}
                </div>
            </div>

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
