'use client'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImageIcon, Search, Grid3x3, Grid2x2, Menu, Square, RectangleHorizontal, ChevronDown, ArrowUpDown, Eye, EyeOff } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { GridSize, GeneratedImage } from '../../store/unified-gallery-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SourceFilter } from './SourceFilter'

// Storage limits constants
const IMAGE_LIMIT = 500
const IMAGE_WARNING_THRESHOLD = 400

type SortOption = 'newest' | 'oldest' | 'model'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  model: 'By model',
}

interface GalleryHeaderProps {
  totalImages: number
  totalDatabaseCount: number
  totalCredits: number
  searchQuery: string
  gridSize: GridSize
  currentFolderName?: string
  useNativeAspectRatio: boolean
  sourceFilter: GeneratedImage['source'] | null
  sortBy: SortOption
  showPrompts: boolean
  onSearchChange: (query: string) => void
  onSelectAll: () => void
  onSelectRecent?: (count: number) => void
  visibleImageCount?: number
  selectedCount?: number
  onClearSelection?: () => void
  onGridSizeChange: (size: GridSize) => void
  onAspectRatioChange: (useNative: boolean) => void
  onSourceFilterChange: (source: GeneratedImage['source'] | null) => void
  onSortChange: (sort: SortOption) => void
  onShowPromptsChange: (show: boolean) => void
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
  sortBy,
  showPrompts,
  onSearchChange,
  onSelectAll,
  onSelectRecent,
  visibleImageCount = 0,
  selectedCount = 0,
  onClearSelection,
  onGridSizeChange,
  onAspectRatioChange,
  onSourceFilterChange,
  onSortChange,
  onShowPromptsChange,
  onOpenMobileMenu,
}: GalleryHeaderProps) {

  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-3">
        {/* Row 1: Title + combined stats badge */}
        <div className="flex items-center justify-between">
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
              <span className="hidden md:inline">Gallery</span>
              <span className="md:hidden">
                {currentFolderName ? currentFolderName : 'Gallery'}
              </span>
              {currentFolderName && (
                <span className="hidden md:inline text-muted-foreground"> / {currentFolderName}</span>
              )}
            </CardTitle>
          </div>

          {/* Combined images + pts badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-xs cursor-help whitespace-nowrap ${
                    totalDatabaseCount >= IMAGE_LIMIT
                      ? 'bg-destructive/20 border-destructive text-destructive'
                      : totalDatabaseCount >= IMAGE_WARNING_THRESHOLD
                        ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                        : ''
                  }`}
                >
                  {totalDatabaseCount}/{IMAGE_LIMIT} images
                  {totalDatabaseCount >= IMAGE_LIMIT && ' (LIMIT)'}
                  <span className="mx-1.5 opacity-40">|</span>
                  {totalCredits} pts
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
        </div>

        {/* Row 2: Search + source filter | Sort + Grid + Aspect + Prompts + Select */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Left group: Search + Source filter */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-[120px] max-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 w-full h-8"
              />
            </div>
            <SourceFilter
              currentFilter={sourceFilter}
              onFilterChange={onSourceFilterChange}
            />
          </div>

          {/* Right group: Sort + Grid + Aspect + Prompts + Select */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => onSortChange(key)}
                    className={sortBy === key ? 'bg-accent/20 text-accent' : ''}
                  >
                    {SORT_LABELS[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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

            {/* Aspect Ratio Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card/50 h-8">
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

            {/* Prompt visibility toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPrompts ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => onShowPromptsChange(!showPrompts)}
                    className="h-8 px-2"
                  >
                    {showPrompts ? (
                      <Eye className="w-4 h-4 text-accent" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{showPrompts ? 'Hide prompts' : 'Show prompts'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Select / Deselect dropdown */}
            <SelectDropdown
              visibleImageCount={visibleImageCount}
              selectedCount={selectedCount}
              onSelectRecent={onSelectRecent}
              onSelectAll={onSelectAll}
              onClearSelection={onClearSelection}
            />
          </div>
        </div>
      </div>
    </CardHeader>
  )
}

function SelectDropdown({ visibleImageCount, selectedCount, onSelectRecent, onSelectAll, onClearSelection }: {
  visibleImageCount: number
  selectedCount: number
  onSelectRecent?: (count: number) => void
  onSelectAll: () => void
  onClearSelection?: () => void
}) {
  const hasSelection = selectedCount > 0
  const options = [5, 10, 20].filter(n => n < visibleImageCount)

  if (hasSelection) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={onClearSelection}
        className="gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {selectedCount} selected — Clear
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-8">
          Select
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(n => (
          <DropdownMenuItem key={n} onClick={() => onSelectRecent?.(n)}>
            Last {n}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={onSelectAll} className="font-medium">
          All ({visibleImageCount})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
