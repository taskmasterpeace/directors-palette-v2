'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileText, Users, Palette, SplitSquareVertical, Play, Images } from "lucide-react"
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

export function Storyboard() {
    const { internalTab, setInternalTab, isPreviewCollapsed } = useStoryboardStore()

    return (
        <div className="space-y-2">
            {/* Workflow Tabs with Step Numbers */}
            <Tabs value={internalTab} onValueChange={(v) => setInternalTab(v as typeof internalTab)}>
                {/* Save Indicator */}
                <div className="flex items-center justify-between mb-1">
                    <div /> {/* Spacer */}
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
                    </div>

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
        </div>
    )
}
