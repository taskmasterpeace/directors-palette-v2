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
    Zap,
    Megaphone,
    Target,
    Layers,
    Rocket
} from "lucide-react"
import { ClapperboardHero } from "./ClapperboardHero"

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-black">
            {/* Google Fonts for page-wide use */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap"
                rel="stylesheet"
            />

            {/* Hero Section — Scroll-Driven Clapperboard Animation */}
            <ClapperboardHero />

            {/* As Seen At - Credibility Section */}
            <section className="py-12 bg-neutral-950 border-y border-neutral-800/50 overflow-hidden">
                <div className="container mx-auto px-4">
                    <p
                        className="text-center text-xs text-neutral-500 mb-8 uppercase"
                        style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.25em" }}
                    >
                        Trusted By Creators
                    </p>
                </div>

                {/* Infinite Scroll Marquee */}
                <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-neutral-950 to-transparent z-10" />

                    <div className="flex animate-marquee">
                        {[1, 2, 3].map((set) => (
                            <div key={set} className="flex items-center gap-12 px-6 shrink-0">
                                <a href="https://www.youtube.com/@AlgorithmInstituteofBR" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-neutral-800 group-hover:border-amber-500/50 transition-colors bg-neutral-900">
                                        <Image src="/landing/partners/algorithm-institute.png" alt="Algorithm Institute of Battle Rap" width={96} height={96} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xs text-neutral-500 group-hover:text-white transition-colors whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>Algorithm Institute</span>
                                </a>

                                <a href="https://www.youtube.com/@Hood_History_Club" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-neutral-800 group-hover:border-amber-500/50 transition-colors bg-neutral-900">
                                        <Image src="/landing/partners/hood-history-club.jpg" alt="Hood History Club" width={96} height={96} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xs text-neutral-500 group-hover:text-white transition-colors whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>Hood History Club</span>
                                </a>

                                <a href="https://www.heyyourehired.com/" target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-neutral-800 group-hover:border-amber-500/50 transition-colors bg-neutral-900 flex items-center justify-center">
                                        <Image src="/landing/partners/machine-king-labs.webp" alt="Machine King Labs" width={96} height={96} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-xs text-neutral-500 group-hover:text-white transition-colors whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>Machine King Labs</span>
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Style Showcase Section */}
            <section className="py-20 bg-gradient-to-b from-neutral-950 to-neutral-900">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4 leading-tight"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Every Visual Style. One Platform.
                        </h3>
                        <p className="text-neutral-400 max-w-xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Claymation. Comic book. Muppet. Action figure. Create consistent characters in any aesthetic you can imagine.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
                        {[
                            { src: "/storyboard-assets/styles/claymation.png", label: "Claymation" },
                            { src: "/storyboard-assets/styles/muppet.webp", label: "Muppet" },
                            { src: "/storyboard-assets/styles/comic.webp", label: "Comic Book" },
                            { src: "/storyboard-assets/styles/action-figure.webp", label: "Action Figure" },
                        ].map((style) => (
                            <div key={style.label} className="group relative rounded-lg overflow-hidden border border-neutral-800 hover:border-amber-500/50 transition-all">
                                <Image src={style.src} alt={`${style.label} Style`} width={400} height={400} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <span className="text-white font-medium text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{style.label}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-neutral-900">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Your Complete Creative Arsenal
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Six tools. Infinite creative possibilities. Everything you need to go from idea to final frame.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {[
                            {
                                icon: <Sparkles className="w-6 h-6 text-amber-500" />,
                                title: "Shot Creator",
                                desc: "Advanced prompt syntax — brackets for variations, pipes for sequences, wildcards for randomization. One prompt, ten images.",
                            },
                            {
                                icon: <Film className="w-6 h-6 text-amber-500" />,
                                title: "Storyboard Engine",
                                desc: "Paste any story. AI extracts characters, locations, and shots. Six guided steps from script to complete visual storyboard.",
                            },
                            {
                                icon: <Play className="w-6 h-6 text-amber-500" />,
                                title: "Shot Animator",
                                desc: "Turn still frames into motion. Animate any shot with AI video generation — camera moves, character action, atmospheric effects.",
                            },
                            {
                                icon: <Users className="w-6 h-6 text-amber-500" />,
                                title: "Character Lock",
                                desc: "Generate reference sheets, tag faces, and maintain perfect consistency across hundreds of shots. Your characters stay on-model.",
                            },
                            {
                                icon: <Palette className="w-6 h-6 text-amber-500" />,
                                title: "Style Library",
                                desc: "Curated presets or custom uploads. Save your own visual DNA and apply it to every generation. Consistency without effort.",
                            },
                            {
                                icon: <Layout className="w-6 h-6 text-amber-500" />,
                                title: "VFX Bay",
                                desc: "Paint a mask, describe a change. Fix hands, swap outfits, add props — AI blends it seamlessly. No full re-generation needed.",
                            },
                        ].map((feature) => (
                            <Card key={feature.title} className="bg-neutral-900/50 border-neutral-800 hover:border-amber-500/40 transition-colors group">
                                <CardContent className="p-6">
                                    <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                                        {feature.icon}
                                    </div>
                                    <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{feature.title}</h4>
                                    <p className="text-neutral-400 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{feature.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Prompt Visualizer Video Section */}
            <section className="py-24 bg-gradient-to-b from-neutral-900 to-black relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <Zap className="w-4 h-4" />
                            The Prompting Language
                        </div>
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            A Language Built for Creators
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Six operators. Unlimited combinations. Batch, Pipe, Anchor, Wildcard, AI, and Stack — master them once, create forever.
                        </p>
                    </div>

                    {/* Video Player */}
                    <div className="max-w-4xl mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl shadow-amber-500/5">
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-auto"
                            >
                                <source src="/landing/prompt-visualizer.mp4" type="video/mp4" />
                            </video>
                            {/* Subtle vignette overlay */}
                            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.3)" }} />
                        </div>
                        <p className="text-center text-xs text-neutral-600 mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Animated guide — Batch, Pipe, Anchor, Wildcard, AI, Stack operators
                        </p>
                    </div>
                </div>
            </section>

            {/* Prompt Power Section — Detailed Syntax */}
            <section className="py-24 relative overflow-hidden bg-black">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Prompts That Think for You
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Write one prompt. Get ten images. Our syntax handles variation, sequencing, and randomization automatically.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                        {/* Variations */}
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                                <Brackets className="w-6 h-6 text-amber-300" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Batch</h4>
                            <p className="text-neutral-400 text-sm mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                One prompt, multiple outputs. Explore every direction at once.
                            </p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-neutral-500">A portrait in </span>
                                <span className="text-amber-300">[</span>
                                <span className="text-amber-400">oil paint</span>
                                <span className="text-neutral-500">, </span>
                                <span className="text-amber-400">watercolor</span>
                                <span className="text-neutral-500">, </span>
                                <span className="text-amber-400">pencil</span>
                                <span className="text-amber-300">]</span>
                                <span className="text-neutral-500"> style</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <ArrowRight className="w-3 h-3" /> 3 images, one per style
                            </p>
                        </div>

                        {/* Chain Prompting */}
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                                <GitBranch className="w-6 h-6 text-amber-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Pipe</h4>
                            <p className="text-neutral-400 text-sm mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Each result feeds the next. Build visual sequences and transformations.
                            </p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-amber-400">a red apple</span>
                                <span className="text-amber-300"> | </span>
                                <span className="text-amber-400">being sliced</span>
                                <span className="text-amber-300"> | </span>
                                <span className="text-amber-400">in a pie</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <ArrowRight className="w-3 h-3" /> Each step uses the previous as reference
                            </p>
                        </div>

                        {/* Wildcards */}
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                                <Shuffle className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Wildcard</h4>
                            <p className="text-neutral-400 text-sm mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Reusable random lists. Surprise yourself with every generation.
                            </p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-neutral-500">A woman with </span>
                                <span className="text-emerald-400">_hairstyles_</span>
                                <span className="text-neutral-500"> wearing </span>
                                <span className="text-emerald-400">_streetwear_</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <ArrowRight className="w-3 h-3" /> Random picks from your custom lists
                            </p>
                        </div>

                        {/* Anchor Transform */}
                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/40 transition-colors">
                            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                                <span className="text-3xl font-bold text-orange-400">&#xA1;</span>
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Anchor</h4>
                            <p className="text-neutral-400 text-sm mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Lock a style reference. Every subsequent image matches it. Batch-style entire collections.
                            </p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm space-y-2">
                                <p className="text-xs text-neutral-500">1. Style image first (the anchor)</p>
                                <p className="text-xs text-neutral-500">2. Add images to transform</p>
                                <p className="text-xs text-neutral-500">3. Click <span className="text-orange-400 font-bold">&#xA1;</span> or type <span className="text-orange-400">@!</span></p>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                <ArrowRight className="w-3 h-3" /> Anchor is free — pay only for transforms
                            </p>
                        </div>
                    </div>

                    {/* Mix and Match */}
                    <div className="mt-12 max-w-3xl mx-auto">
                        <div className="bg-gradient-to-r from-amber-500/5 to-amber-500/5 border border-amber-500/20 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>Combine Everything</h4>
                            </div>
                            <p className="text-neutral-400 text-sm mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Mix wildcards with brackets and pipes. Up to 10 images per generation.
                            </p>
                            <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
                                <span className="text-emerald-400">_character_</span>
                                <span className="text-neutral-500"> in a </span>
                                <span className="text-amber-300">[</span>
                                <span className="text-amber-400">forest</span>
                                <span className="text-neutral-500">, </span>
                                <span className="text-amber-400">city</span>
                                <span className="text-neutral-500">, </span>
                                <span className="text-amber-400">desert</span>
                                <span className="text-amber-300">]</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Wildcards resolve first, then brackets expand — random character across 3 locations = 3 images
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ad Hub Section */}
            <section className="py-24 relative overflow-hidden bg-gradient-to-b from-black to-neutral-950">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <Megaphone className="w-4 h-4" />
                            Coming Soon: Brand Studio
                        </div>
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Your Brand. Your Rules.{" "}
                            <span className="text-amber-400">Your Ads.</span>
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Upload your logo. Define your identity. Generate on-brand images, video, music, and ad campaigns — all from one studio.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
                        <div className="bg-neutral-900/50 border border-amber-500/20 rounded-xl p-6 text-center hover:border-amber-500/40 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                                <Target className="w-7 h-7 text-amber-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Brand-Locked</h4>
                            <p className="text-neutral-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Every generation automatically inherits your brand colors, typography, and visual identity.
                            </p>
                        </div>

                        <div className="bg-neutral-900/50 border border-amber-500/20 rounded-xl p-6 text-center hover:border-amber-500/40 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                                <Layers className="w-7 h-7 text-amber-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Full Pipeline</h4>
                            <p className="text-neutral-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Images, video, voiceover, music, scripts — generate everything in one place. Assemble complete ads.
                            </p>
                        </div>

                        <div className="bg-neutral-900/50 border border-amber-500/20 rounded-xl p-6 text-center hover:border-amber-500/40 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                                <Rocket className="w-7 h-7 text-amber-400" />
                            </div>
                            <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>Campaign Mode</h4>
                            <p className="text-neutral-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Define a brief. Select platforms. Generate an entire multi-format campaign in minutes, not weeks.
                            </p>
                        </div>
                    </div>

                    {/* How It Works — Brand Studio */}
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-neutral-900/30 border border-amber-500/20 rounded-xl p-8">
                            <h4 className="text-xl font-semibold text-white text-center mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>The Workflow</h4>

                            <div className="grid md:grid-cols-4 gap-6">
                                {[
                                    { num: "1", title: "Upload Logo", desc: "AI extracts your brand DNA" },
                                    { num: "2", title: "Define Brand", desc: "Colors, voice, audience, style" },
                                    { num: "3", title: "Create Content", desc: "Images, video, voice, music" },
                                    { check: true, title: "Launch", desc: "On-brand ads in 60 seconds" },
                                ].map((step, i) => (
                                    <div key={i} className="text-center">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${step.check ? "bg-emerald-500/10 border-2 border-emerald-500" : "bg-amber-500/10 border-2 border-amber-500"}`}>
                                            {step.check ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                            ) : (
                                                <span className="text-lg font-bold text-amber-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.num}</span>
                                            )}
                                        </div>
                                        <h5 className="font-medium text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.title}</h5>
                                        <p className="text-xs text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-amber-500/10 text-center">
                                <p className="text-sm text-neutral-400 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    <span className="text-amber-400 font-medium">Built for solo creators:</span> No design team needed. No agency fees. Professional marketing content on demand.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4 text-xs text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    {["Instagram ads", "Facebook promos", "Product launches", "Sale banners", "Testimonial cards"].map((item) => (
                                        <span key={item} className="flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VFX Bay Section */}
            <section className="py-24 bg-neutral-950">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            <Layout className="w-4 h-4" />
                            VFX Bay
                        </div>
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Fix It. Don&apos;t Redo It.
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Mask any region. Describe the change. AI blends it seamlessly — the rest of your image stays untouched.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
                        <div className="space-y-6">
                            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                                <h4 className="text-lg font-semibold text-white mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>Example: Add a Prop</h4>
                                <div className="space-y-4">
                                    {[
                                        { num: "1", title: "Generate your base image", desc: "\"A golden octopus in a wizard's study\"" },
                                        { num: "2", title: "Paint a mask over one tentacle", desc: "Select just the area you want to modify" },
                                        { num: "3", title: "Describe the change", desc: "\"Holding a glowing magic wand\"" },
                                    ].map((step) => (
                                        <div key={step.num} className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-sm font-bold text-amber-400">{step.num}</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.title}</p>
                                                <p className="text-sm text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>Result</p>
                                            <p className="text-sm text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>Octopus holds a wand. Everything else untouched.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { emoji: "\u{1F590}\u{FE0F}", title: "Fix Hands", desc: "AI hands look wrong? Mask and regenerate just that area." },
                                { emoji: "\u{1F454}", title: "Swap Outfits", desc: "Change wardrobe without regenerating the whole character." },
                                { emoji: "\u{1F3D4}\u{FE0F}", title: "New Backgrounds", desc: "Keep your subject, replace the entire environment." },
                                { emoji: "\u2728", title: "Add Props", desc: "Sword, phone, coffee — place anything in your character's hands." },
                            ].map((uc) => (
                                <div key={uc.title} className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 hover:border-amber-500/40 transition-colors">
                                    <div className="text-2xl mb-2">{uc.emoji}</div>
                                    <h5 className="font-semibold text-white text-sm mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{uc.title}</h5>
                                    <p className="text-xs text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>{uc.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-24 bg-gradient-to-b from-neutral-950 to-black">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            Story to Storyboard in Minutes
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Three steps. That&apos;s it. Paste your story, pick your look, hit generate.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
                        {[
                            { num: "1", title: "Paste Your Story", desc: "Script, outline, or raw text. AI extracts every character, location, and key moment." },
                            { num: "2", title: "Define Your Look", desc: "Choose a preset style or upload your own. Lock character designs and visual DNA." },
                            { num: "3", title: "Generate Everything", desc: "One click. Every shot rendered with consistent characters, consistent style, cinematic framing." },
                        ].map((step) => (
                            <div key={step.num} className="text-center">
                                <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-amber-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{step.num}</span>
                                </div>
                                <h4 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.title}</h4>
                                <p className="text-neutral-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* 9-Shot Cinematic Preview */}
                    <div className="max-w-4xl mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-amber-500/20 shadow-xl shadow-amber-500/5">
                            <Image
                                src="/landing/9-shot-cinematic.png"
                                alt="9-Shot Cinematic Grid - From wide shots to close-ups"
                                width={1600}
                                height={1600}
                                className="w-full h-auto"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 text-center">
                                <span className="text-sm text-neutral-400 bg-black/70 px-4 py-2 rounded-full backdrop-blur-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                    9-Shot Cinematic Grid: Wide shots &rarr; Medium shots &rarr; Close-ups
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="py-24 bg-neutral-950">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3
                            className="text-3xl md:text-5xl font-normal text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            No Subscriptions. No Surprises.
                        </h3>
                        <p className="text-neutral-400 text-lg max-w-2xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Buy credits when you need them. Use them whenever you want. They never expire.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
                        {[
                            { name: "Starter", price: "$5.99", credits: "500 credits", images: "~25 images", popular: false },
                            { name: "Creator", price: "$11.99", credits: "1,000 credits", images: "~50 images", popular: true },
                            { name: "Pro", price: "$23.99", credits: "2,000 credits", images: "~100 images", popular: false },
                            { name: "Studio", price: "$47.99", credits: "4,000 credits", images: "~200 images", popular: false },
                        ].map((tier) => (
                            <Card key={tier.name} className={`bg-neutral-900/50 ${tier.popular ? "border-amber-500/50 border-2" : "border-neutral-800"} relative`}>
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                <CardContent className="p-6 text-center">
                                    <h4 className="text-lg font-semibold text-white mb-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tier.name}</h4>
                                    <div className="text-3xl font-bold text-amber-500 mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}>{tier.price}</div>
                                    <p className="text-neutral-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tier.credits}</p>
                                    <p className="text-xs text-neutral-600 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tier.images}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/50 to-black" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h3
                        className="text-4xl md:text-6xl font-normal text-white mb-4"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.06em" }}
                    >
                        Your Vision. Rendered.
                    </h3>
                    <p className="text-neutral-400 text-lg mb-10 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        3 free generations. No credit card. Start creating in seconds.
                    </p>
                    <Link href="/auth/signin">
                        <Button
                            size="lg"
                            className="bg-amber-500 text-black hover:bg-amber-400 text-base px-12 py-6 font-semibold rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-all duration-300"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Start Creating Free
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <div className="flex items-center justify-center gap-6 mt-6 text-sm text-neutral-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            3 free generations
                        </span>
                        <div className="w-1 h-1 rounded-full bg-neutral-700" />
                        <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            No credit card
                        </span>
                    </div>
                </div>
            </section>

            {/* Spacer for global footer */}
            <div className="h-16 bg-black" />
        </div>
    )
}
