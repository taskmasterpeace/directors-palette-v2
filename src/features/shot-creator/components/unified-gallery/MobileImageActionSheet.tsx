'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  ArrowLeft,
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
  Copy,
} from 'lucide-react'
import { cn } from '@/utils/utils'
import type { FolderWithCount } from '../../types/folder.types'

type MenuView = 'main' | 'copy' | 'sendTo' | 'extractFrames' | 'moveToFolder'

interface MobileImageActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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
}

export function MobileImageActionSheet({
  open,
  onOpenChange,
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
}: MobileImageActionSheetProps) {
  const [currentView, setCurrentView] = useState<MenuView>('main')

  const handleClose = () => {
    onOpenChange(false)
    // Reset to main view after closing
    setTimeout(() => setCurrentView('main'), 300)
  }

  const handleAction = (action: () => void) => {
    action()
    handleClose()
  }

  const handleBack = () => {
    setCurrentView('main')
  }

  // Get title based on current view
  const getTitle = () => {
    switch (currentView) {
      case 'copy': return 'Copy'
      case 'sendTo': return 'Send to'
      case 'extractFrames': return 'Extract Frames'
      case 'moveToFolder': return 'Move to Folder'
      default: return 'Actions'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] p-0">
        <div className="flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {currentView !== 'main' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <SheetTitle className="text-white">{getTitle()}</SheetTitle>
            </div>
          </SheetHeader>

          {/* Content */}
          <ScrollArea className="max-h-[60vh]">
            <div className="p-2">
              {/* Main Menu */}
              {currentView === 'main' && (
                <div className="space-y-1">
                  {/* Copy */}
                  <MenuButton
                    icon={<Copy className="h-5 w-5" />}
                    label="Copy"
                    hasSubmenu
                    onClick={() => setCurrentView('copy')}
                  />

                  {/* Send to */}
                  {onSendTo && (
                    <MenuButton
                      icon={<Send className="h-5 w-5" />}
                      label="Send to"
                      hasSubmenu
                      onClick={() => setCurrentView('sendTo')}
                    />
                  )}

                  {/* Extract Frames */}
                  {(onExtractFrames || onExtractFramesToGallery) && (
                    <MenuButton
                      icon={<Grid3x3 className="h-5 w-5" />}
                      label="Extract Frames"
                      hasSubmenu
                      onClick={() => setCurrentView('extractFrames')}
                    />
                  )}

                  <div className="h-px bg-slate-700 my-2" />

                  {/* Download */}
                  <MenuButton
                    icon={<Download className="h-5 w-5" />}
                    label="Download"
                    onClick={() => handleAction(onDownload)}
                  />

                  {/* Set/Edit Reference */}
                  {(onSetReference || onEditReference) && (
                    <MenuButton
                      icon={currentReference ? <Edit className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                      label={currentReference ? `Edit Reference (${currentReference})` : 'Set Reference'}
                      onClick={() => {
                        handleClose()
                        setTimeout(() => {
                          if (currentReference && onEditReference) {
                            onEditReference()
                          } else if (onSetReference) {
                            onSetReference()
                          }
                        }, 50)
                      }}
                    />
                  )}

                  {/* Add to Library */}
                  {onAddToLibrary && (
                    <MenuButton
                      icon={<Library className="h-5 w-5" />}
                      label="Add to Library"
                      onClick={() => handleAction(onAddToLibrary)}
                    />
                  )}

                  {/* Move to Folder */}
                  {onMoveToFolder && (
                    <MenuButton
                      icon={<FolderInput className="h-5 w-5" />}
                      label="Move to Folder"
                      hasSubmenu
                      onClick={() => setCurrentView('moveToFolder')}
                    />
                  )}

                  <div className="h-px bg-slate-700 my-2" />

                  {/* Delete */}
                  <MenuButton
                    icon={<Trash2 className="h-5 w-5" />}
                    label="Delete Image"
                    destructive
                    onClick={() => handleAction(onDelete)}
                  />
                </div>
              )}

              {/* Copy Submenu */}
              {currentView === 'copy' && (
                <div className="space-y-1">
                  <MenuButton
                    icon={<ImageIcon className="h-5 w-5" />}
                    label="Copy Image"
                    onClick={() => handleAction(onCopyImage)}
                  />
                  <MenuButton
                    icon={<FileText className="h-5 w-5" />}
                    label="Copy Prompt"
                    onClick={() => handleAction(onCopyPrompt)}
                  />
                </div>
              )}

              {/* Send To Submenu */}
              {currentView === 'sendTo' && onSendTo && (
                <div className="space-y-1">
                  <MenuButton
                    icon={<Sparkles className="h-5 w-5" />}
                    label="Shot Creator"
                    onClick={() => handleAction(() => onSendTo('shot-creator'))}
                  />
                  <MenuButton
                    icon={<Film className="h-5 w-5" />}
                    label="Shot Animator"
                    onClick={() => handleAction(() => onSendTo('shot-animator'))}
                  />
                  <MenuButton
                    icon={<Layout className="h-5 w-5" />}
                    label="Layout"
                    onClick={() => handleAction(() => onSendTo('layout-annotation'))}
                  />
                </div>
              )}

              {/* Extract Frames Submenu */}
              {currentView === 'extractFrames' && (
                <div className="space-y-1">
                  {onExtractFrames && (
                    <MenuButton
                      icon={<Download className="h-5 w-5" />}
                      label="Download Frames"
                      onClick={() => handleAction(onExtractFrames)}
                    />
                  )}
                  {onExtractFramesToGallery && (
                    <MenuButton
                      icon={<ImagePlus className="h-5 w-5" />}
                      label="Extract to Gallery"
                      onClick={() => handleAction(onExtractFramesToGallery)}
                    />
                  )}
                </div>
              )}

              {/* Move to Folder Submenu */}
              {currentView === 'moveToFolder' && onMoveToFolder && (
                <div className="space-y-1">
                  <MenuButton
                    icon={<FolderInput className="h-5 w-5" />}
                    label="Uncategorized"
                    isSelected={currentFolderId === null}
                    onClick={() => handleAction(() => onMoveToFolder(null))}
                  />

                  {folders.length > 0 && <div className="h-px bg-slate-700 my-2" />}

                  {folders.map((folder) => (
                    <MenuButton
                      key={folder.id}
                      icon={
                        folder.color ? (
                          <div
                            className="h-5 w-5 rounded-full border border-slate-600"
                            style={{ backgroundColor: folder.color }}
                          />
                        ) : (
                          <FolderInput className="h-5 w-5" />
                        )
                      }
                      label={folder.name}
                      isSelected={currentFolderId === folder.id}
                      onClick={() => handleAction(() => onMoveToFolder(folder.id))}
                    />
                  ))}

                  {folders.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-400 text-center">
                      No folders created yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Reusable menu button component
interface MenuButtonProps {
  icon: React.ReactNode
  label: string
  hasSubmenu?: boolean
  destructive?: boolean
  isSelected?: boolean
  onClick: () => void
}

function MenuButton({ icon, label, hasSubmenu, destructive, isSelected, onClick }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-colors min-h-[48px]',
        destructive
          ? 'text-red-400 hover:bg-red-900/30'
          : 'text-white hover:bg-slate-700'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left font-medium">{label}</span>
      {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
      {hasSubmenu && !isSelected && (
        <ArrowLeft className="h-4 w-4 flex-shrink-0 rotate-180 text-slate-400" />
      )}
    </button>
  )
}
