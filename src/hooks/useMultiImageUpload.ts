'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { validateImageFile, resizeImage } from '@/features/shot-creator/helpers/image-resize.helper'

export interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  result?: {
    preview: string
    file: File
  }
}

export interface UploadResult {
  successful: Array<{ preview: string; file: File; fileName: string }>
  failed: Array<{ fileName: string; error: string }>
  totalProcessed: number
}

/**
 * Hook for uploading multiple images concurrently (up to 10)
 * Handles validation, resizing, and progress tracking
 *
 * @param maxFiles - Maximum number of files allowed (default: 10)
 * @param targetAspectRatio - Optional aspect ratio for resizing
 * @returns Upload functions and state
 */
export function useMultiImageUpload(maxFiles = 10, targetAspectRatio?: string) {
  const { toast } = useToast()
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<Map<string, UploadProgress>>(new Map())

  /**
   * Process a single file: validate, resize, create preview
   */
  const processFile = async (file: File): Promise<UploadProgress> => {
    const fileName = file.name

    try {
      // Update progress: uploading
      setProgress(prev => new Map(prev).set(fileName, {
        fileName,
        status: 'uploading',
        progress: 0
      }))

      // Validate file
      const validation = validateImageFile(file)
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid file')
      }

      // Update progress: 30%
      setProgress(prev => {
        const next = new Map(prev)
        const current = next.get(fileName)
        if (current) {
          next.set(fileName, { ...current, progress: 30 })
        }
        return next
      })

      // Resize image
      const resizedBlob = await resizeImage(file, targetAspectRatio)
      const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type })

      // Update progress: 60%
      setProgress(prev => {
        const next = new Map(prev)
        const current = next.get(fileName)
        if (current) {
          next.set(fileName, { ...current, progress: 60 })
        }
        return next
      })

      // Create preview
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(resizedFile)
      })

      // Update progress: success
      setProgress(prev => new Map(prev).set(fileName, {
        fileName,
        status: 'success',
        progress: 100,
        result: { preview, file: resizedFile }
      }))

      return {
        fileName,
        status: 'success',
        progress: 100,
        result: { preview, file: resizedFile }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Update progress: error
      setProgress(prev => new Map(prev).set(fileName, {
        fileName,
        status: 'error',
        progress: 0,
        error: errorMessage
      }))

      return {
        fileName,
        status: 'error',
        progress: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Upload multiple files concurrently
   */
  const uploadMultiple = useCallback(async (files: FileList | File[]): Promise<UploadResult> => {
    const fileArray = Array.from(files)

    // Validate file count
    if (fileArray.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one image',
        variant: 'destructive'
      })
      return { successful: [], failed: [], totalProcessed: 0 }
    }

    if (fileArray.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `You can only upload up to ${maxFiles} images at once. ${fileArray.length} selected.`,
        variant: 'destructive'
      })
      return { successful: [], failed: [], totalProcessed: 0 }
    }

    setIsUploading(true)
    setProgress(new Map())

    toast({
      title: 'Uploading images',
      description: `Processing ${fileArray.length} image${fileArray.length > 1 ? 's' : ''}...`
    })

    try {
      // Process all files concurrently
      const results = await Promise.allSettled(
        fileArray.map(file => processFile(file))
      )

      // Separate successful and failed uploads
      const successful: Array<{ preview: string; file: File; fileName: string }> = []
      const failed: Array<{ fileName: string; error: string }> = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const upload = result.value
          if (upload.status === 'success' && upload.result) {
            successful.push({
              preview: upload.result.preview,
              file: upload.result.file,
              fileName: upload.fileName
            })
          } else if (upload.status === 'error') {
            failed.push({
              fileName: upload.fileName,
              error: upload.error || 'Unknown error'
            })
          }
        } else {
          failed.push({
            fileName: fileArray[index].name,
            error: result.reason?.message || 'Upload failed'
          })
        }
      })

      // Show result toast
      if (successful.length > 0 && failed.length === 0) {
        toast({
          title: 'Upload complete',
          description: `${successful.length} image${successful.length > 1 ? 's' : ''} uploaded successfully`
        })
      } else if (successful.length > 0 && failed.length > 0) {
        toast({
          title: 'Partial upload',
          description: `${successful.length} succeeded, ${failed.length} failed`,
          variant: 'default'
        })
      } else {
        toast({
          title: 'Upload failed',
          description: `All ${failed.length} image${failed.length > 1 ? 's' : ''} failed to upload`,
          variant: 'destructive'
        })
      }

      return {
        successful,
        failed,
        totalProcessed: fileArray.length
      }

    } finally {
      setIsUploading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- processFile is stable within component lifecycle
  }, [maxFiles, targetAspectRatio, toast])

  /**
   * Reset upload state
   */
  const resetProgress = useCallback(() => {
    setProgress(new Map())
    setIsUploading(false)
  }, [])

  return {
    uploadMultiple,
    resetProgress,
    isUploading,
    progress: Array.from(progress.values()),
    successCount: Array.from(progress.values()).filter(p => p.status === 'success').length,
    errorCount: Array.from(progress.values()).filter(p => p.status === 'error').length
  }
}
