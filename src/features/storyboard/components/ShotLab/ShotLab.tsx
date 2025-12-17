import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneratedShotPrompt } from "../../types/storyboard.types"
import { VfxBay } from "./VfxBay"
import { BlockingCanvas } from "./BlockingCanvas" // We'll create this next
import { Wand2, Layout } from "lucide-react"

interface ShotLabProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shot: GeneratedShotPrompt
    onUpdateShot: (updatedShot: GeneratedShotPrompt) => void
}

export function ShotLab({ open, onOpenChange, shot, onUpdateShot }: ShotLabProps) {
    const [activeTab, setActiveTab] = useState<"blocking" | "vfx">("vfx")

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-zinc-800">
                <DialogHeader className="px-6 py-4 border-b border-zinc-800 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-light tracking-wide">
                        <span className="text-muted-foreground/50">Shot Lab //</span>
                        <span className="text-foreground">{shot.prompt.slice(0, 40)}...</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "blocking" | "vfx")} className="flex-1 flex flex-col">
                        <div className="border-b border-zinc-800 px-4 sm:px-6 bg-muted/20">
                            <TabsList className="bg-transparent h-auto min-h-[48px] p-0 gap-2 sm:gap-6 w-full justify-start overflow-x-auto no-scrollbar">
                                <TabsTrigger
                                    value="blocking"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 sm:px-0 font-medium text-xs sm:text-sm text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"
                                >
                                    <Layout className="w-4 h-4 mr-2" />
                                    Blocking (Layout)
                                </TabsTrigger>
                                <TabsTrigger
                                    value="vfx"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-12 px-2 sm:px-0 font-medium text-xs sm:text-sm text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap"
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    VFX Bay (Refine)
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 relative bg-zinc-950/50">
                            <TabsContent value="blocking" className="h-full m-0 p-0 data-[state=inactive]:hidden">
                                <BlockingCanvas shot={shot} onUpdate={onUpdateShot} />
                            </TabsContent>
                            <TabsContent value="vfx" className="h-full m-0 p-0 data-[state=inactive]:hidden">
                                <VfxBay shot={shot} onUpdate={onUpdateShot} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
