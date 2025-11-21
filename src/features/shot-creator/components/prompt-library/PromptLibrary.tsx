'use client'

import { useIsMobile } from '@/hooks/useMediaQuery'
import { PromptLibraryMobile } from './mobile/PromptLibraryMobile'
import PromptLibraryCard from '../creator-prompt-settings/PromptLibraryCard'

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void
  showQuickAccess?: boolean
  className?: string
  setIsAddPromptOpen?: (open: boolean) => void
}

/**
 * Main PromptLibrary component that routes between mobile and desktop versions
 * - Mobile (max-width: 767px): Uses PromptLibraryMobile with touch-optimized UI
 * - Desktop (min-width: 768px): Uses PromptLibraryCard with full features
 */
export function PromptLibrary({
  onSelectPrompt,
  showQuickAccess = true,
  className,
  setIsAddPromptOpen
}: PromptLibraryProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className={className}>
        <PromptLibraryMobile
          onSelectPrompt={onSelectPrompt}
          showQuickAccess={showQuickAccess}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <PromptLibraryCard
        onSelectPrompt={onSelectPrompt}
        showQuickAccess={showQuickAccess}
        setIsAddPromptOpen={setIsAddPromptOpen}
      />
    </div>
  )
}
