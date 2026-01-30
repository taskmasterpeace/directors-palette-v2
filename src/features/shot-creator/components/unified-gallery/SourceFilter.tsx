'use client'

import { Button } from "@/components/ui/button"
import { cn } from "@/utils/utils"
import type { GeneratedImage } from "../../store/unified-gallery-store"

type ImageSource = GeneratedImage['source']

interface SourceOption {
  value: ImageSource | null
  label: string
  icon: string
  bgColor: string
  textColor: string
}

const SOURCE_OPTIONS: SourceOption[] = [
  { value: null, label: 'All', icon: '🖼️', bgColor: 'bg-zinc-600', textColor: 'text-zinc-200' },
  { value: 'shot-creator', label: 'Shot Creator', icon: '📸', bgColor: 'bg-blue-600', textColor: 'text-blue-200' },
  { value: 'adhub', label: 'Adhub', icon: '📣', bgColor: 'bg-purple-600', textColor: 'text-purple-200' },
  { value: 'storybook', label: 'Storybook', icon: '📖', bgColor: 'bg-amber-600', textColor: 'text-amber-200' },
  { value: 'storyboard', label: 'Storyboard', icon: '🎬', bgColor: 'bg-sky-600', textColor: 'text-sky-200' },
]

interface SourceFilterProps {
  currentFilter: ImageSource | null
  onFilterChange: (source: ImageSource | null) => void
  className?: string
}

export function SourceFilter({ currentFilter, onFilterChange, className }: SourceFilterProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {SOURCE_OPTIONS.map((option) => {
        const isActive = currentFilter === option.value
        return (
          <Button
            key={option.value || 'all'}
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "h-7 px-2.5 text-xs font-medium transition-all",
              isActive
                ? `${option.bgColor} ${option.textColor} hover:opacity-90`
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="mr-1">{option.icon}</span>
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
