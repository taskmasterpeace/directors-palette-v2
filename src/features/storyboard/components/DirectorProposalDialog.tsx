import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DirectorFingerprint } from "@/features/music-lab/types/director.types"
import type { DirectorPitch } from "../types/storyboard.types"
import { Clapperboard, Camera, Heart, Palette } from "lucide-react"

interface DirectorProposalDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pitch: DirectorPitch | null
    director: DirectorFingerprint | null
    onConfirm: () => void
}

export function DirectorProposalDialog({
    open,
    onOpenChange,
    pitch,
    director,
    onConfirm
}: DirectorProposalDialogProps) {
    if (!pitch || !director) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif italic text-primary flex items-center gap-2">
                        <Clapperboard className="w-6 h-6" />
                        Pitch: {pitch.directorName}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Review the director&apos;s treatment before applying to your shots.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6 py-4">
                        {/* Logline */}
                        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                            <h4 className="text-sm font-semibold text-zinc-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Heart className="w-4 h-4" /> Core Vision
                            </h4>
                            <p className="text-lg leading-relaxed">{pitch.logline}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Visual Strategy */}
                            <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                                <h4 className="text-sm font-semibold text-zinc-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Camera
                                </h4>
                                <p className="text-sm text-zinc-300">{pitch.visualStrategy}</p>
                            </div>

                            {/* Style */}
                            <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                                <h4 className="text-sm font-semibold text-zinc-500 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <Palette className="w-4 h-4" /> Aesthetic
                                </h4>
                                <p className="text-sm text-zinc-300">{pitch.style}</p>
                            </div>
                        </div>

                        {/* Themes */}
                        <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50">
                            <h4 className="text-sm font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Thematic Focus</h4>
                            <p className="text-sm text-zinc-300 italic">{pitch.thematicFocus}</p>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Check className="w-4 h-4 mr-2" />
                        Greenlight Vision
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Helper icon import (Check was missing)
import { Check } from "lucide-react"
