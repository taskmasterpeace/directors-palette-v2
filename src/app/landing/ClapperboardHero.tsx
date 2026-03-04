"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const TOTAL_FRAMES = 61
const FRAME_PATH = "/landing/clapperboard-frames/frame-"

export function ClapperboardHero() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const framesRef = useRef<HTMLImageElement[]>([])
    const [loaded, setLoaded] = useState(false)
    const [progress, setProgress] = useState(0)
    const currentFrameRef = useRef(0)
    const rafRef = useRef<number>(0)

    // Preload all frames
    useEffect(() => {
        let loadedCount = 0
        const images: HTMLImageElement[] = []

        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image()
            img.src = `${FRAME_PATH}${String(i).padStart(3, "0")}.jpg`
            img.onload = () => {
                loadedCount++
                if (loadedCount === TOTAL_FRAMES) {
                    framesRef.current = images
                    setLoaded(true)
                    // Draw first frame
                    drawFrame(0)
                }
            }
            images.push(img)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const drawFrame = useCallback((frameIndex: number) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const img = framesRef.current[frameIndex]
        if (!img) return

        // Set canvas size to match image aspect ratio
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
        }

        ctx.drawImage(img, 0, 0)
    }, [])

    // Scroll handler — maps scroll position to frame index
    useEffect(() => {
        if (!loaded) return

        const handleScroll = () => {
            rafRef.current = requestAnimationFrame(() => {
                const container = containerRef.current
                if (!container) return

                const rect = container.getBoundingClientRect()
                const scrollableHeight = container.offsetHeight - window.innerHeight
                const scrolled = -rect.top
                const rawProgress = Math.max(0, Math.min(1, scrolled / scrollableHeight))

                setProgress(rawProgress)

                const frameIndex = Math.min(
                    TOTAL_FRAMES - 1,
                    Math.floor(rawProgress * TOTAL_FRAMES)
                )

                if (frameIndex !== currentFrameRef.current) {
                    currentFrameRef.current = frameIndex
                    drawFrame(frameIndex)
                }
            })
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        handleScroll() // Initial call

        return () => {
            window.removeEventListener("scroll", handleScroll)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [loaded, drawFrame])

    // Text reveal opacity — fades in during the last 30% of scroll
    const textOpacity = Math.max(0, Math.min(1, (progress - 0.7) / 0.3))
    const textTranslate = (1 - textOpacity) * 40

    return (
        <div
            ref={containerRef}
            className="relative"
            style={{ height: "300vh" }}
        >
            {/* Sticky canvas container */}
            <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden bg-black">
                {/* Loading state */}
                {!loaded && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Loading experience...</p>
                        </div>
                    </div>
                )}

                {/* Canvas for frame animation */}
                <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full object-contain"
                    style={{
                        opacity: loaded ? 1 : 0,
                        transition: "opacity 0.5s ease",
                    }}
                />

                {/* Text overlay — fades in as scroll completes */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-end pb-16 md:pb-24 z-10 pointer-events-none"
                    style={{
                        opacity: textOpacity,
                        transform: `translateY(${textTranslate}px)`,
                    }}
                >
                    {/* Gradient background for text readability */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-1/2"
                        style={{
                            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                            opacity: textOpacity,
                        }}
                    />

                    <div className="relative z-10 flex flex-col items-center text-center px-4 pointer-events-auto">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight">
                            Director&apos;s Palette
                        </h1>
                        <p className="text-xl md:text-2xl text-amber-400 font-medium mb-8 tracking-wide">
                            AI Creative Studio
                        </p>
                        <p className="text-base md:text-lg text-neutral-300 mb-10 max-w-xl leading-relaxed">
                            Images, video, music, storyboards, children&apos;s books, and more.
                            Create complete productions with AI.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link href="/auth/signin">
                                <Button
                                    size="lg"
                                    className="bg-amber-500 text-black hover:bg-amber-400 text-lg px-8 font-semibold shadow-lg shadow-amber-500/20"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link href="/auth/signin">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-white/20 text-white hover:bg-white/10 text-lg px-8"
                                >
                                    Log In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator — visible only at the start */}
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
                    style={{
                        opacity: Math.max(0, 1 - progress * 5),
                        transition: "opacity 0.2s ease",
                    }}
                >
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Scroll to explore</span>
                    <div className="w-6 h-10 rounded-full border-2 border-neutral-600 flex items-start justify-center p-1.5">
                        <div className="w-1.5 h-2.5 rounded-full bg-amber-500 animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    )
}
