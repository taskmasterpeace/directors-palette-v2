'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Folder,
  FolderPlus,
  Image as ImageIcon,
  FolderOpen,
  X,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import type { FolderWithCount } from '../../types/folder.types'
import { SPECIAL_FOLDERS } from '../../types/folder.types'

interface MobileFolderMenuProps {
  open: boolean
  folders: FolderWithCount[]
  currentFolderId: string | null
  uncategorizedCount: number
  totalImages: number
  isLoading?: boolean
  onOpenChange: (open: boolean) => void
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
}

export function MobileFolderMenu({
  open,
  folders,
  currentFolderId,
  uncategorizedCount,
  totalImages,
  isLoading = false,
  onOpenChange,
  onFolderSelect,
  onCreateFolder,
}: MobileFolderMenuProps) {
  const isAllImagesActive = currentFolderId === null
  const isUncategorizedActive = currentFolderId === SPECIAL_FOLDERS.UNCATEGORIZED

  const handleFolderSelect = (folderId: string | null) => {
    onFolderSelect(folderId)
    onOpenChange(false) // Close menu after selection
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[80%] sm:w-[350px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle>Folders</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Folder List */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {/* All Images */}
              <button
                onClick={() => handleFolderSelect(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors',
                  isAllImagesActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <ImageIcon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">All Images</span>
                <Badge
                  variant={isAllImagesActive ? 'secondary' : 'outline'}
                  className="ml-auto"
                >
                  {totalImages}
                </Badge>
              </button>

              {/* Uncategorized */}
              <button
                onClick={() => handleFolderSelect(SPECIAL_FOLDERS.UNCATEGORIZED)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors',
                  isUncategorizedActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <FolderOpen className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">Uncategorized</span>
                <Badge
                  variant={isUncategorizedActive ? 'secondary' : 'outline'}
                  className="ml-auto"
                >
                  {uncategorizedCount}
                </Badge>
              </button>

              {/* Divider */}
              {folders.length > 0 && (
                <div className="h-px bg-border my-2" />
              )}

              {/* User Folders */}
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Loading folders...
                </div>
              ) : (
                folders.map((folder) => {
                  const isActive = currentFolderId === folder.id

                  return (
                    <button
                      key={folder.id}
                      onClick={() => handleFolderSelect(folder.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {folder.color ? (
                          <div
                            className="h-5 w-5 rounded-full flex-shrink-0 border border-border"
                            style={{ backgroundColor: folder.color }}
                          />
                        ) : (
                          <Folder className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="flex-1 text-left truncate font-medium">
                          {folder.name}
                        </span>
                      </div>
                      <Badge
                        variant={isActive ? 'secondary' : 'outline'}
                        className="ml-auto"
                      >
                        {folder.imageCount}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Create Folder Button */}
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                onOpenChange(false)
                onCreateFolder()
              }}
              disabled={isLoading}
            >
              <FolderPlus className="h-5 w-5 mr-2" />
              <span>New Folder</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
