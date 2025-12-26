'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Trash2,
  X,
  FolderInput,
  CheckSquare,
} from 'lucide-react'
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

export interface BulkActionsToolbarProps {
  /** Number of selected items */
  selectedCount: number
  /** List of available folders for move action */
  folders?: FolderWithCount[]
  /** Callback when clear selection is clicked */
  onClearSelection: () => void
  /** Callback when download ZIP is clicked */
  onDownloadZip?: () => void
  /** Callback when move to folder is selected */
  onMoveToFolder?: (folderId: string | null) => void
  /** Callback when create folder is clicked */
  onCreateFolder?: () => void
  /** Callback when delete is confirmed */
  onDelete: () => void
  /** Optional className for additional styling */
  className?: string
  /** External control for delete confirmation dialog (for keyboard shortcuts) */
  deleteConfirmOpen?: boolean
  /** Callback when delete confirmation dialog state changes */
  onDeleteConfirmChange?: (open: boolean) => void
}

/**
 * Floating bulk actions toolbar that appears when items are selected.
 * Provides quick access to bulk operations: Download ZIP, Move to Folder, Delete.
 * Uses framer-motion for smooth enter/exit animations.
 * Mobile-responsive with condensed layout on smaller screens.
 */
export function BulkActionsToolbar({
  selectedCount,
  folders = [],
  onClearSelection,
  onDownloadZip,
  onMoveToFolder,
  onCreateFolder,
  onDelete,
  className = '',
  deleteConfirmOpen,
  onDeleteConfirmChange,
}: BulkActionsToolbarProps) {
  const [internalShowDeleteConfirm, setInternalShowDeleteConfirm] = useState(false)

  // Use external control if provided, otherwise use internal state
  const showDeleteConfirm = deleteConfirmOpen ?? internalShowDeleteConfirm
  const setShowDeleteConfirm = onDeleteConfirmChange ?? setInternalShowDeleteConfirm

  // Don't render if nothing is selected
  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1]
            }}
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${className}`}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg shadow-black/20">
              {/* Selection indicator */}
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                <Badge
                  variant="default"
                  className="bg-primary text-primary-foreground px-2.5 py-0.5 text-sm font-medium"
                >
                  {selectedCount} selected
                </Badge>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-border mx-1" />

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                {/* Download ZIP Button */}
                {onDownloadZip && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownloadZip}
                    className="h-8 px-3 rounded-full hover:bg-accent/50"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                )}

                {/* Move to Folder Dropdown */}
                {onMoveToFolder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-full hover:bg-accent/50"
                      >
                        <FolderInput className="w-4 h-4 mr-1.5" />
                        <span className="hidden sm:inline">Move</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="center"
                      side="top"
                      sideOffset={8}
                      className="bg-card border-border max-h-64 overflow-y-auto"
                    >
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

                      {(folders.length > 0 || onCreateFolder) && (
                        <DropdownMenuSeparator />
                      )}

                      {folders.map(folder => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => onMoveToFolder(folder.id)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 w-full">
                            {folder.color && (
                              <div
                                className="h-3 w-3 rounded-full border border-border flex-shrink-0"
                                style={{ backgroundColor: folder.color }}
                              />
                            )}
                            <span className="flex-1">{folder.name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({folder.imageCount})
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}

                      {folders.length === 0 && !onCreateFolder && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No folders created yet
                        </div>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 px-3 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>

                {/* Divider */}
                <div className="h-6 w-px bg-border mx-1" />

                {/* Clear Selection Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearSelection}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  aria-label="Clear selection"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} images?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. These images will be permanently deleted
              from your gallery and storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete()
                setShowDeleteConfirm(false)
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete {selectedCount} Images
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
