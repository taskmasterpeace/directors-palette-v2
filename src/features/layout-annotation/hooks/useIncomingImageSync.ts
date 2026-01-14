/**
 * Incoming Image Sync Hook
 *
 * Handles synchronization of incoming images from localStorage and other sources
 */

import { useEffect, RefObject } from 'react'
import { useLayoutAnnotationStore } from '../store'
import type { FabricCanvasRef } from '../components/canvas-board'

const STORAGE_KEY = 'directors-palette-layout-input'

interface IncomingImageSyncProps {
  canvasRef: RefObject<FabricCanvasRef | null>
}

export function useIncomingImageSync({ canvasRef }: IncomingImageSyncProps) {
  const { incomingImages, initialImage, setIncomingImages } = useLayoutAnnotationStore()

  // Check localStorage for incoming images on mount and tab switch
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkForIncomingImage = () => {
      const storedImage = localStorage.getItem(STORAGE_KEY)
      if (storedImage) {
        setIncomingImages([storedImage])
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    // Check immediately
    checkForIncomingImage()

    // Listen for storage events (in case of multiple tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setIncomingImages([e.newValue])
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Set up an interval to check periodically (fallback)
    const interval = setInterval(checkForIncomingImage, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [setIncomingImages])

  // Handle initial image from store
  useEffect(() => {
    if (initialImage) {
      setIncomingImages(prev => {
        if (prev.includes(initialImage)) {
          return prev
        }
        return [...prev, initialImage]
      })
    }
  }, [initialImage, setIncomingImages])

  // Process incoming images to canvas
  useEffect(() => {
    if (incomingImages.length === 0) {
      return
    }

    console.log('[Layout Annotation] Processing incoming images:', incomingImages)

    const processImages = () => {
      const canvasApi = canvasRef.current
      if (!canvasApi?.importImage) {
        console.log('[Layout Annotation] Canvas not ready yet, retrying...')
        setTimeout(processImages, 100)
        return
      }
      console.log('[Layout Annotation] Importing images to canvas')
      incomingImages.forEach((url) => {
        console.log('[Layout Annotation] Importing image:', url)
        canvasApi.importImage(url)
      })
      setIncomingImages([])
    }

    setTimeout(processImages, 200)
  }, [incomingImages, setIncomingImages, canvasRef])
}
