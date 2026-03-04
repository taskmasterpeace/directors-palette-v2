"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    ArrowRight,
    CheckCircle2,
    Sparkles,
    Film,
    Music,
    BookOpen,
    Play,
} from "lucide-react"
import { ClapperboardHero } from "./ClapperboardHero"

// ─── Feature data ──────────────────────────────────────────────
const FEATURES = [
    {
        id: "shot-creator",
        icon: <Sparkles className="w-5 h-5" />,
        title: "SHOT CREATOR",
        headline: "One Prompt. Ten Images.",
        description:
            "Write once, generate many. Brackets create variations, pipes chain sequences, wildcards pull from your custom lists. Advanced syntax that feels simple.",
        bullets: [
            "Batch generate up to 10 variations in a single prompt",
            "Wildcard lists for random wardrobe, locations, poses",
            "Recipe templates with fill-in-the-blank fields",
        ],
        image: "/banners/shot-creator-banner.webp",
        video: null as string | null,
    },
    {
        id: "storyboard",
        icon: <Film className="w-5 h-5" />,
        title: "STORYBOARD",
        headline: "Paste a Story. Get a Shot List.",
        description:
            "Drop in any script, outline, or story text. AI extracts characters and locations, then breaks it into cinematic shots — wide, medium, close-up — with consistent characters throughout.",
        bullets: [
            "AI-powered shot breakdown from any narrative text",
            "Character lock keeps faces and outfits consistent",
            "Export contact sheets and 9-shot cinematic grids",
        ],
        image: "/banners/storyboard-banner.webp",
        video: null as string | null,
    },
    {
        id: "music-lab",
        icon: <Music className="w-5 h-5" />,
        title: "MUSIC LAB",
        headline: "Build AI Artists. Write Songs. Produce Beats.",
        description:
            "Create virtual artists with full DNA profiles — voice, genre, lexicon, visual identity. Then write with them, produce instrumentals, and generate music video treatments.",
        bullets: [
            "Artist DNA: genres, flow style, slang, banned words, look",
            "Sound Studio with 3-level genre picker and BPM control",
            "Chat with your artists in-character for inspiration",
        ],
        image: "/banners/music-lab-banner.webp",
        video: null as string | null,
    },
    {
        id: "storybook",
        icon: <BookOpen className="w-5 h-5" />,
        title: "STORYBOOK",
        headline: "Create Children's Books. Publish to KDP.",
        description:
            "From story text to illustrated pages to print-ready books. Choose styles — watercolor, cartoon, Pixar — and generate page-by-page illustrations with audio narration.",
        bullets: [
            "6-step wizard: story, characters, style, pages, review, export",
            "KDP compliance validation for self-publishing",
            "Page-flip preview with audio narration support",
        ],
        image: "/banners/storybook-banner.webp",
        video: null as string | null,
    },
    {
        id: "shot-animator",
        icon: <Play className="w-5 h-5" />,
        title: "SHOT ANIMATOR",
        headline: "Turn Stills Into Motion.",
        description:
            "Take any generated image and bring it to life. Camera orbits, character movement, atmospheric particles — AI video generation that starts from your exact frame.",
        bullets: [
            "Image-to-video with camera move presets",
            "Control motion direction, intensity, and duration",
            "Export MP4 for social media or presentations",
        ],
        image: "/banners/shot-animator-banner.webp",
        video: null as string | null,
    },
]

// ─── Component ─────────────────────────────────────────────────
export default function LandingPage() {
    const [showNav, setShowNav] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            // Show sticky nav after scrolling past ~80% of hero
            setShowNav(window.scrollY > window.innerHeight * 1.8)
        }
        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <div className="min-h-screen bg-black">
            {/* Google Fonts */}
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap"
                rel="stylesheet"
            />

            {/* ── Sticky Nav ─────────────────────────────────── */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    opacity: showNav ? 1 : 0,
                    pointerEvents: showNav ? "auto" : "none",
                    transform: showNav ? "translateY(0)" : "translateY(-100%)",
                }}
            >
                <div className="bg-black/80 backdrop-blur-md border-b border-neutral-800/50">
                    <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                        <span
                            className="text-xl text-white tracking-wider"
                            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                            DIRECTOR&apos;S PALETTE
                        </span>
                        <Link href="/auth/signin">
                            <Button
                                size="sm"
                                className="bg-amber-500 text-black hover:bg-amber-400 font-semibold rounded-lg text-sm px-5"
                                style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                                Start Creating
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ───────────────────────────────────────── */}
            <ClapperboardHero />

            {/* ── Feature Sections (alternating split) ───────── */}
            {FEATURES.map((feature, index) => {
                const isEven = index % 2 === 0
                const bgClass = index % 2 === 0
                    ? "bg-neutral-950"
                    : "bg-gradient-to-b from-black to-neutral-950"

                return (
                    <section
                        key={feature.id}
                        className={`py-20 md:py-28 ${bgClass} relative overflow-hidden`}
                    >
                        {/* Subtle ambient glow */}
                        <div
                            className="absolute w-[500px] h-[500px] bg-amber-500/[0.03] rounded-full blur-3xl"
                            style={{
                                top: "10%",
                                [isEven ? "right" : "left"]: "-10%",
                            }}
                        />

                        <div className="container mx-auto px-4 relative z-10">
                            <div className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-10 md:gap-16 max-w-6xl mx-auto`}>
                                {/* Visual side */}
                                <div className="w-full md:w-1/2">
                                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-2xl shadow-black/50 group">
                                        {feature.video ? (
                                            <video
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                                className="w-full h-auto"
                                            >
                                                <source src={feature.video} type="video/mp4" />
                                            </video>
                                        ) : (
                                            <Image
                                                src={feature.image}
                                                alt={feature.title}
                                                width={800}
                                                height={450}
                                                className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700"
                                            />
                                        )}
                                        {/* Vignette */}
                                        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 80px rgba(0,0,0,0.4)" }} />
                                    </div>
                                </div>

                                {/* Text side */}
                                <div className="w-full md:w-1/2">
                                    {/* Feature label */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            {feature.icon}
                                        </div>
                                        <span
                                            className="text-xs text-amber-400 font-medium uppercase"
                                            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
                                        >
                                            {feature.title}
                                        </span>
                                    </div>

                                    {/* Headline */}
                                    <h3
                                        className="text-3xl md:text-4xl lg:text-5xl text-white mb-4 leading-tight"
                                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" }}
                                    >
                                        {feature.headline}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        className="text-neutral-400 text-base md:text-lg leading-relaxed mb-6"
                                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                                    >
                                        {feature.description}
                                    </p>

                                    {/* Bullets */}
                                    <ul className="space-y-2.5 mb-8">
                                        {feature.bullets.map((bullet) => (
                                            <li key={bullet} className="flex items-start gap-2.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                <span
                                                    className="text-sm text-neutral-300"
                                                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                                                >
                                                    {bullet}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <Link href="/auth/signin">
                                        <Button
                                            className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-lg px-6 transition-all duration-300"
                                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                                        >
                                            Try It Free
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )
            })}

            {/* ── Prompt Visualizer (compact) ────────────────── */}
            <section className="py-20 bg-black relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

                <div className="container mx-auto px-4">
                    <div className="text-center mb-10">
                        <h3
                            className="text-3xl md:text-4xl text-white mb-3"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            The Prompting Language
                        </h3>
                        <p
                            className="text-neutral-400 max-w-lg mx-auto"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Six operators — Batch, Pipe, Anchor, Wildcard, AI, Stack. Master them once, create forever.
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto">
                        <div className="relative rounded-xl overflow-hidden border border-neutral-800 shadow-xl">
                            <video autoPlay muted loop playsInline className="w-full h-auto">
                                <source src="/landing/prompt-visualizer.mp4" type="video/mp4" />
                            </video>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Pricing ────────────────────────────────────── */}
            <section className="py-24 bg-neutral-950">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3
                            className="text-3xl md:text-5xl text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}
                        >
                            No Subscriptions. No Surprises.
                        </h3>
                        <p
                            className="text-neutral-400 text-lg max-w-xl mx-auto"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                            Buy credits when you need them. Use them whenever. They never expire.
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
                                    <div className="text-3xl font-bold text-amber-500 mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{tier.price}</div>
                                    <p className="text-neutral-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tier.credits}</p>
                                    <p className="text-xs text-neutral-600 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{tier.images}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ──────────────────────────────────── */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h3
                        className="text-4xl md:text-6xl text-white mb-4"
                        style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.06em" }}
                    >
                        Your Vision. Rendered.
                    </h3>
                    <p
                        className="text-neutral-400 text-lg mb-10 max-w-md mx-auto"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
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

            <div className="h-16 bg-black" />
        </div>
    )
}
