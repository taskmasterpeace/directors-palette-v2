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
  suggestions?: string[] // NEW: Autocomplete suggestions
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
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // ✅ Track closing state to prevent double-cancel
  const isClosingRef = useRef(false)
  const prevIsOpenRef = useRef(isOpen)

  // Filter suggestions based on input
  const filteredSuggestions = React.useMemo(() => {
    if (!config.suggestions || config.suggestions.length === 0) {
      return []
    }

    // If empty or just "@", show all suggestions
    if (!value || value === '@') {
      return config.suggestions
    }

    const trimmedValue = value.trim()
    const lowerValue = trimmedValue.toLowerCase()

    // Check if current value exactly matches an existing suggestion
    const exactMatch = config.suggestions.some(s =>
      s.toLowerCase() === lowerValue
    )

    // If exact match, show all suggestions (user wants to switch)
    if (exactMatch) {
      return config.suggestions
    }

    // Otherwise filter by prefix using startsWith
    const filtered = config.suggestions.filter(s =>
      s.toLowerCase().startsWith(lowerValue)
    )
    return filtered
  }, [config.suggestions, value])

  useEffect(() => {
    if (!isOpen) {
      document.body.style.pointerEvents = ''
    }
    return () => {
      document.body.style.pointerEvents = ''
    }
  }, [isOpen])

  // Reset state only when transitioning from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      isClosingRef.current = false
      setValue(config.defaultValue || '')
      setError(null)
      setShowSuggestions(true) // Show suggestions when modal opens
      setSelectedIndex(-1)
      // Focus input after a short delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
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
    setShowSuggestions(true)
    setSelectedIndex(-1)

    // Clear error if user is typing
    if (error) {
      setError(null)
    }
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setValue(suggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
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

  // Handle cancellation
  const handleCancel = () => {
    isClosingRef.current = true
    onCancel()
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle autocomplete navigation
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        return
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        return
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault()
        handleSelectSuggestion(filteredSuggestions[selectedIndex])
        return
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        return
      }
    }

    // Normal handlers
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
      if (!open && !isClosingRef.current) {
        onCancel()
      }
    }}>
      <DialogContent
        className={cn(
          "sm:max-w-md",
          config.variant === 'destructive' && "border-red-200 dark:border-red-900"
        )}
        onClick={handleContentClick}
        showCloseButton={false}
      >
        <DialogHeader className="space-y-3">
          <DialogTitle className={cn(
            "text-lg font-semibold",
            config.variant === 'destructive' ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
          )}>
            {config.title}
          </DialogTitle>
          {config.description && (
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {config.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prompt-input" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Enter value:
            </Label>
            <div className="relative">
              <Input
                id="prompt-input"
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={config.placeholder}
                maxLength={config.maxLength}
                className={cn(
                  "transition-all duration-200",
                  error && "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20 dark:border-red-700"
                )}
                aria-invalid={!!error}
                aria-describedby={error ? "prompt-error" : undefined}
                autoComplete="off"
              />

              {/* Autocomplete dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion}
                      className={cn(
                        "px-4 py-2 cursor-pointer transition-colors",
                        index === selectedIndex
                          ? "bg-purple-600 text-white"
                          : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                      )}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p id="prompt-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            {config.maxLength && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
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