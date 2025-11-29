'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Folder,
  FolderPlus,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import type { FolderWithCount } from '../../types/folder.types'
import { SPECIAL_FOLDERS } from '../../types/folder.types'

interface FolderSidebarProps {
  folders: FolderWithCount[]
  currentFolderId: string | null
  uncategorizedCount: number
  totalImages: number
  isLoading?: boolean
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function FolderSidebar({
  folders,
  currentFolderId,
  uncategorizedCount,
  totalImages,
  isLoading = false,
  onFolderSelect,
  onCreateFolder,
  collapsed = false,
  onToggleCollapse,
}: FolderSidebarProps) {
  const [_hoveredFolderId, _setHoveredFolderId] = useState<string | null>(null)

  const isAllImagesActive = currentFolderId === null
  const isUncategorizedActive = currentFolderId === SPECIAL_FOLDERS.UNCATEGORIZED

  return (
    <div
      className={cn(
        'h-full border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <h3 className="text-sm font-semibold text-foreground">Folders</h3>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Folder List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* All Images */}
            <button
              onClick={() => onFolderSelect(null)}
              onMouseEnter={() => _setHoveredFolderId(SPECIAL_FOLDERS.ALL)}
              onMouseLeave={() => _setHoveredFolderId(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isAllImagesActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={collapsed ? 'All Images' : undefined}
            >
              <ImageIcon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium">All Images</span>
                  <Badge
                    variant={isAllImagesActive ? 'secondary' : 'outline'}
                    className="ml-auto"
                  >
                    {totalImages}
                  </Badge>
                </>
              )}
            </button>

            {/* Uncategorized */}
            <button
              onClick={() => onFolderSelect(SPECIAL_FOLDERS.UNCATEGORIZED)}
              onMouseEnter={() => _setHoveredFolderId(SPECIAL_FOLDERS.UNCATEGORIZED)}
              onMouseLeave={() => _setHoveredFolderId(null)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isUncategorizedActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
              )}
              title={collapsed ? 'Uncategorized' : undefined}
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left font-medium">Uncategorized</span>
                  <Badge
                    variant={isUncategorizedActive ? 'secondary' : 'outline'}
                    className="ml-auto"
                  >
                    {uncategorizedCount}
                  </Badge>
                </>
              )}
            </button>

            {/* Divider */}
            {folders.length > 0 && (
              <div className="h-px bg-border my-2" />
            )}

            {/* User Folders */}
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {collapsed ? '...' : 'Loading folders...'}
              </div>
            ) : (
              folders.map((folder) => {
                const isActive = currentFolderId === folder.id

                return (
                  <button
                    key={folder.id}
                    onClick={() => onFolderSelect(folder.id)}
                    onMouseEnter={() => _setHoveredFolderId(folder.id)}
                    onMouseLeave={() => _setHoveredFolderId(null)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={collapsed ? folder.name : undefined}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {folder.color ? (
                        <div
                          className="h-4 w-4 rounded-full flex-shrink-0 border border-border"
                          style={{ backgroundColor: folder.color }}
                        />
                      ) : (
                        <Folder className="h-4 w-4 flex-shrink-0" />
                      )}
                      {!collapsed && (
                        <span className="flex-1 text-left truncate">
                          {folder.name}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <Badge
                        variant={isActive ? 'secondary' : 'outline'}
                        className="ml-auto"
                      >
                        {folder.imageCount}
                      </Badge>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>

        {/* Create Folder Button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={onCreateFolder}
            disabled={isLoading}
            title={collapsed ? 'Create folder' : undefined}
          >
            <FolderPlus className="h-4 w-4" />
            {!collapsed && <span className="ml-2">New Folder</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}
