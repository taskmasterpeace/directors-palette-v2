"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface ScrollVideoProps {
    /** Path prefix for frames, e.g. "/landing/frames/storybook/frame-" */
    framePath: string
    /** Total number of frames */
    totalFrames: number
    /** File extension (default: "jpg") */
    ext?: string
    /** Extra CSS classes on the wrapper */
    className?: string
}

/**
 * Scroll-driven flipbook component.
 * Preloads all frames, draws them to a canvas as the parent
 * section scrolls through the viewport.
 */
export function ScrollVideo({
    framePath,
    totalFrames,
    ext = "jpg",
    className = "",
}: ScrollVideoProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const framesRef = useRef<HTMLImageElement[]>([])
    const currentFrameRef = useRef(0)
    const rafRef = useRef<number>(0)
    const [loaded, setLoaded] = useState(false)

    const drawFrame = useCallback((frameIndex: number) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const img = framesRef.current[frameIndex]
        if (!img) return

        // Match canvas to container size
        const rect = canvas.parentElement?.getBoundingClientRect()
        const w = rect?.width || canvas.clientWidth
        const h = rect?.height || canvas.clientHeight

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
        }

        // Object-cover: fill and crop
        const imgRatio = img.naturalWidth / img.naturalHeight
        const canvasRatio = w / h
        let drawW: number, drawH: number, drawX: number, drawY: number

        if (imgRatio > canvasRatio) {
            drawH = h
            drawW = h * imgRatio
            drawX = (w - drawW) / 2
            drawY = 0
        } else {
            drawW = w
            drawH = w / imgRatio
            drawX = 0
            drawY = (h - drawH) / 2
        }

        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, drawX, drawY, drawW, drawH)
    }, [])

    // Preload frames
    useEffect(() => {
        let loadedCount = 0
        const images: HTMLImageElement[] = []

        for (let i = 1; i <= totalFrames; i++) {
            const img = new Image()
            img.src = `${framePath}${String(i).padStart(3, "0")}.${ext}`
            img.onload = () => {
                loadedCount++
                if (loadedCount === totalFrames) {
                    framesRef.current = images
                    setLoaded(true)
                    drawFrame(0)
                }
            }
            images.push(img)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalFrames, framePath, ext])

    // Scroll handler — progress is based on how far the container
    // has scrolled through the viewport
    useEffect(() => {
        if (!loaded) return

        const handleScroll = () => {
            rafRef.current = requestAnimationFrame(() => {
                const container = containerRef.current
                if (!container) return

                const rect = container.getBoundingClientRect()
                const vh = window.innerHeight

                // Start when top of container enters bottom of viewport
                // End when bottom of container exits top of viewport
                const scrollableRange = rect.height + vh
                const scrolled = vh - rect.top
                const rawProgress = Math.max(0, Math.min(1, scrolled / scrollableRange))

                const frameIndex = Math.min(
                    totalFrames - 1,
                    Math.floor(rawProgress * totalFrames)
                )

                if (frameIndex !== currentFrameRef.current) {
                    currentFrameRef.current = frameIndex
                    drawFrame(frameIndex)
                }
            })
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        handleScroll()

        return () => {
            window.removeEventListener("scroll", handleScroll)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [loaded, totalFrames, drawFrame])

    // Resize handler
    useEffect(() => {
        if (!loaded) return
        const handleResize = () => drawFrame(currentFrameRef.current)
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [loaded, drawFrame])

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Loading placeholder */}
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 rounded-xl">
                    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-xl"
                style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}
            />
        </div>
    )
}
