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
    Info,
    Key,
    Code,
    Shuffle,
    Video,
    Clock,
    Coins,
    ImageIcon,
    LayoutGrid,
    GalleryHorizontal,
    RefreshCw,
    Eye,
    Download,
    Layers,
    Pencil
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

const TOC_LINKS = [
    { href: '#getting-started', label: 'Getting Started', indent: false },
    { href: '#storyboard', label: 'The Storyboard', indent: false },
    { href: '#storyboard-gallery', label: 'Storyboard Gallery', indent: true },
    { href: '#director-vision', label: "Director's Vision", indent: false },
    { href: '#shot-lab', label: 'Shot Lab', indent: false },
    { href: '#recipes', label: 'Recipes', indent: false },
    { href: '#syntax', label: 'Prompt Syntax', indent: false },
    { href: '#anchor-transform', label: 'Anchor Transform', indent: false },
    { href: '#gallery', label: 'Gallery', indent: false },
    { href: '#video-generation', label: 'Video Generation', indent: false },
    { href: '#models', label: 'Image Generation', indent: false },
    { href: '#api-access', label: 'API Access', indent: false },
]

export function UserManual() {
    const [mobileTocOpen, setMobileTocOpen] = useState(false)

    return (
        <div className="flex flex-col lg:flex-row h-full bg-background text-foreground relative overflow-hidden">
            {/* Mobile TOC Dropdown */}
            <div className="lg:hidden border-b border-border/50 flex-shrink-0">
                <button
                    onClick={() => setMobileTocOpen(!mobileTocOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Jump to Section
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${mobileTocOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileTocOpen && (
                    <nav className="px-2 pb-3 space-y-0.5 max-h-64 overflow-y-auto">
                        {TOC_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileTocOpen(false)}
                                className={`block px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors ${link.indent ? 'pl-6' : 'font-medium'}`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>
                )}
            </div>

            {/* Table of Contents Sidebar */}
            <div className="w-64 border-r border-border/50 hidden lg:block p-6 space-y-6 overflow-y-auto flex-shrink-0">
                <div className="flex items-center gap-2 mb-6">
                    <BookOpen className="w-6 h-6 text-primary" />
                    <span className="font-bold text-lg">Manual</span>
                </div>

                <nav className="space-y-1">
                    <a href="#getting-started" className="block px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Getting Started</a>
                    <a href="#storyboard" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">The Storyboard</a>
                    <a href="#storyboard-gallery" className="block px-3 py-2 pl-6 text-sm rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Storyboard Gallery</a>
                    <a href="#director-vision" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Director&apos;s Vision</a>
                    <a href="#shot-lab" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Shot Lab</a>
                    <a href="#recipes" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Recipes</a>
                    <a href="#syntax" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Prompt Syntax</a>
                    <a href="#anchor-transform" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Anchor Transform</a>
                    <a href="#gallery" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Gallery</a>
                    <a href="#video-generation" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Video Generation</a>
                    <a href="#models" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">Image Generation</a>
                    <a href="#api-access" className="block px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">API Access</a>
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

                    {/* Storyboard Gallery */}
                    <section id="storyboard-gallery" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <GalleryHorizontal className="w-6 h-6 text-indigo-500" /> Storyboard Gallery
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Once your shots are generated, the Results tab becomes your gallery. View, edit, and manage your storyboard shots.
                        </p>

                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <LayoutGrid className="w-5 h-5 text-blue-500" /> Grid &amp; Carousel Views
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        Toggle between two viewing modes using the icons in the top-right of the gallery header.
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex gap-3">
                                            <span className="bg-blue-500/10 text-blue-500 p-1 rounded h-fit"><LayoutGrid className="w-4 h-4" /></span>
                                            <span><strong>Grid View:</strong> See all shots at once in a responsive grid. Hover over any shot to reveal the action toolbar.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-indigo-500/10 text-indigo-500 p-1 rounded h-fit"><GalleryHorizontal className="w-4 h-4" /></span>
                                            <span><strong>Carousel View:</strong> Focus on one shot at a time. Use the left/right arrows or dot indicators to navigate between shots. Includes a prompt editor below the image.</span>
                                        </li>
                                    </ul>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Pencil className="w-5 h-5 text-green-500" /> Prompt Editor (Carousel View)
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        In Carousel view, the prompt editor appears below the current shot. You can edit the prompt and regenerate with your changes.
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex gap-3">
                                            <span className="bg-green-500/10 text-green-500 p-1 rounded h-fit"><Pencil className="w-4 h-4" /></span>
                                            <span><strong>Edit:</strong> Click into the prompt text area to modify the shot description. The prompt updates as you navigate between shots.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-amber-500/10 text-amber-500 p-1 rounded h-fit"><RefreshCw className="w-4 h-4" /></span>
                                            <span><strong>Regenerate:</strong> Click &quot;Regenerate&quot; to re-roll the same prompt, or edit the text first and click &quot;Regenerate with Changes&quot; to generate from your modified prompt.</span>
                                        </li>
                                    </ul>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-purple-500" /> Shot Actions
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        Hover over any completed shot (Grid view) or view the toolbar below the image (Carousel view) to access these actions:
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex gap-3">
                                            <span className="bg-purple-500/10 text-purple-500 p-1 rounded h-fit"><FlaskConical className="w-4 h-4" /></span>
                                            <span><strong>Shot Lab:</strong> Open the shot in Shot Lab for advanced editing, inpainting, and re-prompting.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-blue-500/10 text-blue-500 p-1 rounded h-fit"><Eye className="w-4 h-4" /></span>
                                            <span><strong>Preview:</strong> Open a full-size lightbox preview of the image.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-cyan-500/10 text-cyan-500 p-1 rounded h-fit"><Grid className="w-4 h-4" /></span>
                                            <span><strong>Angles (Contact Sheet):</strong> Generate a 3x3 grid of alternative camera angles for the same scene.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-teal-500/10 text-teal-500 p-1 rounded h-fit"><Layers className="w-4 h-4" /></span>
                                            <span><strong>B-Roll:</strong> Generate a 3x3 grid of complementary B-roll shots that match the scene&apos;s look and feel.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-indigo-500/10 text-indigo-500 p-1 rounded h-fit"><Wand2 className="w-4 h-4" /></span>
                                            <span><strong>Animate:</strong> Turn a still shot into a 5-second video clip. Uses the AI director&apos;s style (if selected) to guide camera motion. Once ready, a &quot;Video&quot; badge appears on the shot.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-green-500/10 text-green-500 p-1 rounded h-fit"><Download className="w-4 h-4" /></span>
                                            <span><strong>Download:</strong> Save the individual shot image to your device.</span>
                                        </li>
                                    </ul>
                                </div>
                                <Separator />
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-amber-500" /> Gallery Header Controls
                                    </h3>
                                    <ul className="space-y-2">
                                        <li className="flex gap-3">
                                            <span className="bg-green-500/10 text-green-500 p-1 rounded h-fit"><Sparkles className="w-4 h-4" /></span>
                                            <span><strong>Status Counts:</strong> See how many shots are completed, pending, or failed at a glance.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-red-500/10 text-red-500 p-1 rounded h-fit"><RefreshCw className="w-4 h-4" /></span>
                                            <span><strong>Retry Failed:</strong> If any shots fail, click this button to regenerate all failed shots at once.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-blue-500/10 text-blue-500 p-1 rounded h-fit"><Film className="w-4 h-4" /></span>
                                            <span><strong>Completed Only / Show All:</strong> Filter the gallery to show only successfully generated shots, or show everything including pending and failed.</span>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="bg-green-500/10 text-green-500 p-1 rounded h-fit"><Download className="w-4 h-4" /></span>
                                            <span><strong>Download All:</strong> Download every completed shot as a single ZIP file.</span>
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

                    {/* Recipes */}
                    <section id="recipes" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FlaskConical className="w-6 h-6 text-amber-500" /> Recipes
                        </h2>
                        <p className="text-muted-foreground">
                            Recipes are reusable prompt templates with customizable fields. Create consistent outputs with variable substitution.
                        </p>

                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">How Recipes Work</h3>
                                    <p className="text-muted-foreground mb-4">
                                        A recipe is a prompt template with placeholders that you fill in before generating.
                                        This ensures consistency across multiple generations while allowing customization.
                                    </p>
                                    <div className="bg-muted p-4 rounded-md text-sm font-mono">
                                        <p className="text-amber-400 mb-2">Template:</p>
                                        <p className="text-muted-foreground">&quot;A {'{{style}}'} portrait of {'{{subject}}'} in {'{{setting}}'}, {'{{lighting}}'} lighting&quot;</p>
                                        <p className="text-amber-400 mt-4 mb-2">Filled In:</p>
                                        <p className="text-muted-foreground">&quot;A cinematic portrait of a detective in a rain-soaked alley, neon lighting&quot;</p>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Built-in Recipes</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm">Style Guide Grid</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Generate 9 variations of a subject in different styles</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm">Character Sheet</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Create character turnarounds and expression sheets</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm">9-Frame Cinematic</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Generate a sequence of 9 cinematic shots</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm">Time of Day</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Same scene at different times (dawn, noon, dusk, night)</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Creating Custom Recipes</h3>
                                    <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-4">
                                        <li>Go to <strong>Prompt Tools → Recipes</strong></li>
                                        <li>Click <strong>Create Recipe</strong></li>
                                        <li>Write your prompt template with <code className="px-1 bg-muted rounded">{'{{field_name}}'}</code> placeholders</li>
                                        <li>Define field types: text input, dropdown select, or number</li>
                                        <li>Save and use from the Shot Creator</li>
                                    </ol>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Prompt Syntax */}
                    <section id="syntax" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Code className="w-6 h-6 text-pink-500" /> Prompt Syntax
                        </h2>
                        <p className="text-muted-foreground">
                            Director&apos;s Palette has a powerful prompt syntax for variations, sequences, and randomization.
                        </p>

                        <Card>
                            <CardContent className="p-6 space-y-6">
                                {/* Brackets - Variations */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <span className="text-violet-400">[Brackets]</span> - Variations
                                    </h3>
                                    <p className="text-muted-foreground mb-3">
                                        Use brackets to create multiple variations. Each option separated by commas generates a separate image.
                                    </p>
                                    <div className="bg-muted p-4 rounded-md space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Input:</p>
                                            <code className="text-sm text-violet-400">A [red, blue, green] sports car</code>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Generates 3 images:</p>
                                            <p className="text-sm text-muted-foreground">• A red sports car</p>
                                            <p className="text-sm text-muted-foreground">• A blue sports car</p>
                                            <p className="text-sm text-muted-foreground">• A green sports car</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Pipes - Sequences */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <span className="text-amber-400">|Pipes|</span> - Sequences (Pipe Chaining)
                                    </h3>
                                    <p className="text-muted-foreground mb-3">
                                        Use pipes to chain prompts in sequence. The output of each step becomes the input for the next.
                                    </p>
                                    <div className="bg-muted p-4 rounded-md space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Input:</p>
                                            <code className="text-sm text-amber-400">A sketch of a robot | colored pencil rendering | photorealistic 3D render</code>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Sequence:</p>
                                            <p className="text-sm text-muted-foreground">1. Generate sketch → 2. Use as reference for colored version → 3. Use as reference for 3D render</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Great for iterative refinement: start rough, progressively add detail.
                                    </p>
                                </div>

                                <Separator />

                                {/* Wildcards */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <Shuffle className="w-4 h-4 text-cyan-400" />
                                        <span className="text-cyan-400">_Wildcards_</span> - Random Selection
                                    </h3>
                                    <p className="text-muted-foreground mb-3">
                                        Use underscores to reference your wildcard lists. A random value from the list is inserted each generation.
                                    </p>
                                    <div className="bg-muted p-4 rounded-md space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Wildcard &quot;mood&quot; contains: dramatic, peaceful, mysterious, energetic</p>
                                            <p className="text-xs text-muted-foreground mb-1">Input:</p>
                                            <code className="text-sm text-cyan-400">A _mood_ forest landscape at sunset</code>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Might generate:</p>
                                            <p className="text-sm text-muted-foreground">• A dramatic forest landscape at sunset</p>
                                            <p className="text-sm text-muted-foreground">• A mysterious forest landscape at sunset</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Create wildcards in <strong>Prompt Tools → Wildcards</strong>
                                    </p>
                                </div>

                                <Separator />

                                {/* Scene Headers */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Scene Headers</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <code className="text-primary font-mono">INT.</code>
                                            <p className="text-xs text-muted-foreground mt-1">Interior scene - indoor lighting assumed</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <code className="text-primary font-mono">EXT.</code>
                                            <p className="text-xs text-muted-foreground mt-1">Exterior scene - natural lighting assumed</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <code className="text-primary font-mono">CU</code>
                                            <p className="text-xs text-muted-foreground mt-1">Close-up shot</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <code className="text-primary font-mono">WS</code>
                                            <p className="text-xs text-muted-foreground mt-1">Wide shot / establishing shot</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Anchor Transform */}
                    <section id="anchor-transform" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-2xl text-orange-500">¡</span> Anchor Transform
                        </h2>
                        <p className="text-muted-foreground">
                            Transform multiple images to match a single style reference. Cost-effective batch styling with consistent results.
                        </p>

                        <Card className="bg-gradient-to-br from-orange-950/20 to-background border-orange-900/30">
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">How Anchor Transform Works</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Upload multiple reference images. The <strong>first image</strong> becomes your style &quot;anchor&quot; -
                                        all subsequent images will be transformed to match that style. This is perfect for converting
                                        a batch of photos to the same art style (e.g., anime, watercolor, claymation).
                                    </p>
                                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                            <div className="text-2xl mb-2">🎨</div>
                                            <h4 className="font-semibold text-sm text-orange-400">1. Add Style Image</h4>
                                            <p className="text-xs text-muted-foreground mt-1">First image is your style anchor</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                            <div className="text-2xl mb-2">📷</div>
                                            <h4 className="font-semibold text-sm text-orange-400">2. Add Input Images</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Add images you want to transform</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                            <div className="text-2xl mb-2">✨</div>
                                            <h4 className="font-semibold text-sm text-orange-400">3. Generate</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Each input transforms to anchor style</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">How to Enable</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                                <span className="text-orange-400 font-mono">¡</span> Click the Anchor Button
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                In the prompt area, click the <span className="text-orange-400 font-mono font-bold">¡</span> button
                                                (requires 2+ reference images)
                                            </p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                                <span className="text-orange-400 font-mono">@!</span> Type in Prompt
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Add <code className="px-1 bg-muted rounded text-orange-400">@!</code> anywhere in your prompt
                                                to enable anchor mode
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Example Use Cases</h3>
                                    <ul className="space-y-2 text-sm text-muted-foreground">
                                        <li className="flex gap-2">
                                            <span className="text-orange-400">•</span>
                                            <span><strong>Style Transfer:</strong> Convert family photos to anime style using one anime reference</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-orange-400">•</span>
                                            <span><strong>Product Consistency:</strong> Make all product shots match the same lighting/style</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-orange-400">•</span>
                                            <span><strong>Art Direction:</strong> Transform storyboard sketches to a consistent visual style</span>
                                        </li>
                                        <li className="flex gap-2">
                                            <span className="text-orange-400">•</span>
                                            <span><strong>Character Consistency:</strong> Keep character appearances uniform across scenes</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <Info className="w-4 h-4" /> Cost
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Anchor Transform costs <strong>1 generation per input image</strong> (the anchor image is free).
                                        If you have 5 images total (1 anchor + 4 inputs), you&apos;ll generate 4 images.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
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

                    {/* Video Generation */}
                    <section id="video-generation" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Video className="w-6 h-6 text-red-500" /> Video Generation
                        </h2>
                        <p className="text-muted-foreground">
                            Bring your storyboards to life with AI-powered video generation. Choose from 5 video models with different speed, quality, and pricing options.
                        </p>

                        {/* System Infographic */}
                        <Card className="bg-gradient-to-br from-slate-950/50 to-background border-slate-800/50 overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-400" /> Video Credit System Overview
                                </CardTitle>
                                <CardDescription>Visual guide to models, pricing, and storage limits</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <div className="relative w-full max-w-md aspect-[9/16] rounded-lg overflow-hidden border border-border/50 shadow-2xl">
                                    <Image
                                        src="/docs/video-system-infographic.png"
                                        alt="Video Generation System Infographic - Models, Pricing, Storage Limits"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Video Models Quick Reference */}
                        <div className="grid gap-4">
                            <Card className="bg-gradient-to-br from-green-950/20 to-background border-green-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">WAN 2.2-5B Fast</CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-green-500/20 text-green-400">1 PT/VIDEO</span>
                                    </div>
                                    <CardDescription>Budget • ~4 seconds • 720p max</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Ultra-fast previews at minimal cost. Perfect for quick iterations.
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-blue-950/20 to-background border-blue-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">WAN 2.2 I2V Fast</CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-blue-500/20 text-blue-400">2-3 PTS/VIDEO</span>
                                    </div>
                                    <CardDescription>Budget+ • 5 seconds • Has Last Frame control</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Control where your video ends with the Last Frame feature.
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-yellow-950/20 to-background border-yellow-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Seedance Pro Fast</CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-yellow-500/20 text-yellow-400">2-9 PTS/SEC</span>
                                    </div>
                                    <CardDescription>Standard • Up to 12 seconds • 1080p</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Fast generation for longer videos. Supports all resolutions.
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-950/20 to-background border-orange-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Seedance Lite</CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-orange-500/20 text-orange-400">3-11 PTS/SEC</span>
                                    </div>
                                    <CardDescription>Featured • Up to 12 seconds • Last Frame + Reference Images (1-4)</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Full creative control with reference images and end frame control.
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-red-950/20 to-background border-red-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Kling 2.5 Turbo Pro</CardTitle>
                                        <span className="px-2 py-1 text-xs font-bold rounded bg-red-500/20 text-red-400">10 PTS/SEC</span>
                                    </div>
                                    <CardDescription>Premium • Up to 10 seconds • Best motion quality</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-muted-foreground">
                                    Highest quality motion for final renders. Worth the premium.
                                </CardContent>
                            </Card>
                        </div>

                        {/* Pricing Formula */}
                        <Card className="bg-muted/30 border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-400" /> Pricing Formula
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <h4 className="font-semibold text-green-400 mb-2">Per-Video Models</h4>
                                        <p className="text-sm text-muted-foreground">WAN models charge a flat rate regardless of duration.</p>
                                        <code className="text-xs mt-2 block text-green-300">Cost = Flat Rate</code>
                                    </div>
                                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                        <h4 className="font-semibold text-amber-400 mb-2">Per-Second Models</h4>
                                        <p className="text-sm text-muted-foreground">Seedance & Kling charge based on video duration.</p>
                                        <code className="text-xs mt-2 block text-amber-300">Cost = Rate × Duration</code>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                                    <p className="text-sm"><strong>Example:</strong> Seedance Lite @ 720p (5 pts/sec) × 8 seconds = <span className="text-amber-400 font-bold">40 points</span></p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Storage Limits */}
                        <Card className="bg-muted/30 border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" /> Storage Limits
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                        <h4 className="font-semibold text-violet-400 mb-2">Images</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• Maximum: <strong>500 images</strong> per account</li>
                                            <li>• Warning at 400 (amber badge)</li>
                                            <li>• Blocked at 500 (red badge)</li>
                                            <li>• No expiration - permanent storage</li>
                                        </ul>
                                    </div>
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <h4 className="font-semibold text-blue-400 mb-2">Videos</h4>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                            <li>• No count limit</li>
                                            <li>• <strong>Auto-expire after 7 days</strong></li>
                                            <li>• Download videos you want to keep!</li>
                                            <li>• Daily cleanup at 3 AM UTC</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* AI Models */}
                    <section id="models" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <ImageIcon className="w-6 h-6 text-purple-500" /> Image Generation
                        </h2>
                        <p className="text-muted-foreground">
                            Create stunning images with AI. Choose from 7 models with different speed, quality, reference image support, and pricing options.
                        </p>

                        {/* Image System Infographic */}
                        <Card className="bg-gradient-to-br from-purple-950/50 to-background border-purple-800/50 overflow-hidden">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="w-5 h-5 text-purple-400" /> Image Credit System Overview
                                </CardTitle>
                                <CardDescription>Visual guide to models, pricing, and reference image support</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <div className="relative w-full max-w-md aspect-[9/16] rounded-lg overflow-hidden border border-border/50 shadow-2xl">
                                    <Image
                                        src="/docs/image-system-infographic.png"
                                        alt="Image Generation System Infographic - Models, Pricing, Reference Images"
                                        fill
                                        className="object-contain"
                                        priority
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <h3 className="text-xl font-semibold mt-8">Image Models</h3>
                        <p className="text-muted-foreground text-sm">
                            Choose the right model for your workflow. Balance speed, quality, and cost.
                        </p>

                        <div className="grid gap-6">
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

                            {/* GPT Image Family */}
                            <Card className="bg-gradient-to-br from-blue-950/20 to-background border-blue-900/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <span className="text-2xl">🎨</span> GPT Image Family
                                        </CardTitle>
                                        <div className="flex gap-2 text-xs font-bold">
                                            <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">3-27 TOKENS</span>
                                        </div>
                                    </div>
                                    <CardDescription>OpenAI GPT Image 1.5 - Premium quality with transparent backgrounds</CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm space-y-4">
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-center">
                                            <span className="font-semibold text-green-400">Low</span>
                                            <p className="text-muted-foreground">3 tokens</p>
                                            <p className="text-[10px] text-muted-foreground/70">Fast drafts</p>
                                        </div>
                                        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-center">
                                            <span className="font-semibold text-blue-400">Medium</span>
                                            <p className="text-muted-foreground">10 tokens</p>
                                            <p className="text-[10px] text-muted-foreground/70">Standard</p>
                                        </div>
                                        <div className="p-2 rounded bg-violet-500/10 border border-violet-500/20 text-center">
                                            <span className="font-semibold text-violet-400">High</span>
                                            <p className="text-muted-foreground">27 tokens</p>
                                            <p className="text-[10px] text-muted-foreground/70">Premium</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-blue-400">Special Features</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li><strong>Transparent backgrounds:</strong> PNG output with no background for compositing</li>
                                            <li><strong>Multi-image generation:</strong> Generate 1-10 images per request</li>
                                            <li><strong>Best-in-class text rendering:</strong> Accurate text in images</li>
                                            <li><strong>Aspect ratios:</strong> 1:1 Square, 3:2 Landscape, 2:3 Portrait</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-blue-400">Prompting Tips</h4>
                                        <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                                            <li>Highly capable with conversational prompts</li>
                                            <li>Excels at detailed scenes and photorealistic content</li>
                                            <li>For transparent backgrounds, select PNG format and &quot;Transparent&quot; background</li>
                                            <li>Use Low for quick iterations, High for final renders</li>
                                        </ul>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <span className="font-semibold text-green-400">Strengths</span>
                                            <p className="text-muted-foreground mt-1">Transparent backgrounds, excellent text rendering, high quality, multi-image generation, versatile quality tiers</p>
                                        </div>
                                        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <span className="font-semibold text-red-400">Weaknesses</span>
                                            <p className="text-muted-foreground mt-1">Higher cost at high quality, no reference image support, limited aspect ratio options</p>
                                        </div>
                                    </div>

                                    <p className="text-muted-foreground border-t border-border/50 pt-3">
                                        <strong>Best for:</strong> Product images with transparent backgrounds, text-heavy designs, marketing assets, batch generation, compositing work.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Model Comparison Table */}
                        <Card className="bg-muted/20 border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Grid className="w-5 h-5 text-amber-400" /> Quick Comparison
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/50">
                                                <th className="text-left p-2">Model</th>
                                                <th className="text-center p-2">Cost</th>
                                                <th className="text-center p-2">Speed</th>
                                                <th className="text-center p-2">Quality</th>
                                                <th className="text-center p-2">Text</th>
                                                <th className="text-center p-2">References</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-muted-foreground">
                                            <tr className="border-b border-border/30 hover:bg-muted/30">
                                                <td className="p-2">⚡ Z-Image Turbo</td>
                                                <td className="text-center p-2 text-purple-400">5 pts</td>
                                                <td className="text-center p-2">⚡⚡⚡</td>
                                                <td className="text-center p-2">★★★☆☆</td>
                                                <td className="text-center p-2">★★★★☆</td>
                                                <td className="text-center p-2">1</td>
                                            </tr>
                                            <tr className="border-b border-border/30 hover:bg-muted/30">
                                                <td className="p-2">🍌 Nano Banana</td>
                                                <td className="text-center p-2 text-yellow-400">8 pts</td>
                                                <td className="text-center p-2">⚡⚡</td>
                                                <td className="text-center p-2">★★★★☆</td>
                                                <td className="text-center p-2">★★★★☆</td>
                                                <td className="text-center p-2">4</td>
                                            </tr>
                                            <tr className="border-b border-border/30 hover:bg-muted/30">
                                                <td className="p-2">🔥 Nano Banana Pro</td>
                                                <td className="text-center p-2 text-amber-400">20 pts</td>
                                                <td className="text-center p-2">⚡</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2">14</td>
                                            </tr>
                                            <tr className="border-b border-border/30 hover:bg-muted/30">
                                                <td className="p-2">🎨 GPT Image Low</td>
                                                <td className="text-center p-2 text-green-400">3 pts</td>
                                                <td className="text-center p-2">⚡⚡⚡</td>
                                                <td className="text-center p-2">★★★☆☆</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2 text-muted-foreground/50">-</td>
                                            </tr>
                                            <tr className="border-b border-border/30 hover:bg-muted/30">
                                                <td className="p-2">🎨 GPT Image Medium</td>
                                                <td className="text-center p-2 text-blue-400">10 pts</td>
                                                <td className="text-center p-2">⚡⚡</td>
                                                <td className="text-center p-2">★★★★☆</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2 text-muted-foreground/50">-</td>
                                            </tr>
                                            <tr className="hover:bg-muted/30">
                                                <td className="p-2">✨ GPT Image HD</td>
                                                <td className="text-center p-2 text-violet-400">27 pts</td>
                                                <td className="text-center p-2">⚡</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2">★★★★★</td>
                                                <td className="text-center p-2 text-muted-foreground/50">-</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    <strong>Note:</strong> GPT Image models support transparent PNG backgrounds. Cost varies by quality tier.
                                </p>
                            </CardContent>
                        </Card>

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

                    {/* API Access */}
                    <section id="api-access" className="space-y-6 scroll-mt-20">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Key className="w-6 h-6 text-green-500" /> API Access
                        </h2>
                        <p className="text-muted-foreground">
                            Use Director&apos;s Palette programmatically via our REST API. Generate images, execute recipes, and integrate with your own tools.
                        </p>

                        <Card className="bg-gradient-to-br from-green-950/20 to-background border-green-900/30">
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Getting an API Key</h3>
                                    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
                                        <p className="text-sm text-amber-300">
                                            <strong>API keys are available by request.</strong> Contact us at{' '}
                                            <a href="mailto:support@directorspalette.com" className="underline hover:text-amber-200">
                                                support@directorspalette.com
                                            </a>
                                            {' '}to request API access for your account.
                                        </p>
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        Once approved, you&apos;ll receive access to the Admin Panel where you can generate your API key.
                                        Keys are prefixed with <code className="px-1 bg-muted rounded">dp_</code> and shown only once on creation.
                                    </p>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                                    <p className="text-muted-foreground mb-3 text-sm">
                                        Include your API key in the Authorization header:
                                    </p>
                                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                                        <code className="text-green-400">Authorization: Bearer dp_your_api_key_here</code>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Available Endpoints</h3>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400">POST</span>
                                                <code className="text-sm">/api/v1/images/generate</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Generate images from prompts</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-sm">/api/v1/recipes</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">List available recipe templates</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-blue-500/20 text-blue-400">POST</span>
                                                <code className="text-sm">/api/v1/recipes/execute</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Execute a recipe with variables</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-green-500/20 text-green-400">GET</span>
                                                <code className="text-sm">/api/v1/usage</code>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">Check your API usage statistics</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Example Request</h3>
                                    <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-x-auto space-y-2">
                                        <p className="text-muted-foreground"># Generate an image</p>
                                        <p className="text-green-400">curl -X POST https://directorspalette.com/api/v1/images/generate \</p>
                                        <p className="text-green-400 pl-4">-H &quot;Authorization: Bearer dp_your_key&quot; \</p>
                                        <p className="text-green-400 pl-4">-H &quot;Content-Type: application/json&quot; \</p>
                                        <p className="text-green-400 pl-4">-d &apos;{'{"prompt": "A sunset over mountains", "model": "nano-banana"}'}&apos;</p>
                                    </div>
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Rate Limits</h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <span className="font-semibold text-sm">Standard</span>
                                            <p className="text-xs text-muted-foreground mt-1">60 requests per minute</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <span className="font-semibold text-sm">Burst</span>
                                            <p className="text-xs text-muted-foreground mt-1">Up to 100 requests in short bursts</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                    <p className="text-sm text-muted-foreground">
                                        <strong>Full API Documentation:</strong> See <code className="px-1 bg-muted rounded">docs/API_DOCUMENTATION.md</code> for complete endpoint specs, code examples in Python/JavaScript, and error handling.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Footer */}
                    <div className="pt-12 text-center text-muted-foreground">
                        <p>Need more help? Contact us at support@directorspalette.com</p>
                    </div>

                </div>
            </ScrollArea>
        </div>
    )
}
