'use client'

import { useEffect, useRef } from 'react'

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
  const loaded = useRef(false)

  useEffect(() => {
    // Dynamically import model-viewer to avoid SSR issues
    if (!loaded.current) {
      loaded.current = true
      import('@google/model-viewer').catch(() => {
        // model-viewer registers itself as a web component
      })
    }
  }, [])

  return (
    <div ref={containerRef} className={className}>
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
        style={{
          width: '100%',
          height: '100%',
          backgroundColor,
          '--poster-color': 'transparent',
        } as React.CSSProperties}
      />
    </div>
  )
}
