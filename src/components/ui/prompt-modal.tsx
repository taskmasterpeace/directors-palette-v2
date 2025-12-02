'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/utils/utils'

export interface PromptModalConfig {
  title: string
  description?: string
  placeholder?: string
  defaultValue?: string
  validation?: (value: string) => string | null // Return error message or null if valid
  required?: boolean
  maxLength?: number
  variant?: 'default' | 'destructive'
}

interface PromptModalProps {
  isOpen: boolean
  config: PromptModalConfig
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function PromptModal({ isOpen, config, onConfirm, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(config.defaultValue || '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isClosingRef = useRef(false)
  const prevIsOpenRef = useRef(isOpen)

  useEffect(() => {
    if (!isOpen) {
      document.body.style.pointerEvents = ''
    }
    return () => {
      document.body.style.pointerEvents = ''
    }
  }, [isOpen])

  // Reset state ONLY when modal transitions from closed to open
  useEffect(() => {
    // Only reset when transitioning from false -> true (opening)
    if (isOpen && !prevIsOpenRef.current) {
      isClosingRef.current = false
      setValue(config.defaultValue || '')
      setError(null)
      // Focus input after a short delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }

    // Update previous value for next render
    prevIsOpenRef.current = isOpen
  }, [isOpen, config.defaultValue])

  // Validate input value
  const validateValue = useCallback((inputValue: string) => {
    const trimmedValue = inputValue.trim()

    // Check if required
    if (config.required && !trimmedValue) {
      return 'This field is required'
    }

    // Check max length
    if (config.maxLength && trimmedValue.length > config.maxLength) {
      return `Maximum ${config.maxLength} characters allowed`
    }

    // Custom validation
    if (config.validation) {
      return config.validation(trimmedValue)
    }

    return null
  }, [config])

  // Handle input change with validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    // Clear error if user is typing
    if (error) {
      setError(null)
    }
  }

  // Handle form submission
  const handleConfirm = () => {
    const trimmedValue = value.trim()
    const validationError = validateValue(trimmedValue)

    if (validationError) {
      setError(validationError)
      inputRef.current?.focus()
      return
    }

    isClosingRef.current = true
    onConfirm(trimmedValue)
  }

  // Handle cancel
  const handleCancel = () => {
    isClosingRef.current = true
    onCancel()
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Prevent modal from closing when clicking inside content
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only call onCancel if dialog is being closed externally (escape/click outside)
      // Don't call it when we're manually closing via confirm button
      if (!open && !isClosingRef.current) {
        onCancel()
      }
    }}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          config.variant === 'destructive' && "border-destructive/30 dark:border-primary/30"
        )}
        onClick={handleContentClick}
        showCloseButton={false}
      >
        <DialogHeader className="space-y-3">
          <DialogTitle className={cn(
            "text-lg font-semibold",
            config.variant === 'destructive' ? "text-primary dark:text-primary" : "text-foreground dark:text-foreground"
          )}>
            {config.title}
          </DialogTitle>
          {config.description && (
            <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
              {config.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-input" className="text-sm font-medium text-muted-foreground dark:text-foreground">
              Enter value:
            </Label>
            <Input
              id="prompt-input"
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              maxLength={config.maxLength}
              className={cn(
                "transition-all duration-200",
                error && "border-destructive/50 focus-visible:border-primary focus-visible:ring-ring/20 dark:border-primary/50"
              )}
              aria-invalid={!!error}
              aria-describedby={error ? "prompt-error" : undefined}
            />
            {error && (
              <p id="prompt-error" className="text-sm text-primary dark:text-primary" role="alert">
                {error}
              </p>
            )}
            {config.maxLength && (
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                {value.length} / {config.maxLength} characters
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-3 sm:gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant={config.variant === 'destructive' ? 'destructive' : 'default'}
            className={cn(
              "flex-1 sm:flex-none",
              config.variant !== 'destructive' && "bg-purple-600 hover:bg-purple-700 focus-visible:ring-purple-600/20 dark:bg-purple-700 dark:hover:bg-purple-600"
            )}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easier usage
export function usePromptModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    config: PromptModalConfig
    resolve?: (value: string | null) => void
  }>({
    isOpen: false,
    config: { title: '' }
  })

  const showPrompt = useCallback((config: PromptModalConfig): Promise<string | null> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        config,
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback((value: string) => {
    if (modalState.resolve) {
      modalState.resolve(value)
    }
    setModalState(prev => ({ ...prev, isOpen: false }))
  }, [modalState])

  const handleCancel = useCallback(() => {
    if (modalState.resolve) {
      modalState.resolve(null)
    }
    setModalState(prev => ({ ...prev, isOpen: false }))
  }, [modalState])

  const PromptModalComponent = useCallback(() => (
    <PromptModal
      isOpen={modalState.isOpen}
      config={modalState.config}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ), [modalState.isOpen, modalState.config, handleConfirm, handleCancel])

  return {
    showPrompt,
    PromptModal: PromptModalComponent
  }
}