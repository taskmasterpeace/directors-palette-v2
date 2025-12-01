import { Button } from '@/components/ui/button'
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
  ImageIcon
} from 'lucide-react'
import type { FolderWithCount } from '../../types/folder.types'

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
  dropdownOpen: boolean
  onDropdownChange: (open: boolean) => void
}

/**
 * Reusable image action menu component
 * Provides common actions for gallery images
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
  dropdownOpen,
  onDropdownChange
}: ImageActionMenuProps) {
  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={onDropdownChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="h-6 w-6 p-0 bg-slate-700/90 hover:bg-slate-600 border-slate-600"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3 w-3 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white" align="end">
        {/* Copy Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:bg-slate-700 cursor-pointer">
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-slate-800 border-slate-700 text-white">
            <DropdownMenuItem
              onClick={onCopyImage}
              className="hover:bg-slate-700 cursor-pointer"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCopyPrompt}
              className="hover:bg-slate-700 cursor-pointer"
            >
              <FileText className="mr-2 h-4 w-4" />
              Prompt
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Send to Submenu */}
        {onSendTo && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="hover:bg-slate-700 cursor-pointer">
              <Send className="mr-2 h-4 w-4" />
              Send to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-slate-800 border-slate-700 text-white">
              <DropdownMenuItem
                onClick={() => onSendTo('shot-creator')}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Shot Creator
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSendTo('shot-animator')}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Film className="mr-2 h-4 w-4" />
                Shot Animator
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSendTo('layout-annotation')}
                className="hover:bg-slate-700 cursor-pointer"
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
            <DropdownMenuSubTrigger className="hover:bg-slate-700 cursor-pointer">
              <Grid3x3 className="mr-2 h-4 w-4" />
              Extract Frames
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-slate-800 border-slate-700 text-white">
              {onExtractFrames && (
                <DropdownMenuItem
                  onClick={() => {
                    onExtractFrames()
                    onDropdownChange(false)
                  }}
                  className="hover:bg-slate-700 cursor-pointer hidden md:flex"
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
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  To Gallery
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator className="bg-slate-700" />

        {/* Download - standalone */}
        <DropdownMenuItem
          onClick={onDownload}
          className="hover:bg-slate-700 cursor-pointer"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>

        {/* Set/Edit Reference - standalone */}
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
            className="hover:bg-slate-700 cursor-pointer"
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

        {/* Add to Library - standalone */}
        {onAddToLibrary && (
          <DropdownMenuItem
            onClick={onAddToLibrary}
            className="hover:bg-slate-700 cursor-pointer"
          >
            <Library className="mr-2 h-4 w-4" />
            Add to Library
          </DropdownMenuItem>
        )}

        {/* Move to Folder Submenu */}
        {onMoveToFolder && folders.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="hover:bg-slate-700 cursor-pointer">
              <FolderInput className="mr-2 h-4 w-4" />
              Move to Folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="bg-slate-800 border-slate-700 text-white">
              <DropdownMenuItem
                onClick={() => onMoveToFolder(null)}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>Uncategorized</span>
                  {currentFolderId === null && <Check className="h-4 w-4 ml-2" />}
                </div>
              </DropdownMenuItem>

              {folders.length > 0 && <DropdownMenuSeparator className="bg-slate-700" />}

              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => onMoveToFolder(folder.id)}
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {folder.color && (
                        <div
                          className="h-3 w-3 rounded-full border border-slate-600"
                          style={{ backgroundColor: folder.color }}
                        />
                      )}
                      <span>{folder.name}</span>
                    </div>
                    {currentFolderId === folder.id && <Check className="h-4 w-4 ml-2" />}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuItem
          onClick={onDelete}
          className="hover:bg-red-700 cursor-pointer text-red-400"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
