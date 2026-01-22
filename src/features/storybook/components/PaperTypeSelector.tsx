"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PAPER_TYPES, type KDPPaperType } from "../types/storybook.types"
import { cn } from "@/utils/utils"

interface PaperTypeSelectorProps {
  value: KDPPaperType
  onChange: (value: KDPPaperType) => void
  pageCount?: number
  className?: string
}

/**
 * Calculate spine width based on page count and paper type
 */
function calculateSpineWidth(pageCount: number, paperType: KDPPaperType): number {
  const thickness = PAPER_TYPES[paperType].thicknessPerPage
  return pageCount * thickness
}

/**
 * Format spine width for display
 */
function formatSpineWidth(spineWidth: number): string {
  // Display in inches with 3 decimal places
  return `${spineWidth.toFixed(3)}"`
}

export function PaperTypeSelector({
  value,
  onChange,
  pageCount = 32,
  className,
}: PaperTypeSelectorProps) {
  const paperTypes = Object.entries(PAPER_TYPES) as [KDPPaperType, typeof PAPER_TYPES[KDPPaperType]][]

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-white">Paper Type</Label>
        {pageCount > 0 && (
          <span className="text-xs text-zinc-400">
            {pageCount} pages
          </span>
        )}
      </div>

      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as KDPPaperType)}
        className="grid gap-2"
      >
        {paperTypes.map(([type, config]) => {
          const spineWidth = calculateSpineWidth(pageCount, type)
          const isSelected = value === type

          return (
            <div
              key={type}
              className={cn(
                "relative flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-all",
                isSelected
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
              )}
              onClick={() => onChange(type)}
            >
              <RadioGroupItem
                value={type}
                id={type}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={type}
                    className={cn(
                      "text-sm font-medium cursor-pointer",
                      isSelected ? "text-amber-400" : "text-white"
                    )}
                  >
                    {config.name}
                  </Label>
                  {config.recommended && (
                    <Badge
                      variant="outline"
                      className="text-xs border-amber-500/50 text-amber-400"
                    >
                      Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {config.description}
                </p>
                <p className={cn(
                  "text-xs mt-1 font-mono",
                  isSelected ? "text-amber-300" : "text-zinc-500"
                )}>
                  Spine width: {formatSpineWidth(spineWidth)}
                </p>
              </div>
            </div>
          )
        })}
      </RadioGroup>

      <p className="text-xs text-zinc-500 mt-2">
        Spine width affects cover wrap dimensions. Premium Color is recommended for children&apos;s picture books.
      </p>
    </div>
  )
}
