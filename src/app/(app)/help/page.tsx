"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Clapperboard, FlaskConical, Sparkles, Layout, Grid } from "lucide-react"

export default function HelpPage() {
    return (
        <div className="container mx-auto p-6 space-y-6 max-w-5xl">
            <div className="flex items-center gap-4">
                <BookOpen className="w-8 h-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Director&apos;s Palette v2 - User Manual</h1>
                    <p className="text-muted-foreground">Your AI-powered filmmaking companion.</p>
                </div>
            </div>

            <Tabs defaultValue="start" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
                    <TabsTrigger value="start">Getting Started</TabsTrigger>
                    <TabsTrigger value="storyboard">Storyboard</TabsTrigger>
                    <TabsTrigger value="director">Director Vision</TabsTrigger>
                    <TabsTrigger value="lab">Shot Lab</TabsTrigger>
                    <TabsTrigger value="prompts">Syntax</TabsTrigger>
                    <TabsTrigger value="gallery">Gallery</TabsTrigger>
                </TabsList>

                {/* Getting Started */}
                <TabsContent value="start" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Getting Started</CardTitle>
                            <CardDescription>Begin your journey with the Director&apos;s Palette.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Navigate to the <strong>Storyboard</strong> tab to begin. You can paste your script or write a new story from scratch. The AI will analyze your text and break it down into cinematic shots.</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Storyboard */}
                <TabsContent value="storyboard" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clapperboard className="w-5 h-5 text-blue-400" />
                                The Storyboard
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Generating Shots</h3>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>Paste your script into the text area.</li>
                                    <li>Click <strong>&quot;Generate Shot Prompts&quot;</strong>.</li>
                                    <li>The system will create a list of shots, each with a proposed camera angle and description.</li>
                                </ol>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Greenlight & Ratings</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Review:</strong> Expand any shot to verify its details.</li>
                                    <li><strong>Rate:</strong> Use the Star Rating (0-5) to mark quality.</li>
                                    <li><strong>Greenlight:</strong> Toggle the Greenlight switch to approve a shot for production. Approved shots receive a green badge.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Director Vision */}
                <TabsContent value="director" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                Director&apos;s Vision
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p>Transform your generic shots into stylized masterpieces by commissioning an AI Director.</p>

                            <div>
                                <h3 className="font-semibold text-lg mb-2">How to Commission</h3>
                                <ol className="list-decimal pl-5 space-y-1">
                                    <li>In the Storyboard toolbar, click <strong>&quot;Commission Vision&quot;</strong> (Projector Icon).</li>
                                    <li>Select a Director from the list.</li>
                                    <li>Click <strong>&quot;Apply Vision&quot;</strong>.</li>
                                    <li>The AI will rewrite all your prompts to match the director&apos;s signature style.</li>
                                </ol>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="p-4 border rounded-lg bg-muted/20">
                                    <h4 className="font-bold">Ryan Cooler</h4>
                                    <p className="text-sm text-muted-foreground">Dynamic camera movement, high contrast, emotional weight.</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-muted/20">
                                    <h4 className="font-bold">Wes Sanderson</h4>
                                    <p className="text-sm text-muted-foreground">Symmetrical composition, pastel palettes, whip pans.</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-muted/20">
                                    <h4 className="font-bold">Hype Millions</h4>
                                    <p className="text-sm text-muted-foreground">Fish-eye lenses, glossy futurism, vibrant colors.</p>
                                </div>
                                <div className="p-4 border rounded-lg bg-muted/20">
                                    <h4 className="font-bold">David Pincher</h4>
                                    <p className="text-sm text-muted-foreground">Low-key lighting, technical precision, psychological tension.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Shot Lab */}
                <TabsContent value="lab" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-purple-400" />
                                Shot Lab (Refinement)
                            </CardTitle>
                            <CardDescription>Click the &quot;Refine Shot&quot; button (Flask Icon) on any shot card to enter.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 font-semibold text-lg text-purple-300">
                                    <Layout className="w-5 h-5" />
                                    Blocking (Layout)
                                </div>
                                <p>Arrange your scene visually before generating.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Add Actors (Purple):</strong> Drag characters onto the stage.</li>
                                    <li><strong>Add Props (Yellow):</strong> Place objects in the scene.</li>
                                    <li><strong>Generate Prompt:</strong> Converts your layout into a text description.</li>
                                </ul>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 font-semibold text-lg text-amber-300">
                                    <FlaskConical className="w-5 h-5" />
                                    VFX Bay (Masking)
                                </div>
                                <p>Make precise edits to generated images.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Paint Mask:</strong> Draw over the area you want to change.</li>
                                    <li><strong>Instruction:</strong> Type what you want to change (e.g., &quot;Make the tie red&quot;).</li>
                                    <li><strong>Floating Toolbar:</strong> Access tools easily with the glow-themed palette.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Syntax */}
                <TabsContent value="prompts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Prompt Syntax</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Advanced users can use special syntax in their prompts:</p>
                            <div className="grid gap-2">
                                <code className="bg-muted p-2 rounded block">INT. / EXT.</code>
                                <span className="text-sm text-muted-foreground">Interior / Exterior scene setting.</span>

                                <code className="bg-muted p-2 rounded block">[style] / [lighting]</code>
                                <span className="text-sm text-muted-foreground">Wildcards that let the AI fill in details based on the active Director.</span>

                                <code className="bg-muted p-2 rounded block">{'{character}'}</code>
                                <span className="text-sm text-muted-foreground">Dynamic placeholders replaced by character names.</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Gallery */}
                <TabsContent value="gallery" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Grid className="w-5 h-5" />
                                Gallery & Organization
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>Folders:</strong> Create folders to organize shots by scene or project. Colored badges help identify them.</li>
                                <li><strong>Filtering:</strong> Filter by &quot;Uncategorized&quot; or specific folders.</li>
                                <li><strong>Bulk Actions:</strong> Select multiple images to move or delete them in batches.</li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
