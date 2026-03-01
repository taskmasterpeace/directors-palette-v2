'use client'

import { Music, Headphones, ScrollText, Sparkles } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { ChatActionData } from '../../types/artist-chat.types'

interface ChatActionLinkProps {
  actionData: ChatActionData
  onClick: () => void
}

function getActionIcon(type: ChatActionData['type']) {
  switch (type) {
    case 'start-song':
      return Music
    case 'check-beat':
      return Headphones
    case 'view-lyrics':
      return ScrollText
    case 'work-on-hook':
      return Sparkles
    default:
      return Music
  }
}

export function ChatActionLink({ actionData, onClick }: ChatActionLinkProps) {
  const Icon = getActionIcon(actionData.type)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group/action flex items-center gap-2.5 w-full max-w-[280px]',
        'rounded-xl px-3.5 py-2.5',
        'bg-amber-500/[0.06] border border-amber-500/25',
        'hover:bg-amber-500/[0.12] hover:border-amber-500/40',
        'hover:shadow-[0_0_16px_rgba(245,158,11,0.1)]',
        'transition-all duration-200',
        'text-left',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
          'bg-amber-500/15',
          'group-hover/action:bg-amber-500/25',
          'transition-colors duration-200',
        )}
      >
        <Icon className="w-4.5 h-4.5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {actionData.label}
        </p>
        <p className="text-[11px] text-muted-foreground/70 capitalize">
          {actionData.type.replace(/-/g, ' ')}
        </p>
      </div>
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          'bg-amber-500/10 group-hover/action:bg-amber-500/20',
          'transition-colors duration-200',
        )}
      >
        <svg
          className="w-3 h-3 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
