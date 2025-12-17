"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    BookOpen,
    Clapperboard,
    FlaskConical,
    Sparkles,
    Layout,
    Grid,
    Film,
    Wand2,
    Info
} from "lucide-react"

export function UserManual() {
    return (
        <div className="flex h-full bg-background text-foreground relative overflow-hidden">
            {/* Table of Contents Sidebar */}
            <div className="w-64 border-r border-border/50 hidden lg:block p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-6 h-6 text-primary" />
                    <span className="font-bold text-lg">Manual</span>
                </div>

                <nav className="space-y-1">
                    <a href="#getting-started" className="block px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Getting Started</a>
                    <a href="#storyboard" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">The Storyboard</a>
                    <a href="#director-vision" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Director&apos;s Vision</a>
                    <a href="#shot-lab" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Shot Lab</a>
                    <a href="#syntax" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Prompt Syntax</a>
                    <a href="#gallery" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Gallery</a>
                    <a href="#models" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">AI Models</a>
                </nav>

                <div className="pt-6 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Version 2.0</p>
                    <p className="text-xs text-muted-foreground mt-1">© 2025 Director&apos;s Palette</p>
                </div>
            </div>

            {/* Main Content Area */}
            <ScrollArea className="flex-1 h-full">
                <div className="max-w-4xl mx-auto p-8 space-y-12">

                    {/* Header */}
                    <div className="space-y-4 text-center pb-8 border-b border-border/50">
                        <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
                            <img src="/favicon.ico" alt="Logo" className="w-12 h-12 object-contain filter grayscale brightness-200" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Director&apos;s Palette</h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            The ultimate AI-powered filmmaking companion. From script to storyboard, visualize your masterpiece with precision and style.
                        </p>
                    </div>

                    {/* Getting Started */}
                    <section id="getting-started" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            Getting Started
                        </h2>
                        <Card>
                            <CardContent className="p-6">
                                <p className="leading-relaxed">
                                    Welcome to the suite. Your journey begins in the <strong>Storyboard</strong> tab.
                                    Whether you&apos;re adapting a screenplay or brainstorming from scratch, the Director&apos;s Palette
                                    provides the tools to visualize every shot.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <h3 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Storyboard</h3>
                                        <p className="text-sm text-muted-foreground">Break down scripts into shots.</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Shot Creator</h3>
                                        <p className="text-sm text-muted-foreground">Quickly iterate on single ideas.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* The Storyboard */}
                    <section id="storyboard" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Clapperboard className="w-6 h-6 text-blue-500" /> The Storyboard
                        </h2>
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Scene Analysis Engine</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Paste your script segments directly into the editor. Our AI analyzes the action, dialogue, and mood
                                        to automatically propose a shot list complete with camera angles (`CU`, `Wide`, `Overshoulder`) and descriptive prompts.
                                    </p>
                                    <div className="bg-muted p-4 rounded-md text-sm font-mono text-muted-foreground">
                                        Input: &quot;John walks into the bar, looking tired.&quot; <br />
                                        Output: &quot;Medium Shot of John entering dimly lit bar, visible fatigue, shadows...&quot;
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Greenlight System</h3>
                                    <ul className="space-y-2">
                                        <li className="flex gap-3">
                                            <span className="bg-green-500/10 text-green-500 p-1 rounded h-fit"><Info className="w-4 h-4" /></span>
                                            <span><strong>Review:</strong> Expand shots to inspect details.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-amber-500/10 text-amber-500 p-1 rounded h-fit"><Sparkles className="w-4 h-4" /></span>
                                            <span><strong>Rate:</strong> 0-5 Star rating system for quality control.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-blue-500/10 text-blue-500 p-1 rounded h-fit"><Film className="w-4 h-4" /></span>
                                            <span><strong>Greenlight:</strong> Toggle the switch to mark shots ready for production.</span>
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Director's Vision */}
                    <section id="director-vision" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Film className="w-6 h-6 text-amber-500" /> Director&apos;s Vision
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Don&apos;t just generate images—direct them. Apply signature styles from legendary (AI) auteurs.
                        </p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Card className="bg-gradient-to-br from-background to-muted/20">
                                <CardHeader>
                                    <CardTitle>Ryan Cooler</CardTitle>
                                    <CardDescription>Emotion & Legacy</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    Focuses on intimate character moments, warm lighting, and emotional weight. Ideal for drama and character studies.
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20">
                                <CardHeader>
                                    <CardTitle>Wes Sanderson</CardTitle>
                                    <CardDescription>Whimsy & Symmetry</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    Pastel color palettes, perfect center framing, and a storybook aesthetic. Great for stylized narratives.
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20">
                                <CardHeader>
                                    <CardTitle>David Pincher</CardTitle>
                                    <CardDescription>Precision & Thriller</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    Low-key lighting, cool greens/blues, and clinical composition. Perfect for suspense and tech-noir.
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-background to-muted/20">
                                <CardHeader>
                                    <CardTitle>Hype Millions</CardTitle>
                                    <CardDescription>Visual Spectacle</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm">
                                    Glossy, high-contrast, wide angles, and a music video aesthetic. For high-energy sequences.
                                </CardContent>
                            </Card>
                        </div>
                    </section>


                    {/* Shot Lab */}
                    <section id="shot-lab" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FlaskConical className="w-6 h-6 text-purple-500" /> Shot Lab & VFX Bay
                        </h2>
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-semibold text-lg text-purple-400">
                                            <Layout className="w-5 h-5" /> Canvas Editor (Blocking)
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Compose your shot before the AI touches it. Drag and drop proxies to set the scene.
                                        </p>
                                        <ul className="text-sm space-y-2 list-disc pl-4 text-muted-foreground">
                                            <li><strong>Actors (Purple):</strong> place characters to define blocking.</li>
                                            <li><strong>Props (Yellow):</strong> Set the environment.</li>
                                            <li><strong>Cameras (Green):</strong> Define the angle of view.</li>
                                        </ul>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 font-semibold text-lg text-amber-400">
                                            <Wand2 className="w-5 h-5" /> VFX Bay (Inpainting)
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Fix details without regenerating the whole image.
                                        </p>
                                        <ul className="text-sm space-y-2 list-disc pl-4 text-muted-foreground">
                                            <li><strong>Paint Mask:</strong> Highlight the area to change.</li>
                                            <li><strong>Prompt:</strong> &quot;Red tie&quot; or &quot;Sunglasses&quot;.</li>
                                            <li><strong>Render:</strong> AI seamlessly blends the new element.</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Prompt Syntax */}
                    <section id="syntax" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-pink-500" /> Prompt Syntax
                        </h2>
                        <p className="text-muted-foreground">Power users can utilize our prompt engine&apos;s special variables.</p>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-start p-4 rounded-lg border bg-card">
                                <code className="px-2 py-1 bg-muted rounded text-primary font-mono whitespace-nowrap">INT. / EXT.</code>
                                <div>
                                    <h4 className="font-semibold">Scene Header</h4>
                                    <p className="text-sm text-muted-foreground">Sets the context. Use at the start of prompts.</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start p-4 rounded-lg border bg-card">
                                <code className="px-2 py-1 bg-muted rounded text-primary font-mono whitespace-nowrap">[style]</code>
                                <div>
                                    <h4 className="font-semibold">Style Wildcard</h4>
                                    <p className="text-sm text-muted-foreground">Injects the active Director&apos;s visual tokens (e.g. &quot;neon lighting&quot;, &quot;pastel colors&quot;).</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start p-4 rounded-lg border bg-card">
                                <code className="px-2 py-1 bg-muted rounded text-primary font-mono whitespace-nowrap">{'{character}'}</code>
                                <div>
                                    <h4 className="font-semibold">Character Interpolation</h4>
                                    <p className="text-sm text-muted-foreground">Replaces placeholders with trained LoRA triggers or consistent character descriptions.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Gallery */}
                    <section id="gallery" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Grid className="w-6 h-6 text-green-500" /> Gallery & Assets
                        </h2>
                        <Card>
                            <CardContent className="p-6">
                                <p className="mb-4">
                                    Your personal asset library. Organized, filtered, and ready for export.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <span className="font-semibold flex items-center gap-2 text-sm"><Layout className="w-4 h-4" /> Folders</span>
                                        <p className="text-xs text-muted-foreground">Create project-specific folders with custom color badges.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="font-semibold flex items-center gap-2 text-sm"><Sparkles className="w-4 h-4" /> Smart Filters</span>
                                        <p className="text-xs text-muted-foreground">Sort by specific Directors, Uncategorized shots, or Date.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="font-semibold flex items-center gap-2 text-sm"><Grid className="w-4 h-4" /> Bulk Actions</span>
                                        <p className="text-xs text-muted-foreground">Select multiple shots to Move or Delete in one click.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* AI Models */}
                    <section id="models" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-amber-500" /> AI Models
                        </h2>
                        <p className="text-muted-foreground">
                            Choose the right model for your workflow. Balance speed, quality, and cost.
                        </p>

                        <div className="grid gap-6">
                            {/* Qwen Image Fast */}
                            <Card className="bg-gradient-to-br from-cyan-950/20 to-background border-cyan-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="text-2xl">🚀</span> Qwen Image Fast
                                        </CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-cyan-500/20 text-cyan-400">2 TOKENS</span>
                                    </div>
                                    <CardDescription>Lightning-fast with world-class text rendering</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                                        <span><strong>Speed:</strong> ~2 seconds</span>
                                        <span><strong>Quality:</strong> Good</span>
                                        <span><strong>References:</strong> None</span>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-cyan-400">Prompting Tips</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Keep prompts simple and clear (1-3 sentences)</li>
                                            <li>Describe: subject → environment → details</li>
                                            <li>Best for precise, literal interpretations</li>
                                            <li>For text: use short phrases in quotes with font/color specs</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <span className="font-semibold text-green-400">Strengths</span>
                                            <p className="text-muted-foreground mt-1">Best text rendering (EN/ZH), minimal hallucinations, exceptional prompt accuracy</p>
                                        </div>
                                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <span className="font-semibold text-red-400">Weaknesses</span>
                                            <p className="text-muted-foreground mt-1">Lacks creative flair, struggles with abstract/fantasy art, can have &quot;AI skin&quot; look</p>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground border-t border-border/50 pt-3">
                                        <strong>Best for:</strong> Marketing with text, bilingual content (EN/ZH), presentations, signage, brand logos, precision over creativity.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Z-Image Turbo */}
                            <Card className="bg-gradient-to-br from-purple-950/20 to-background border-purple-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="text-2xl">⚡</span> Z-Image Turbo
                                        </CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-purple-500/20 text-purple-400">5 TOKENS</span>
                                    </div>
                                    <CardDescription>Fast Flux-based generation with great text</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                                        <span><strong>Speed:</strong> ~4 seconds</span>
                                        <span><strong>Quality:</strong> Good</span>
                                        <span><strong>References:</strong> Up to 1</span>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-purple-400">Prompting Tips</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Use natural language, not keyword lists</li>
                                            <li>Be specific and literal (80-250 words ideal)</li>
                                            <li>No prompt weights - use &quot;with emphasis on&quot; instead</li>
                                            <li>Include constraints in prompt (no negative prompts)</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <span className="font-semibold text-green-400">Strengths</span>
                                            <p className="text-muted-foreground mt-1">Exceptional speed, excellent text (EN/ZH), natural lighting, open source (Apache)</p>
                                        </div>
                                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <span className="font-semibold text-red-400">Weaknesses</span>
                                            <p className="text-muted-foreground mt-1">Less detail than slower models, struggles with complex requests, poor inpainting</p>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground border-t border-border/50 pt-3">
                                        <strong>Best for:</strong> Rapid prototyping, brainstorming, thumbnails, bilingual text, high-volume generation, commercial use.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Nano Banana */}
                            <Card className="bg-gradient-to-br from-yellow-950/20 to-background border-yellow-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="text-2xl">🍌</span> Nano Banana
                                        </CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400">8 TOKENS</span>
                                    </div>
                                    <CardDescription>Google Imagen 3 - Professional quality</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                                        <span><strong>Speed:</strong> ~5 seconds</span>
                                        <span><strong>Quality:</strong> Excellent</span>
                                        <span><strong>References:</strong> Up to 10</span>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-yellow-400">Prompting Tips</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Use narrative, descriptive paragraphs (not keywords)</li>
                                            <li>Employ photography terms: camera angles, lens types, lighting</li>
                                            <li>Include quality modifiers: &quot;high-quality&quot;, &quot;beautiful&quot;, &quot;stylized&quot;</li>
                                            <li>Keep text to ≤25 characters in images</li>
                                            <li>Start broad, iterate and add details progressively</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <span className="font-semibold text-green-400">Strengths</span>
                                            <p className="text-muted-foreground mt-1">Exceptional prompt comprehension, superior photorealism, excellent detail (lighting, shadows)</p>
                                        </div>
                                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <span className="font-semibold text-red-400">Weaknesses</span>
                                            <p className="text-muted-foreground mt-1">Requires detailed prompts for best results, may struggle with abstract concepts</p>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground border-t border-border/50 pt-3">
                                        <strong>Best for:</strong> Professional photography-style renders, marketing campaigns, architectural visualizations, complex lighting setups.
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Nano Banana Pro */}
                            <Card className="bg-gradient-to-br from-amber-950/20 to-background border-amber-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="text-2xl">🔥</span> Nano Banana Pro
                                        </CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-amber-500/20 text-amber-400">20 TOKENS</span>
                                    </div>
                                    <CardDescription>Google Imagen 3 Premium - State-of-the-art</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                                        <span><strong>Speed:</strong> ~8 seconds</span>
                                        <span><strong>Quality:</strong> SOTA</span>
                                        <span><strong>References:</strong> Up to 14</span>
                                        <span><strong>Resolution:</strong> Up to 4K</span>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-amber-400">Prompting Tips</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Same prompting as Nano Banana - elaborate prompts yield best quality</li>
                                            <li>Specify arrangement, lighting, and fine details</li>
                                            <li>Perfect for complex scenes with multiple elements</li>
                                            <li>Use 4K resolution for print-quality deliverables</li>
                                            <li>Safety filter options: block_low_and_above, block_medium_and_above, block_only_high</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <span className="font-semibold text-green-400">Strengths</span>
                                            <p className="text-muted-foreground mt-1">Highest quality output, 4K resolution support, accurate text rendering, 40% faster than previous gen</p>
                                        </div>
                                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <span className="font-semibold text-red-400">Weaknesses</span>
                                            <p className="text-muted-foreground mt-1">Highest cost, slower generation, may produce artifacts at lower settings</p>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground border-t border-border/50 pt-3">
                                        <strong>Best for:</strong> Final production images, marketing materials, professional photography, print deliverables, projects where quality is paramount.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* General Prompting Guide */}
                        <Card className="bg-gradient-to-br from-violet-950/20 to-background border-violet-900/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-violet-400" /> Universal Prompting Guide
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-green-400">✓ Best Practices</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Start broad, add detail incrementally</li>
                                            <li>Use natural, descriptive language</li>
                                            <li>Be specific about lighting, camera, composition</li>
                                            <li>Use seeds for consistency when testing</li>
                                            <li>Include quality modifiers</li>
                                        </ul>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-red-400">✗ Common Mistakes</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Vague descriptions (&quot;beautiful&quot;, &quot;nice&quot;)</li>
                                            <li>Keyword stuffing without context</li>
                                            <li>Contradictory instructions</li>
                                            <li>Overloading (focus on 3-5 key concepts)</li>
                                            <li>Expecting perfect results on first try</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                    <h4 className="font-semibold mb-2">Prompt Template Structure</h4>
                                    <code className="text-xs text-violet-400 block">
                                        [SUBJECT] + [ATTRIBUTES] + [ACTION/STATE] + [ENVIRONMENT] + [STYLE] + [TECHNICAL SPECS] + [LIGHTING]
                                    </code>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        <strong>Example:</strong> &quot;A 30-year-old female astronaut in a white NASA spacesuit, floating in the International Space Station, looking through a window at Earth, documentary photography style, wide-angle lens, soft natural lighting, high detail, photorealistic&quot;
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Token System */}
                        <Card className="bg-muted/30 border-border/50">
                            <CardContent className="p-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Token System
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    1 token = $0.01. Tokens are deducted per generation. Purchase tokens through your account settings.
                                    Reference images (style matching) are only available on models that support them.
                                </p>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Footer */}
                    <div className="pt-12 text-center text-muted-foreground">
                        <p>Need more help? Contact our support team.</p>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}
