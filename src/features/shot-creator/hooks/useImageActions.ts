import { useToast } from '@/hooks/use-toast'
import { useCallback } from 'react'
import { clipboardManager } from '@/utils/clipboard-manager'

/**
 * Custom hook for image-related actions
 * Handles copying prompts and images to clipboard
 */
export function useImageActions() {
  const { toast } = useToast()

  const handleCopyPrompt = useCallback(async (prompt?: string) => {
    if (prompt) {
      try {
        await clipboardManager.writeText(prompt)
        toast({
          title: "Prompt Copied",
          description: "The prompt has been copied to your clipboard"
        })
      } catch (error) {
        console.error("Copy prompt failed", error)
        toast({
          title: "Copy Failed",
          description: "Unable to copy prompt to clipboard",
          variant: "destructive"
        })
      }
    }
  }, [toast])

  const handleCopyImage = useCallback(async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()

      // Convert image to PNG for clipboard compatibility
      if (blob.type !== 'image/png') {
        // Create an image element to convert the format
        const img = new Image()
        const objectUrl = URL.createObjectURL(blob)

        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
          img.src = objectUrl
        })

        // Create a canvas and draw the image
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(objectUrl)

        // Convert canvas to PNG data URL
        const dataURL = canvas.toDataURL('image/png')

        // Copy using clipboardManager
        await clipboardManager.writeImage(dataURL)
      } else {
        // Convert blob to data URL for clipboardManager
        const reader = new FileReader()
        const dataURL = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        await clipboardManager.writeImage(dataURL)
      }

      toast({
        title: "Copied",
        description: "Image copied to clipboard"
      })
    } catch (error) {
      console.error("Copy failed", error)
      // Fallback: try to copy URL instead
      try {
        await clipboardManager.writeText(url)
        toast({
          title: "Copied URL",
          description: "Image URL copied to clipboard (image format not supported)"
        })
      } catch {
        toast({
          title: "Copy Failed",
          description: "Unable to copy to clipboard",
          variant: "destructive"
        })
      }
    }
  }, [toast])

  return {
    handleCopyPrompt,
    handleCopyImage
  }
}
