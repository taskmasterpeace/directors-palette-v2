/**
 * Image Import Hook
 *
 * Handles image upload and import functionality
 */

import { useCallback, ChangeEvent, RefObject } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useLayoutAnnotationStore } from '../store'

interface ImageImportProps {
  fileInputRef: RefObject<HTMLInputElement | null>
}

export function useImageImport({ fileInputRef }: ImageImportProps) {
  const { toast } = useToast()
  const { setIncomingImages } = useLayoutAnnotationStore()

  const handleImportClick = useCallback(() => {
    const node = fileInputRef.current
    if (!node) return

    if (typeof node.showPicker === 'function') {
      node.showPicker()
    } else {
      node.click()
    }
  }, [fileInputRef])

  const handleReceiveImage = useCallback((imageUrl: string) => {
    setIncomingImages(prev => [...prev, imageUrl])
    toast({
      title: 'Image received',
      description: 'Image queued for the canvas.'
    })
  }, [toast, setIncomingImages])

  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    handleReceiveImage(url)

    // allow selecting the same file twice in a row
    event.target.value = ''
    // Give enough time for image to be loaded to canvas before revoking
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }, [handleReceiveImage])

  return {
    handleImportClick,
    handleFileUpload,
    handleReceiveImage
  }
}
