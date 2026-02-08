'use client'

import React, { useCallback, useState } from 'react'
import { Upload, User, Check, AlertCircle, X } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Button } from '@/components/ui/button'
import { LipSyncGenerationService } from '../services/lip-sync-generation.service'
import type { LipSyncModel } from '../types/lip-sync.types'

interface AvatarImageUploaderProps {
  imageUrl: string | null
  onImageChange: (url: string | null, file?: File) => void
  model?: LipSyncModel
  className?: string
  disabled?: boolean
}

interface ValidationState {
  valid: boolean
  width: number
  height: number
  errors: string[]
}

export function AvatarImageUploader({
  imageUrl,
  onImageChange,
  model = 'kling-avatar-v2-standard',
  className,
  disabled = false,
}: AvatarImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationState | null>(null)

  const validateImage = useCallback(async (file: File): Promise<ValidationState> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const result = LipSyncGenerationService.validateImage(img.width, img.height, model)
        resolve({
          valid: result.valid,
          width: img.width,
          height: img.height,
          errors: result.errors,
        })
      }
      img.onerror = () => {
        resolve({
          valid: false,
          width: 0,
          height: 0,
          errors: ['Failed to load image'],
        })
      }
      img.src = URL.createObjectURL(file)
    })
  }, [model])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setValidation({
        valid: false,
        width: 0,
        height: 0,
        errors: ['Please upload an image file'],
      })
      return
    }

    setIsValidating(true)
    const result = await validateImage(file)
    setValidation(result)
    setIsValidating(false)

    if (result.valid) {
      // Create a local URL for preview
      const localUrl = URL.createObjectURL(file)
      onImageChange(localUrl, file)
    }
  }, [validateImage, onImageChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [disabled, handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleClear = useCallback(() => {
    onImageChange(null)
    setValidation(null)
  }, [onImageChange])

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          isDragOver ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && !imageUrl && 'cursor-pointer hover:border-slate-600',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {imageUrl ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
            <img
              src={imageUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

            {/* Validation badge */}
            {validation && (
              <div className={cn(
                'absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                validation.valid
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}>
                {validation.valid ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>{validation.width}x{validation.height}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Invalid</span>
                  </>
                )}
              </div>
            )}

            {/* Clear button */}
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70"
                onClick={handleClear}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Replace label */}
            <label className={cn(
              'absolute bottom-0 left-0 right-0 p-3 text-center text-sm font-medium',
              'bg-black/60 backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors',
              disabled && 'pointer-events-none'
            )}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={disabled}
              />
              Click to replace
            </label>
          </div>
        ) : (
          <label className={cn(
            'flex flex-col items-center justify-center p-8 cursor-pointer',
            disabled && 'pointer-events-none'
          )}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={disabled}
            />

            {isValidating ? (
              <div className="animate-pulse">
                <User className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Validating...</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-3">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload Portrait
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Drag & drop or click to browse
                  <br />
                  Front-facing, 300px minimum
                </p>
              </>
            )}
          </label>
        )}
      </div>

      {/* Validation errors */}
      {validation && !validation.valid && (
        <div className="p-2 rounded-md bg-red-500/10 border border-red-500/20">
          {validation.errors.map((error, i) => (
            <p key={i} className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
