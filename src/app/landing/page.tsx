"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Sparkles,
    Film,
    Palette,
    Users,
    ArrowRight,
    CheckCircle2,
    Play,
    Layout,
    Brackets,
    GitBranch,
    Shuffle,
    Zap
} from "lucide-react"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 py-20 relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-8">
                            <Image
                                src="/favicon.ico"
                                alt="Directors Palette"
                                width={48}
                                height={48}
                                className="w-12 h-12"
                            />
                            <h1 className="text-3xl font-bold text-white">
                                Directors Palette
                            </h1>
                        </div>

                        {/* Headline */}
                        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            Turn Stories Into
                            <span className="text-amber-500"> Visual Art</span>
                        </h2>

                        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                            AI-powered image and video generation with advanced prompting.
                            Create consistent characters, stunning scenes, and complete storyboards.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-12">
                            <Link href="/auth/signin">
                                <Button size="lg" className="bg-amber-500 text-black hover:bg-amber-600 text-lg px-8">
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button size="lg" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 text-lg px-8">
                                    See Features
                                </Button>
                            </Link>
                        </div>

                        {/* Social proof */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>3 free generations to start</span>
                            <span className="mx-2">•</span>
                            <span>No credit card required</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-card/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Everything You Need to Create
                        </h3>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Professional tools for visual storytelling, all in one place.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Shot Creator</h4>
                                <p className="text-muted-foreground">
                                    Generate images with advanced syntax - brackets for variations, pipes for sequences, wildcards for randomization.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 2 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Film className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Storyboard</h4>
                                <p className="text-muted-foreground">
                                    6-step guided workflow: paste your story, define style, create characters, break into shots, generate images.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 3 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Play className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Shot Animator</h4>
                                <p className="text-muted-foreground">
                                    Turn your images into videos. Animate any shot with AI-powered video generation.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 4 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Character Consistency</h4>
                                <p className="text-muted-foreground">
                                    Generate character sheets, tag reference images, and maintain consistency across hundreds of shots.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 5 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Palette className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Custom Styles</h4>
                                <p className="text-muted-foreground">
                                    Create and save your own visual styles. Muppet, Claymation, Anime - or upload your own reference.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Feature 6 */}
                        <Card className="bg-card border-border hover:border-amber-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                                    <Layout className="w-6 h-6 text-amber-500" />
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2">Layout & Annotation</h4>
                                <p className="text-muted-foreground">
                                    Annotate your images with text, arrows, and markers. Perfect for storyboard presentations.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Prompt Power Section */}
            <section className="py-20 relative overflow-hidden">
                {/* Background accent */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-sm font-medium mb-6">
                            <Zap className="w-4 h-4" />
                            Advanced Prompting Engine
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Prompts That Do More
                        </h3>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Our syntax lets you generate multiple variations, chain images together, and randomize elements - all in one prompt.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {/* Variations */}
                        <div className="bg-card/50 border border-border rounded-xl p-6 hover:border-amber-500/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                                <Brackets className="w-6 h-6 text-blue-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Variations</h4>
                            <p className="text-muted-foreground text-sm mb-4">
                                Generate multiple versions in one go. Perfect for exploring options.
                            </p>
                            <div className="bg-background/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-muted-foreground">A portrait in </span>
                                <span className="text-blue-400">[</span>
                                <span className="text-amber-400">oil paint</span>
                                <span className="text-muted-foreground">, </span>
                                <span className="text-amber-400">watercolor</span>
                                <span className="text-muted-foreground">, </span>
                                <span className="text-amber-400">pencil</span>
                                <span className="text-blue-400">]</span>
                                <span className="text-muted-foreground"> style</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Creates 3 images, one for each style
                            </p>
                        </div>

                        {/* Chain Prompting */}
                        <div className="bg-card/50 border border-border rounded-xl p-6 hover:border-amber-500/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                                <GitBranch className="w-6 h-6 text-purple-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Chain Prompting</h4>
                            <p className="text-muted-foreground text-sm mb-4">
                                Each result feeds into the next. Build sequences and transformations.
                            </p>
                            <div className="bg-background/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-amber-400">a red apple</span>
                                <span className="text-purple-400"> | </span>
                                <span className="text-amber-400">being sliced</span>
                                <span className="text-purple-400"> | </span>
                                <span className="text-amber-400">in a pie</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Each step uses the previous image as reference
                            </p>
                        </div>

                        {/* Wildcards */}
                        <div className="bg-card/50 border border-border rounded-xl p-6 hover:border-amber-500/50 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                                <Shuffle className="w-6 h-6 text-green-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Wildcards</h4>
                            <p className="text-muted-foreground text-sm mb-4">
                                Create reusable lists. Random picks from your custom collections.
                            </p>
                            <div className="bg-background/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-muted-foreground">A woman with </span>
                                <span className="text-green-400">_hairstyles_</span>
                                <span className="text-muted-foreground"> wearing </span>
                                <span className="text-green-400">_streetwear_</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Pulls random items from your wildcard lists
                            </p>
                        </div>
                    </div>

                    {/* Power combo example */}
                    <div className="mt-12 max-w-3xl mx-auto">
                        <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-green-500/10 border border-amber-500/30 rounded-xl p-6">
                            <h5 className="text-sm font-semibold text-amber-500 uppercase tracking-wider mb-3">Combine Them All</h5>
                            <div className="bg-background/80 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                                <span className="text-green-400">_character_</span>
                                <span className="text-muted-foreground"> in a </span>
                                <span className="text-blue-400">[</span>
                                <span className="text-amber-400">forest</span>
                                <span className="text-muted-foreground">, </span>
                                <span className="text-amber-400">city</span>
                                <span className="text-blue-400">]</span>
                                <span className="text-purple-400"> | </span>
                                <span className="text-muted-foreground">running </span>
                                <span className="text-purple-400"> | </span>
                                <span className="text-muted-foreground">exhausted, catching breath</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-3">
                                This generates 2 character variations × 3 chain steps = 6 connected images telling a story
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 bg-card/30">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            How It Works
                        </h3>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            From story to storyboard in minutes.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                        {/* Step 1 */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-amber-500">1</span>
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Paste Your Story</h4>
                            <p className="text-muted-foreground">
                                Drop in your script, outline, or story text. AI extracts characters and locations.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-amber-500">2</span>
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Choose Your Style</h4>
                            <p className="text-muted-foreground">
                                Pick a preset style or create your own. Define characters and locations.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-amber-500">3</span>
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2">Generate Images</h4>
                            <p className="text-muted-foreground">
                                One click generates all your shots. Consistent characters, consistent style.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="py-20 bg-card/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Simple, Pay-As-You-Go Pricing
                        </h3>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            No subscriptions. Buy points when you need them.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
                        <Card className="bg-card border-border">
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Starter</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$5</div>
                                <p className="text-muted-foreground text-sm">500 points</p>
                                <p className="text-xs text-muted-foreground mt-1">~83 images</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-amber-500/50 border-2 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                                    Most Popular
                                </span>
                            </div>
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Creator</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$10</div>
                                <p className="text-muted-foreground text-sm">1,200 points</p>
                                <p className="text-xs text-muted-foreground mt-1">~200 images</p>
                                <span className="inline-block mt-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">+200 bonus</span>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Pro</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$20</div>
                                <p className="text-muted-foreground text-sm">2,750 points</p>
                                <p className="text-xs text-muted-foreground mt-1">~458 images</p>
                                <span className="inline-block mt-2 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">+750 bonus</span>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-20">
                <div className="container mx-auto px-4 text-center">
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Create?
                    </h3>
                    <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                        Start with 3 free generations. No credit card required.
                    </p>
                    <Link href="/auth/signin">
                        <Button size="lg" className="bg-amber-500 text-black hover:bg-amber-600 text-lg px-8">
                            Get Started Free
                            <Sparkles className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-border">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Image
                                src="/favicon.ico"
                                alt="Directors Palette"
                                width={24}
                                height={24}
                            />
                            <span className="text-sm text-muted-foreground">
                                Directors Palette by{" "}
                                <a
                                    href="https://machinekinglabs.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-500 hover:text-amber-400 transition-colors"
                                >
                                    Machine King Labs
                                </a>
                            </span>
                        </div>
                        <div className="text-sm text-muted-foreground italic">
                            &ldquo;With AI anything is possible&rdquo;
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
