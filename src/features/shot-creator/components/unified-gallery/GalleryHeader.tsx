'use client'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImageIcon, Search, Grid3x3, Grid2x2, Menu, Square, RectangleHorizontal } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { GridSize, GeneratedImage } from '../../store/unified-gallery-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SourceFilter } from './SourceFilter'

// Storage limits constants
const IMAGE_LIMIT = 500
const IMAGE_WARNING_THRESHOLD = 400

interface GalleryHeaderProps {
  totalImages: number
  totalDatabaseCount: number
  totalCredits: number
  searchQuery: string
  gridSize: GridSize
  currentFolderName?: string
  useNativeAspectRatio: boolean
  sourceFilter: GeneratedImage['source'] | null
  onSearchChange: (query: string) => void
  onSelectAll: () => void
  onGridSizeChange: (size: GridSize) => void
  onAspectRatioChange: (useNative: boolean) => void
  onSourceFilterChange: (source: GeneratedImage['source'] | null) => void
  onOpenMobileMenu?: () => void
}

export function GalleryHeader({
  totalImages: _totalImages,
  totalDatabaseCount,
  totalCredits,
  searchQuery,
  gridSize,
  currentFolderName,
  useNativeAspectRatio,
  sourceFilter,
  onSearchChange,
  onSelectAll,
  onGridSizeChange,
  onAspectRatioChange,
  onSourceFilterChange,
  onOpenMobileMenu,
}: GalleryHeaderProps) {

  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-3">
        {/* Top row with title and stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger menu button */}
            {onOpenMobileMenu && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden min-h-[44px] min-w-[44px]"
                onClick={onOpenMobileMenu}
                aria-label="Open folder menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <ImageIcon className="w-5 h-5 text-accent" />
            <CardTitle className="text-base sm:text-lg">
              {/* Show folder name on mobile if selected, full title on desktop */}
              <span className="hidden md:inline">Unified Gallery</span>
              <span className="md:hidden">
                {currentFolderName ? currentFolderName : 'Unified Gallery'}
              </span>
              {currentFolderName && (
                <span className="hidden md:inline text-muted-foreground"> / {currentFolderName}</span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`text-xs cursor-help ${
                      totalDatabaseCount >= IMAGE_LIMIT
                        ? 'bg-destructive/20 border-destructive text-destructive'
                        : totalDatabaseCount >= IMAGE_WARNING_THRESHOLD
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                          : ''
                    }`}
                  >
                    {totalDatabaseCount} / {IMAGE_LIMIT} images
                    {totalDatabaseCount >= IMAGE_LIMIT && ' (LIMIT)'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {totalDatabaseCount >= IMAGE_LIMIT ? (
                    <p className="text-destructive">Storage limit reached! Delete images to create more.</p>
                  ) : totalDatabaseCount >= IMAGE_WARNING_THRESHOLD ? (
                    <p className="text-amber-500">Warning: Approaching {IMAGE_LIMIT} image limit ({IMAGE_LIMIT - totalDatabaseCount} remaining)</p>
                  ) : (
                    <p>{totalDatabaseCount} of {IMAGE_LIMIT} images used ({IMAGE_LIMIT - totalDatabaseCount} remaining)</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Aspect Ratio Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card/50">
                    <Square className="w-3 h-3 text-muted-foreground" />
                    <Switch
                      checked={useNativeAspectRatio}
                      onCheckedChange={onAspectRatioChange}
                      className="scale-75 data-[state=checked]:bg-accent"
                    />
                    <RectangleHorizontal className="w-3 h-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{useNativeAspectRatio ? 'Native aspect ratio' : 'Square (1:1) preview'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Badge variant="outline" className="text-xs">
              {totalCredits} credits
            </Badge>
          </div>
        </div>

        {/* Bottom row with search and controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[140px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-full h-8"
            />
          </div>

          {/* Source Filter */}
          <SourceFilter
            currentFilter={sourceFilter}
            onFilterChange={onSourceFilterChange}
          />

          {/* Grid Size Controls */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={gridSize === 'small' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('small')}
              className="rounded-none h-8 px-2"
              title="Small grid"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={gridSize === 'medium' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('medium')}
              className="rounded-none h-8 px-2 border-x border-border"
              title="Medium grid"
            >
              <Grid2x2 className="w-4 h-4" />
            </Button>
            <Button
              variant={gridSize === 'large' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('large')}
              className="rounded-none h-8 px-2"
              title="Large grid"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Select All Button - bulk actions are now in floating BulkActionsToolbar */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAll}
                >
                  Select All
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="font-medium mb-1">Selection shortcuts:</p>
                <ul className="text-xs space-y-0.5">
                  <li>• <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">Shift</kbd>+click for range select</li>
                  <li>• <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">Ctrl</kbd>/<kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground">⌘</kbd>+click to toggle</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </CardHeader>
  )
}