'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Lock,
  Unlock,
  Crop,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import type * as fabric from 'fabric'

interface CanvasPropertiesProps {
  selectedObject: fabric.Object | null
  tool: string
  onRotate: (angle: number) => void
  onFlip: (direction: 'horizontal' | 'vertical') => void
  onCrop: () => void
  onToggleLock: () => void
  onDelete: () => void
}

export function CanvasProperties({
  selectedObject,
  tool,
  onRotate,
  onFlip,
  onCrop,
  onToggleLock,
  onDelete,
}: CanvasPropertiesProps) {
  if (!selectedObject) return null

  return (
    <>
      <div className="h-4 w-px bg-border mx-1" />
      <Button size="sm" onClick={() => onRotate(45)} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Rotate 45°">
        <RotateCw className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={() => onFlip('horizontal')} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Flip horizontal">
        <FlipHorizontal className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={() => onFlip('vertical')} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Flip vertical">
        <FlipVertical className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={onCrop} variant="ghost" className={cn("h-7 w-7 p-0 text-muted-foreground hover:text-foreground", tool === 'crop' && "bg-primary/20 text-primary")} title="Crop Image">
        <Crop className="w-4 h-4" />
      </Button>
      <Button size="sm" onClick={onToggleLock} variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground" title="Lock/Unlock">
        {selectedObject?.lockMovementX ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
      </Button>
      <Button size="sm" onClick={onDelete} variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Delete selected">
        <Trash2 className="w-4 h-4" />
      </Button>
    </>
  )
}
