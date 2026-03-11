'use client'

import { useEffect, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Move, Pause, Play } from 'lucide-react'
import { cn } from '@/utils/utils'

interface ModelViewerProps {
  src: string
  alt?: string
  className?: string
  autoRotate?: boolean
  cameraControls?: boolean
  poster?: string
  backgroundColor?: string
}

export function ModelViewer({
  src,
  alt = '3D Model',
  className = '',
  autoRotate = true,
  cameraControls = true,
  poster,
  backgroundColor = 'transparent',
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLElement | null>(null)
  const loaded = useRef(false)
  const rotatingRef = useRef(autoRotate)

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true
      import('@google/model-viewer').catch(() => {
        // model-viewer registers itself as a web component
      })
    }
  }, [])

  // Get reference to the model-viewer element after render
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      const mv = container.querySelector('model-viewer')
      if (mv) viewerRef.current = mv
    }
  })

  const zoomIn = useCallback(() => {
    const mv = viewerRef.current as unknown as { getCameraOrbit: () => { theta: number; phi: number; radius: number; toString: () => string }; cameraOrbit: string; jumpCameraToGoal: () => void }
    if (!mv?.getCameraOrbit) return
    const orbit = mv.getCameraOrbit()
    orbit.radius = Math.max(orbit.radius * 0.75, 0.1)
    mv.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`
  }, [])

  const zoomOut = useCallback(() => {
    const mv = viewerRef.current as unknown as { getCameraOrbit: () => { theta: number; phi: number; radius: number }; cameraOrbit: string }
    if (!mv?.getCameraOrbit) return
    const orbit = mv.getCameraOrbit()
    orbit.radius = orbit.radius * 1.33
    mv.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`
  }, [])

  const resetCamera = useCallback(() => {
    const mv = viewerRef.current as unknown as { cameraOrbit: string; cameraTarget: string; jumpCameraToGoal: () => void; setAttribute: (name: string, value: string) => void; removeAttribute: (name: string) => void }
    if (!mv) return
    mv.cameraOrbit = 'auto auto auto'
    mv.cameraTarget = 'auto auto auto'
    // Re-enable auto-rotate if it was on
    if (rotatingRef.current) {
      mv.setAttribute('auto-rotate', '')
    }
  }, [])

  const toggleRotation = useCallback(() => {
    const mv = viewerRef.current as unknown as { setAttribute: (name: string, value: string) => void; removeAttribute: (name: string) => void; hasAttribute: (name: string) => boolean }
    if (!mv) return
    if (mv.hasAttribute('auto-rotate')) {
      mv.removeAttribute('auto-rotate')
      rotatingRef.current = false
    } else {
      mv.setAttribute('auto-rotate', '')
      rotatingRef.current = true
    }
    // Force re-render for button icon
    containerRef.current?.dispatchEvent(new Event('toggle-rotate'))
  }, [])

  // Pan controls: shift the camera target
  const pan = useCallback((dx: number, dy: number) => {
    const mv = viewerRef.current as unknown as { getCameraTarget: () => { x: number; y: number; z: number }; cameraTarget: string }
    if (!mv?.getCameraTarget) return
    const target = mv.getCameraTarget()
    mv.cameraTarget = `${target.x + dx}m ${target.y + dy}m ${target.z}m`
  }, [])

  const btnClass = cn(
    'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
    'bg-black/60 hover:bg-black/80 backdrop-blur-sm',
    'text-white/70 hover:text-white',
    'border border-white/10 hover:border-white/20',
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* @ts-expect-error model-viewer is a web component */}
      <model-viewer
        src={src}
        alt={alt}
        auto-rotate={autoRotate ? '' : undefined}
        camera-controls={cameraControls ? '' : undefined}
        poster={poster}
        shadow-intensity="1"
        shadow-softness="0.5"
        exposure="1"
        environment-image="neutral"
        min-camera-orbit="auto auto 0.1m"
        interaction-prompt="none"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor,
          '--poster-color': 'transparent',
        } as React.CSSProperties}
      />

      {/* On-screen controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
        {/* Zoom */}
        <button onClick={zoomIn} className={btnClass} title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={zoomOut} className={btnClass} title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-1" />

        {/* Pan */}
        <button onClick={() => pan(0, 0.05)} className={btnClass} title="Pan up">
          <Move className="w-4 h-4" style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button onClick={() => pan(0, -0.05)} className={btnClass} title="Pan down">
          <Move className="w-4 h-4" style={{ transform: 'rotate(90deg)' }} />
        </button>

        {/* Divider */}
        <div className="h-px bg-white/10 mx-1" />

        {/* Rotation toggle */}
        <button onClick={toggleRotation} className={btnClass} title="Toggle auto-rotate">
          {rotatingRef.current ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Reset */}
        <button onClick={resetCamera} className={btnClass} title="Reset camera">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Hint text */}
      <div className="absolute bottom-3 left-3 text-[9px] text-white/30 z-10 pointer-events-none">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  )
}
