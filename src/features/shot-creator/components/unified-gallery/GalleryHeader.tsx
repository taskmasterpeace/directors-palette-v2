'use client'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImageIcon, Search, Trash2, Grid3x3, Grid2x2, Menu, FolderInput, Download, Square, RectangleHorizontal } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { GridSize } from '../../store/unified-gallery-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface GalleryHeaderProps {
  totalImages: number
  totalDatabaseCount: number
  totalCredits: number
  searchQuery: string
  selectedCount: number
  gridSize: GridSize
  currentFolderName?: string
  useNativeAspectRatio: boolean
  onSearchChange: (query: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onGridSizeChange: (size: GridSize) => void
  onAspectRatioChange: (useNative: boolean) => void
  onOpenMobileMenu?: () => void
  onBulkMoveToFolder?: () => void
  onBulkDownload?: () => void
}

export function GalleryHeader({
  totalImages,
  totalDatabaseCount,
  totalCredits,
  searchQuery,
  selectedCount,
  gridSize,
  currentFolderName,
  useNativeAspectRatio,
  onSearchChange,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onGridSizeChange,
  onAspectRatioChange,
  onOpenMobileMenu,
  onBulkMoveToFolder,
  onBulkDownload
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
            <ImageIcon className="w-5 h-5 text-blue-400" />
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
                  <Badge variant="outline" className="text-xs cursor-help">
                    {totalImages} / {totalDatabaseCount} images
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Showing {totalImages} of {totalDatabaseCount} total images in database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Aspect Ratio Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-700 bg-slate-800/50">
                    <Square className="w-3 h-3 text-slate-400" />
                    <Switch
                      checked={useNativeAspectRatio}
                      onCheckedChange={onAspectRatioChange}
                      className="scale-75 data-[state=checked]:bg-blue-600"
                    />
                    <RectangleHorizontal className="w-3 h-3 text-slate-400" />
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

          {/* Grid Size Controls */}
          <div className="flex items-center border border-slate-700 rounded-md overflow-hidden">
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
              className="rounded-none h-8 px-2 border-x border-slate-700"
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

          {/* Selection Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
          >
            Select All
          </Button>
          {selectedCount > 0 && (
            <>
              <Badge className="bg-blue-600">
                {selectedCount} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
              >
                Clear
              </Button>
              {onBulkMoveToFolder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkMoveToFolder}
                >
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to Folder
                </Button>
              )}
              {onBulkDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBulkDownload}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Download</span>
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </CardHeader>
  )
}