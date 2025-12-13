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
                            <Link href="/auth/signin">
                                <Button size="lg" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10 text-lg px-8">
                                    Log In
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

                    {/* Hero App Screenshot */}
                    <div className="mt-16 max-w-5xl mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10">
                            <Image
                                src="/landing/app-results-1.png"
                                alt="Directors Palette - AI Generated Storyboard"
                                width={1920}
                                height={1080}
                                className="w-full h-auto"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Style Showcase Section */}
            <section className="py-16 bg-gradient-to-b from-background to-card/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Any Style You Can Imagine
                        </h3>
                        <p className="text-muted-foreground max-w-xl mx-auto">
                            From claymation to comic books, create consistent characters in any visual style.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        <div className="group relative rounded-lg overflow-hidden border border-border hover:border-amber-500/50 transition-all">
                            <Image
                                src="/storyboard-assets/styles/claymation.png"
                                alt="Claymation Style"
                                width={400}
                                height={400}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <span className="text-white font-medium text-sm">Claymation</span>
                            </div>
                        </div>

                        <div className="group relative rounded-lg overflow-hidden border border-border hover:border-amber-500/50 transition-all">
                            <Image
                                src="/storyboard-assets/styles/muppet.webp"
                                alt="Muppet Style"
                                width={400}
                                height={400}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <span className="text-white font-medium text-sm">Muppet</span>
                            </div>
                        </div>

                        <div className="group relative rounded-lg overflow-hidden border border-border hover:border-amber-500/50 transition-all">
                            <Image
                                src="/storyboard-assets/styles/comic.webp"
                                alt="Comic Book Style"
                                width={400}
                                height={400}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <span className="text-white font-medium text-sm">Comic Book</span>
                            </div>
                        </div>

                        <div className="group relative rounded-lg overflow-hidden border border-border hover:border-amber-500/50 transition-all">
                            <Image
                                src="/storyboard-assets/styles/action-figure.webp"
                                alt="Action Figure Style"
                                width={400}
                                height={400}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <span className="text-white font-medium text-sm">Action Figure</span>
                            </div>
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

                    {/* Mix and Match */}
                    <div className="mt-12 max-w-3xl mx-auto">
                        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/30 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-white">Mix and Match</h4>
                            </div>
                            <p className="text-muted-foreground text-sm mb-4">
                                Combine wildcards with brackets or pipes. Up to 10 images per generation.
                            </p>
                            <div className="bg-background/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-green-400">_character_</span>
                                <span className="text-muted-foreground"> in a </span>
                                <span className="text-blue-400">[</span>
                                <span className="text-amber-400">forest</span>
                                <span className="text-muted-foreground">, </span>
                                <span className="text-amber-400">city</span>
                                <span className="text-muted-foreground">, </span>
                                <span className="text-amber-400">desert</span>
                                <span className="text-blue-400">]</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3">
                                Wildcards substitute first, then brackets expand → Random character in 3 locations = 3 images
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

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
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

                    {/* 9-Shot Cinematic Preview */}
                    <div className="max-w-4xl mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-amber-500/30 shadow-xl shadow-amber-500/10">
                            <Image
                                src="/landing/9-shot-cinematic.png"
                                alt="9-Shot Cinematic Grid - From wide shots to close-ups"
                                width={1600}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 text-center">
                                <span className="text-sm text-muted-foreground bg-background/80 px-4 py-2 rounded-full">
                                    9-Shot Cinematic Grid: Wide shots → Medium shots → Close-ups
                                </span>
                            </div>
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

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        <Card className="bg-card border-border">
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Starter</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$5.99</div>
                                <p className="text-muted-foreground text-sm">500 credits</p>
                                <p className="text-xs text-muted-foreground mt-1">~25 images</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-amber-500/50 border-2 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                                    Popular
                                </span>
                            </div>
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Creator</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$11.99</div>
                                <p className="text-muted-foreground text-sm">1,000 credits</p>
                                <p className="text-xs text-muted-foreground mt-1">~50 images</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Pro</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$23.99</div>
                                <p className="text-muted-foreground text-sm">2,000 credits</p>
                                <p className="text-xs text-muted-foreground mt-1">~100 images</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-card border-border">
                            <CardContent className="p-6 text-center">
                                <h4 className="text-lg font-semibold text-white mb-1">Studio</h4>
                                <div className="text-3xl font-bold text-amber-500 mb-2">$47.99</div>
                                <p className="text-muted-foreground text-sm">4,000 credits</p>
                                <p className="text-xs text-muted-foreground mt-1">~200 images</p>
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

            {/* Spacer for global footer */}
            <div className="h-16" />
        </div>
    )
}
