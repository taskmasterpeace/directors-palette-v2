"use client"

import { useState, useRef, useEffect } from 'react'
import { Move } from 'lucide-react'
import type { TextBoxPosition } from '../types/storybook.types'

interface DraggableTextEditorProps {
  imageUrl?: string
  richText?: string
  text: string
  position?: TextBoxPosition
  onPositionChange: (position: TextBoxPosition) => void
}

export function DraggableTextEditor({
  imageUrl,
  richText,
  text,
  position = { x: 20, y: 400, width: 600, height: 120 },
  onPositionChange,
}: DraggableTextEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const textBoxRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (textBoxRef.current && containerRef.current) {
      const rect = textBoxRef.current.getBoundingClientRect()
      setIsDragging(true)
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      e.preventDefault()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (textBoxRef.current && containerRef.current && e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = textBoxRef.current.getBoundingClientRect()
      setIsDragging(true)
      setDragStart({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      })
      e.preventDefault()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const newX = Math.max(0, Math.min(e.clientX - containerRect.left - dragStart.x, containerRect.width - position.width))
        const newY = Math.max(0, Math.min(e.clientY - containerRect.top - dragStart.y, containerRect.height - position.height))

        onPositionChange({
          ...position,
          x: newX,
          y: newY,
        })
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && containerRef.current && e.touches.length === 1) {
        const touch = e.touches[0]
        const containerRect = containerRef.current.getBoundingClientRect()
        const newX = Math.max(0, Math.min(touch.clientX - containerRect.left - dragStart.x, containerRect.width - position.width))
        const newY = Math.max(0, Math.min(touch.clientY - containerRect.top - dragStart.y, containerRect.height - position.height))

        onPositionChange({
          ...position,
          x: newX,
          y: newY,
        })
        e.preventDefault()
      }
    }

    const handleEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleEnd)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, dragStart, position, onPositionChange])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700"
    >
      {/* Background Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Page background"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800/30 flex items-center justify-center">
          <span className="text-zinc-600 text-sm">Generate page image to preview text positioning</span>
        </div>
      )}

      {/* Draggable Text Box */}
      <div
        ref={textBoxRef}
        className="absolute border-2 border-dashed border-amber-500 bg-transparent hover:border-amber-400 transition-colors cursor-move touch-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          minHeight: `${position.height}px`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Drag Handle */}
        <div className="absolute -top-8 left-0 bg-amber-500 text-black text-xs px-2 py-1 rounded flex items-center gap-1 pointer-events-none">
          <Move className="w-3 h-3" />
          Drag to reposition
        </div>

        {/* Text Content */}
        <div className="w-full h-full p-3 overflow-auto pointer-events-none">
          {richText ? (
            <div
              className="text-white leading-relaxed font-bold rich-text-content"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.8)'
              }}
              dangerouslySetInnerHTML={{ __html: richText }}
            />
          ) : (
            <p
              className="text-white leading-relaxed font-bold"
              style={{
                textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {text}
            </p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded pointer-events-none">
        💡 Click and drag the text box to reposition • Preview shows final result
      </div>
    </div>
  )
}
