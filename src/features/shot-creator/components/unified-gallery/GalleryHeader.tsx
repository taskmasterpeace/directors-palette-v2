'use client'

import { useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { FolderWithCount } from '../../types/folder.types'

interface GalleryHeaderProps {
  totalImages: number
  totalDatabaseCount: number
  totalCredits: number
  searchQuery: string
  selectedCount: number
  gridSize: GridSize
  currentFolderName?: string
  useNativeAspectRatio: boolean
  folders?: FolderWithCount[]
  onSearchChange: (query: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onGridSizeChange: (size: GridSize) => void
  onAspectRatioChange: (useNative: boolean) => void
  onOpenMobileMenu?: () => void
  onMoveToFolder?: (folderId: string | null) => void
  onCreateFolder?: () => void
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
  folders = [],
  onSearchChange,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onGridSizeChange,
  onAspectRatioChange,
  onOpenMobileMenu,
  onMoveToFolder,
  onCreateFolder,
  onBulkDownload
}: GalleryHeaderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
              <Badge className="bg-accent">
                {selectedCount} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
              >
                Clear
              </Button>
              {onMoveToFolder && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FolderInput className="w-4 h-4 mr-2" />
                      Move
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem
                      onClick={() => onMoveToFolder(null)}
                      className="cursor-pointer"
                    >
                      <span>Uncategorized</span>
                    </DropdownMenuItem>
                    {onCreateFolder && (
                      <DropdownMenuItem
                        onClick={onCreateFolder}
                        className="cursor-pointer text-primary"
                      >
                        <FolderInput className="w-4 h-4 mr-2" />
                        <span>Create new folder...</span>
                      </DropdownMenuItem>
                    )}
                    {(folders.length > 0 || onCreateFolder) && <DropdownMenuSeparator />}
                    {folders.map(folder => (
                      <DropdownMenuItem
                        key={folder.id}
                        onClick={() => onMoveToFolder(folder.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {folder.color && (
                            <div
                              className="h-3 w-3 rounded-full border border-border"
                              style={{ backgroundColor: folder.color }}
                            />
                          )}
                          <span>{folder.name}</span>
                          <span className="text-muted-foreground text-xs ml-auto">({folder.imageCount})</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {folders.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No folders created yet
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These images will be permanently deleted from your gallery and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected()
                setShowDeleteConfirm(false)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete {selectedCount} Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardHeader>
  )
}