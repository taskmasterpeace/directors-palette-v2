/**
 * Canvas Operations Hook
 *
 * Handles all canvas-related operations like undo, redo, clear, save
 */

import { useCallback, RefObject } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { FabricCanvasRef } from '../components/canvas-board'
import { createLogger } from '@/lib/logger'


const log = createLogger('Layout')
interface CanvasOperationsProps {
  canvasRef: RefObject<FabricCanvasRef | null>
}

export function useCanvasOperations({ canvasRef }: CanvasOperationsProps) {
  const { toast } = useToast()

  const handleUndo = useCallback(() => {
    if (canvasRef.current?.undo) {
      canvasRef.current.undo()
    }
  }, [canvasRef])

  const handleRedo = useCallback(() => {
    if (canvasRef.current?.redo) {
      canvasRef.current.redo()
    }
  }, [canvasRef])

  const handleClearCanvas = useCallback(() => {
    if (canvasRef.current?.clear) {
      canvasRef.current.clear()
      toast({
        title: "Canvas Cleared",
        description: "All content removed from canvas"
      })
    }
  }, [canvasRef, toast])

  const handleSaveCanvas = useCallback(() => {
    if (canvasRef.current?.exportCanvas) {
      const dataUrl = canvasRef.current.exportCanvas('image/png')
      log.info('dataUrl', { dataUrl: dataUrl })
      // Here you would typically save to your backend/storage
      toast({
        title: "Canvas Saved",
        description: "Layout and annotations saved successfully"
      })
    }
  }, [canvasRef, toast])

  return {
    handleUndo,
    handleRedo,
    handleClearCanvas,
    handleSaveCanvas
  }
}
