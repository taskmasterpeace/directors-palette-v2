'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react'
import { PromptModal, PromptModalConfig } from '@/components/ui/prompt-modal'

interface PromptContextValue {
  showPrompt: (config: PromptModalConfig) => Promise<string | null>
}

const PromptContext = createContext<PromptContextValue | null>(null)

interface PromptProviderProps {
  children: React.ReactNode
}

export function PromptProvider({ children }: PromptProviderProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    config: PromptModalConfig
    resolve?: (value: string | null) => void
  }>({
    isOpen: false,
    config: { title: '' },
  })

  // ✅ Track hydration to prevent SSR/client mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const showPrompt = useCallback(
    (config: PromptModalConfig): Promise<string | null> => {
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          config,
          resolve,
        })
      })
    },
    []
  )

  const handleConfirm = useCallback(
    (value: string) => {
      console.log('[PromptProvider] handleConfirm called', { value })
      setModalState((prev) => {
        console.log('[PromptProvider] setModalState before', { prevIsOpen: prev.isOpen, hasResolve: !!prev.resolve })
        if (prev.resolve) {
          console.log('[PromptProvider] Calling resolve with value:', value)
          prev.resolve(value)
        }
        console.log('[PromptProvider] Returning new state with isOpen = false')
        return { ...prev, isOpen: false }
      })
      console.log('[PromptProvider] handleConfirm completed')
    },
    []
  )

  const handleCancel = useCallback(() => {
    setModalState((prev) => {
      if (prev.resolve) {
        prev.resolve(null)
      }
      return { ...prev, isOpen: false }
    })
  }, [])

  console.log('[PromptProvider] Rendering', { isOpen: modalState.isOpen, mounted })

  return (
    <PromptContext.Provider value={{ showPrompt }}>
      {children}
      {/* ✅ Only render modal after client-side mount */}
      {mounted && (
        <PromptModal
          isOpen={modalState.isOpen}
          config={modalState.config}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </PromptContext.Provider>
  )
}

export function usePrompt() {
  const context = useContext(PromptContext)
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider')
  }
  return context
}

// Utility hooks
export function useReferenceNamePrompt() {
  const { showPrompt } = usePrompt()

  return useCallback(
    (defaultValue?: string) =>
      showPrompt({
        title: defaultValue ? 'Edit Reference Name' : 'Set Reference Name',
        description: defaultValue
          ? 'Update the reference name or clear it to remove the tag.'
          : 'Enter a reference name for this image. Use @ prefix for easy identification.',
        placeholder: 'e.g., @hero, @villain, @location',
        defaultValue,
        required: false, // Allow empty to clear reference
        maxLength: 50,
        validation: (value: string) => {
          // Allow empty string to clear reference
          if (value.trim() === '') {
            return null
          }
          if (!value.startsWith('@')) {
            return 'Reference name must start with @'
          }
          if (value.length < 2) {
            return 'Reference name must be at least 2 characters'
          }
          if (!/^@[a-zA-Z0-9_-]+$/.test(value)) {
            return 'Reference name can only contain letters, numbers, underscores, and hyphens'
          }
          return null
        },
      }),
    [showPrompt]
  )
}

export function useTagPrompt() {
  const { showPrompt } = usePrompt()

  return useCallback(
    (defaultValue?: string) =>
      showPrompt({
        title: 'Add Tag',
        description: 'Enter a tag to categorize this image.',
        placeholder: 'e.g., character, landscape, props',
        defaultValue,
        required: true,
        maxLength: 30,
        validation: (value: string) => {
          if (value.length < 1) {
            return 'Tag cannot be empty'
          }
          if (!/^[a-zA-Z0-9\s_-]+$/.test(value)) {
            return 'Tag can only contain letters, numbers, spaces, underscores, and hyphens'
          }
          return null
        },
      }),
    [showPrompt]
  )
}

export function useGenericPrompt() {
  const { showPrompt } = usePrompt()
  return showPrompt
}
