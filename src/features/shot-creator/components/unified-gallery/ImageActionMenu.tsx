'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  Copy,
  Download,
  Trash2,
  Tag,
  Library,
  FileText,
  Film,
  Layout,
  Sparkles,
  Edit,
  FolderInput,
  Check,
  Grid3x3,
  ImagePlus,
  Send,
  ImageIcon,
  Eraser,
} from 'lucide-react'
import type { FolderWithCount } from '../../types/folder.types'
import { MobileImageActionSheet } from './MobileImageActionSheet'

interface ImageActionMenuProps {
  imageUrl: string
  prompt?: string
  currentReference?: string
  currentFolderId?: string | null
  folders?: FolderWithCount[]
  onCopyPrompt: () => void
  onCopyImage: () => void
  onDownload: () => void
  onDelete: () => void
  onSendTo?: (target: string) => void
  onSetReference?: () => void
  onEditReference?: () => void
  onExtractFrames?: () => void
  onExtractFramesToGallery?: () => void
  onAddToLibrary?: () => void
  onMoveToFolder?: (folderId: string | null) => void
  onRemoveBackground?: () => void
  isRemovingBackground?: boolean
  dropdownOpen: boolean
  onDropdownChange: (open: boolean) => void
}

/**
 * Reusable image action menu component
 * Provides common actions for gallery images
 * Mobile: Uses bottom sheet with drill-down navigation
 * Desktop: Uses dropdown with nested submenus
 */
export function ImageActionMenu({
  currentReference,
  currentFolderId,
  folders = [],
  onCopyPrompt,
  onCopyImage,
  onDownload,
  onDelete,
  onSendTo,
  onSetReference,
  onEditReference,
  onExtractFrames,
  onExtractFramesToGallery,
  onAddToLibrary,
  onMoveToFolder,
  onRemoveBackground,
  isRemovingBackground,
  dropdownOpen,
  onDropdownChange
}: ImageActionMenuProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)

  return (
    <>
      {/* Mobile: Button that opens bottom sheet */}
      <Button
        size="icon"
        variant="secondary"
        className="md:hidden h-6 w-6 p-0 bg-secondary/90 hover:bg-muted border-border"
        onClick={(e) => {
          e.stopPropagation()
          setMobileSheetOpen(true)
        }}
        aria-label="Image actions menu"
        title="Image actions"
      >
        <MoreVertical className="h-3 w-3 text-white" />
      </Button>

      {/* Mobile Sheet */}
      <MobileImageActionSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        currentReference={currentReference}
        currentFolderId={currentFolderId}
        folders={folders}
        onCopyPrompt={onCopyPrompt}
        onCopyImage={onCopyImage}
        onDownload={onDownload}
        onDelete={onDelete}
        onSendTo={onSendTo}
        onSetReference={onSetReference}
        onEditReference={onEditReference}
        onExtractFrames={onExtractFrames}
        onExtractFramesToGallery={onExtractFramesToGallery}
        onAddToLibrary={onAddToLibrary}
        onMoveToFolder={onMoveToFolder}
        onRemoveBackground={onRemoveBackground}
        isRemovingBackground={isRemovingBackground}
      />

      {/* Desktop: Dropdown with nested submenus */}
      <DropdownMenu open={dropdownOpen} onOpenChange={onDropdownChange}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="hidden md:flex h-6 w-6 p-0 bg-secondary/90 hover:bg-muted border-border"
            onClick={(e) => e.stopPropagation()}
            aria-label="Image actions menu"
            title="Image actions"
          >
            <MoreVertical className="h-3 w-3 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border text-white" align="end">
          {/* Copy Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="hover:bg-secondary cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-card border-border text-white">
              <DropdownMenuItem
                onClick={onCopyImage}
                className="hover:bg-secondary cursor-pointer"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Image
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onCopyPrompt}
                className="hover:bg-secondary cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Prompt
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Send to Submenu */}
          {onSendTo && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="hover:bg-secondary cursor-pointer">
                <Send className="mr-2 h-4 w-4" />
                Send to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card border-border text-white">
                <DropdownMenuItem
                  onClick={() => onSendTo('shot-creator')}
                  className="hover:bg-secondary cursor-pointer"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Shot Creator
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSendTo('shot-animator')}
                  className="hover:bg-secondary cursor-pointer"
                >
                  <Film className="mr-2 h-4 w-4" />
                  Shot Animator
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSendTo('layout-annotation')}
                  className="hover:bg-secondary cursor-pointer"
                >
                  <Layout className="mr-2 h-4 w-4" />
                  Layout
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {/* Extract Frames Submenu */}
          {(onExtractFrames || onExtractFramesToGallery) && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="hover:bg-secondary cursor-pointer">
                <Grid3x3 className="mr-2 h-4 w-4" />
                Extract Frames
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card border-border text-white">
                {onExtractFrames && (
                  <DropdownMenuItem
                    onClick={() => {
                      onExtractFrames()
                      onDropdownChange(false)
                    }}
                    className="hover:bg-secondary cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                )}
                {onExtractFramesToGallery && (
                  <DropdownMenuItem
                    onClick={() => {
                      onExtractFramesToGallery()
                      onDropdownChange(false)
                    }}
                    className="hover:bg-secondary cursor-pointer"
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    To Gallery
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator className="bg-secondary" />

          {/* Download */}
          <DropdownMenuItem
            onClick={onDownload}
            className="hover:bg-secondary cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </DropdownMenuItem>

          {/* Remove Background */}
          {onRemoveBackground && (
            <DropdownMenuItem
              onClick={onRemoveBackground}
              disabled={isRemovingBackground}
              className="hover:bg-secondary cursor-pointer"
            >
              {isRemovingBackground ? (
                <>
                  <LoadingSpinner size="sm" color="current" className="mr-2" />
                  Removing...
                </>
              ) : (
                <>
                  <Eraser className="mr-2 h-4 w-4" />
                  Remove Background (3 pts)
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* Set/Edit Reference */}
          {(onSetReference || onEditReference) && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDropdownChange(false)
                setTimeout(() => {
                  if (currentReference && onEditReference) {
                    onEditReference()
                  } else if (onSetReference) {
                    onSetReference()
                  }
                }, 50)
              }}
              className="hover:bg-secondary cursor-pointer"
            >
              {currentReference ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Reference ({currentReference})
                </>
              ) : (
                <>
                  <Tag className="mr-2 h-4 w-4" />
                  Set Reference
                </>
              )}
            </DropdownMenuItem>
          )}

          {/* Add to Library */}
          {onAddToLibrary && (
            <DropdownMenuItem
              onClick={onAddToLibrary}
              className="hover:bg-secondary cursor-pointer"
            >
              <Library className="mr-2 h-4 w-4" />
              Add to Library
            </DropdownMenuItem>
          )}

          {/* Move to Folder Submenu */}
          {onMoveToFolder && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="hover:bg-secondary cursor-pointer">
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Folder
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card border-border text-white">
                <DropdownMenuItem
                  onClick={() => onMoveToFolder(null)}
                  className="hover:bg-secondary cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Uncategorized</span>
                    {currentFolderId === null && <Check className="h-4 w-4 ml-2" />}
                  </div>
                </DropdownMenuItem>

                {folders.length > 0 && <DropdownMenuSeparator className="bg-secondary" />}

                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => onMoveToFolder(folder.id)}
                    className="hover:bg-secondary cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {folder.color && (
                          <div
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: folder.color }}
                          />
                        )}
                        <span>{folder.name}</span>
                      </div>
                      {currentFolderId === folder.id && <Check className="h-4 w-4 ml-2" />}
                    </div>
                  </DropdownMenuItem>
                ))}

                {folders.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No folders created
                  </div>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator className="bg-secondary" />

          {/* Delete */}
          <DropdownMenuItem
            onClick={onDelete}
            className="hover:bg-primary/90 cursor-pointer text-primary"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
