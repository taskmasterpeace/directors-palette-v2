'use client'

import { CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ImageIcon, Search, Trash2, Grid3x3, Grid2x2 } from 'lucide-react'
import { GridSize } from '../../store/unified-gallery-store'

interface GalleryHeaderProps {
  totalImages: number
  totalCredits: number
  searchQuery: string
  selectedCount: number
  gridSize: GridSize
  onSearchChange: (query: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
  onGridSizeChange: (size: GridSize) => void
}

export function GalleryHeader({
  totalImages,
  totalCredits,
  searchQuery,
  selectedCount,
  gridSize,
  onSearchChange,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onGridSizeChange
}: GalleryHeaderProps) {
  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-3">
        {/* Top row with title and stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-400" />
            <CardTitle>Unified Gallery</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {totalImages} images
            </Badge>
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