'use client'

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react'
import { PromptModal, PromptModalConfig } from '@/components/ui/prompt-modal'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'

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

  // ✅ Track modal transitions to prevent race conditions
  const isTransitioningRef = React.useRef(false)

  const showPrompt = useCallback(
    (config: PromptModalConfig): Promise<string | null> => {
      return new Promise((resolve) => {
        setModalState((prev) => {
          // Prevent double-opening if already open or transitioning
          if (prev.isOpen || isTransitioningRef.current) {
            resolve(null)
            return prev
          }
          isTransitioningRef.current = true
          return {
            isOpen: true,
            config,
            resolve,
          }
        })
      })
    },
    []
  )

  const handleConfirm = useCallback(
    (value: string) => {
      let resolveCallback: ((value: string) => void) | undefined

      setModalState((prev) => {
        resolveCallback = prev.resolve
        return { ...prev, isOpen: false, resolve: undefined }
      })

      // Defer resolve to next microtask to prevent race conditions
      queueMicrotask(() => {
        if (resolveCallback) {
          resolveCallback(value)
        }
        // Clear transition flag after delay
        setTimeout(() => {
          isTransitioningRef.current = false
        }, 100)
      })
    },
    []
  )

  const handleCancel = useCallback(() => {
    let resolveCallback: ((value: string | null) => void) | undefined

    setModalState((prev) => {
      resolveCallback = prev.resolve
      return { ...prev, isOpen: false, resolve: undefined }
    })

    // Defer resolve to next microtask to prevent race conditions
    queueMicrotask(() => {
      if (resolveCallback) {
        resolveCallback(null)
      }
      // Clear transition flag after delay
      setTimeout(() => {
        isTransitioningRef.current = false
      }, 100)
    })
  }, [])

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
  const getAllReferences = useUnifiedGalleryStore(state => state.getAllReferences)

  return useCallback(
    (defaultValue?: string) => {
      // Get existing references for autocomplete
      const existingReferences = getAllReferences()

      // ✅ Provide fallback suggestions if no references exist yet
      const suggestions = existingReferences.length > 0
        ? existingReferences
        : ['@hero', '@villain', '@location', '@prop', '@character', '@background']

      console.log('📝 useReferenceNamePrompt called:', {
        defaultValue,
        existingReferences,
        suggestions,
      })

      return showPrompt({
        title: 'Set Reference Name',
        description:
          'Enter a reference name for this image. Use @ prefix for easy identification.',
        placeholder: 'e.g., @hero, @villain, @location',
        defaultValue,
        required: true,
        maxLength: 50,
        suggestions, // ADD AUTOCOMPLETE with fallback!
        validation: (value: string) => {
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
      })
    },
    [showPrompt, getAllReferences]
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
