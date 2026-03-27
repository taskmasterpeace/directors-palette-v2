'use client'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImageIcon, Search, Grid3x3, Grid2x2, Menu, Square, RectangleHorizontal, ChevronDown, ArrowUpDown, Eye, EyeOff, Filter } from 'lucide-react'
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

// Storage limits constants
const IMAGE_LIMIT = 500
const IMAGE_WARNING_THRESHOLD = 400

type SortOption = 'newest' | 'oldest' | 'model'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  model: 'By model',
}

type ImageSource = GeneratedImage['source']

interface SourceOption {
  value: ImageSource | null
  label: string
  icon: string
}

const SOURCE_OPTIONS: SourceOption[] = [
  { value: null, label: 'All', icon: '🖼️' },
  { value: 'shot-creator', label: 'Shot Creator', icon: '📸' },
  { value: 'storybook', label: 'Storybook', icon: '📖' },
  { value: 'storyboard', label: 'Storyboard', icon: '🎬' },
  { value: 'artist-dna', label: 'Artist DNA', icon: '🧬' },
  { value: 'layout-annotation', label: 'Layout', icon: '📐' },
  { value: 'shot-animator', label: 'Animator', icon: '🎥' },
]

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
  const activeSource = SOURCE_OPTIONS.find(o => o.value === sourceFilter) || SOURCE_OPTIONS[0]

  return (
    <CardHeader className="pb-3 px-3">
      <div className="flex flex-col gap-2">
        {/* Row 1: Title + stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
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
            <ImageIcon className="w-4 h-4 text-accent flex-shrink-0" />
            <CardTitle className="text-sm font-semibold truncate">
              Gallery
              {currentFolderName && (
                <span className="text-muted-foreground font-normal"> / {currentFolderName}</span>
              )}
            </CardTitle>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`text-[10px] cursor-help whitespace-nowrap flex-shrink-0 ${
                    totalDatabaseCount >= IMAGE_LIMIT
                      ? 'bg-destructive/20 border-destructive text-destructive'
                      : totalDatabaseCount >= IMAGE_WARNING_THRESHOLD
                        ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400'
                        : ''
                  }`}
                >
                  {totalDatabaseCount}/{IMAGE_LIMIT} images
                  <span className="mx-1 opacity-40">|</span>
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

        {/* Row 2: Toolbar — all controls in one compact row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Source filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs px-2">
                <Filter className="w-3 h-3" />
                <span>{activeSource.icon} {activeSource.label}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {SOURCE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value || 'all'}
                  onClick={() => onSourceFilterChange(option.value)}
                  className={sourceFilter === option.value ? 'bg-accent/20 text-accent' : ''}
                >
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs px-2">
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-50" />
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

          {/* Spacer pushes remaining controls right */}
          <div className="flex-1" />

          {/* Grid Size Controls */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant={gridSize === 'small' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('small')}
              className="rounded-none h-7 px-1.5"
              title="Small grid"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={gridSize === 'medium' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('medium')}
              className="rounded-none h-7 px-1.5 border-x border-border"
              title="Medium grid"
            >
              <Grid2x2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant={gridSize === 'large' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onGridSizeChange('large')}
              className="rounded-none h-7 px-1.5"
              title="Large grid"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Aspect Ratio Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border h-7">
                  <Square className="w-3 h-3 text-muted-foreground" />
                  <Switch
                    checked={useNativeAspectRatio}
                    onCheckedChange={onAspectRatioChange}
                    className="scale-[0.65] data-[state=checked]:bg-accent"
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
                  variant="outline"
                  size="sm"
                  onClick={() => onShowPromptsChange(!showPrompts)}
                  className="h-7 px-1.5"
                >
                  {showPrompts ? (
                    <Eye className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showPrompts ? 'Hide prompts' : 'Show prompts'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Select dropdown */}
          <SelectDropdown
            visibleImageCount={visibleImageCount}
            selectedCount={selectedCount}
            onSelectRecent={onSelectRecent}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
          />

          {/* Search — inline next to select */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 w-full h-7 text-xs"
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
        className="gap-1 h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
      >
        {selectedCount} sel — Clear
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs px-2">
          Select
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
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
