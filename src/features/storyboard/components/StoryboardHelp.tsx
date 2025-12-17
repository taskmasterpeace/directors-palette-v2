import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, Clapperboard, Star, CheckCircle, Wand2 } from "lucide-react"

export function StoryboardHelp() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Storyboard Guide</DialogTitle>
                    <DialogDescription>
                        How to use the Director&apos;s Palette to visualize your story.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <section className="space-y-2">
                        <h3 className="font-medium flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-purple-500" />
                            1. Generating Prompts
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Enter your story text in the <strong>Story</strong> tab. Then go to the <strong>Shots</strong> tab and click &quot;Generate Shot Prompts&quot;. The AI will break down your story into cinematic shots.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-medium flex items-center gap-2">
                            <Clapperboard className="w-4 h-4 text-amber-500" />
                            2. Commissioning a Director
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Once prompts are generated, click the <strong>Commission Vision</strong> button (projector icon) in the Shots toolbar. Select a Director (e.g., Ryan Cooler, Wes Sanderson) to apply their unique visual style (lighting, camera angles, color) to all your shots.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            3. Rating & Refinement
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Expand any shot to view details. Use the <strong>Result Rating (0-5 Stars)</strong> to track which prompts are working. You can edit the prompt text directly if needed.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            4. Greenlighting
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            When you are happy with a shot&apos;s prompt, click the <strong>Greenlight Shot</strong> button. This marks it as &quot;Approved&quot; for final image generation.
                            (The system will check for your ratings and feedback to improve future generations).
                        </p>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    )
}
