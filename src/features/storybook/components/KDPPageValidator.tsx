"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  FileText,
  BookMarked,
} from "lucide-react"
import { cn } from "@/utils/utils"
import {
  calculateKDPPageBreakdown,
  getKDPRecommendation,
  formatPageCount,
} from "../utils/kdp-validator"
import type { StorybookProject } from "../types/storybook.types"

interface KDPPageValidatorProps {
  project: StorybookProject
  className?: string
  defaultExpanded?: boolean
}

export function KDPPageValidator({
  project,
  className,
  defaultExpanded = false,
}: KDPPageValidatorProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const breakdown = calculateKDPPageBreakdown(project)
  const recommendation = getKDPRecommendation(breakdown)

  return (
    <Card className={cn("bg-zinc-900/50 border-zinc-800", className)}>
      <CardContent className="p-4">
        {/* Header - Always visible */}
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <div className="text-left">
              <h3 className="text-sm font-semibold text-white">
                KDP Page Count
              </h3>
              <p className="text-xs text-zinc-400">
                {breakdown.grandTotal} total pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {breakdown.isKDPReady ? (
              <Badge
                variant="outline"
                className="border-green-500/50 text-green-400 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                KDP Ready
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-orange-500/50 text-orange-400 gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                {breakdown.shortfall} pages short
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </Button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-zinc-700 space-y-4">
            {/* Front Matter */}
            {breakdown.frontMatter.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">
                    Front Matter
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {formatPageCount(breakdown.frontMatter.total)}
                  </span>
                </div>
                <div className="ml-6 space-y-1">
                  {breakdown.frontMatter.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-400">
                        {item.name}
                      </span>
                      <span className="text-zinc-500">
                        ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story Pages */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">
                  Story Pages
                </span>
                <span className="text-xs text-zinc-500 ml-auto">
                  {formatPageCount(breakdown.storyPages.total)}
                </span>
              </div>
              <div className="ml-6 text-xs text-zinc-400">
                {breakdown.storyPages.beats > 0
                  ? `${breakdown.storyPages.beats} beats (spreads)`
                  : 'No story pages yet'}
              </div>
            </div>

            {/* Back Matter */}
            {breakdown.backMatter.total > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium text-white">
                    Back Matter
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {formatPageCount(breakdown.backMatter.total)}
                  </span>
                </div>
                <div className="ml-6 space-y-1">
                  {breakdown.backMatter.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-zinc-400">
                        {item.name}
                      </span>
                      <span className="text-zinc-500">
                        ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-zinc-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  TOTAL
                </span>
                <span className={cn(
                  "text-sm font-bold",
                  breakdown.isKDPReady ? "text-green-400" : "text-orange-400"
                )}>
                  {breakdown.grandTotal} pages
                </span>
              </div>
            </div>

            {/* Recommendation */}
            {recommendation && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300">
                    {recommendation}
                  </p>
                </div>
              </div>
            )}

            {/* KDP Info */}
            <p className="text-xs text-zinc-500 text-center">
              Amazon KDP requires minimum {breakdown.kdpMinimum} interior pages for children&apos;s books
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
