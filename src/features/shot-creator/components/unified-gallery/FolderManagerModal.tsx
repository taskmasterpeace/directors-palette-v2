'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { FOLDER_COLORS } from '../../types/folder.types'
import type { Folder } from '../../types/folder.types'

type FolderMode = 'create' | 'edit' | 'delete'

interface FolderManagerModalProps {
  mode: FolderMode | null
  folder?: Folder
  onClose: () => void
  onCreate: (name: string, color?: string) => Promise<{ success: boolean; error?: string }>
  onUpdate: (id: string, name: string, color?: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>
}

export function FolderManagerModal({
  mode,
  folder,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: FolderManagerModalProps) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when mode or folder changes
  useEffect(() => {
    if (mode === 'edit' && folder) {
      setName(folder.name)
      setSelectedColor(folder.color)
    } else if (mode === 'create') {
      setName('')
      setSelectedColor(undefined)
    }
  }, [mode, folder])

  const handleClose = () => {
    setName('')
    setSelectedColor(undefined)
    setIsSubmitting(false)
    onClose()
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a folder name',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      let result
      if (mode === 'create') {
        result = await onCreate(name.trim(), selectedColor)
      } else if (mode === 'edit' && folder) {
        result = await onUpdate(folder.id, name.trim(), selectedColor)
      } else {
        setIsSubmitting(false)
        return
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Folder ${mode === 'create' ? 'created' : 'updated'} successfully`,
        })
        handleClose()
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${mode} folder`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error(`Error ${mode}ing folder:`, error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!folder) return

    setIsSubmitting(true)

    try {
      const result = await onDelete(folder.id)

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Folder deleted. Images moved to Uncategorized.',
        })
        handleClose()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete folder',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete confirmation dialog
  if (mode === 'delete' && folder) {
    return (
      <AlertDialog open={true} onOpenChange={handleClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{folder.name}&quot;? Images in this folder will be moved to Uncategorized.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // Create/Edit dialog
  return (
    <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Folder' : 'Edit Folder'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new folder to organize your images.'
              : 'Update folder name and color.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Emoji Picker */}
          <div className="space-y-2">
            <Label>Icon (Optional)</Label>
            <div className="flex gap-2 flex-wrap">
              {/* No emoji option */}
              <button
                type="button"
                onClick={() => {
                  const currentName = name.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, '')
                  setName(currentName)
                }}
                className={`w-8 h-8 rounded-md border flex items-center justify-center transition-all ${!/^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(name)
                    ? 'border-primary ring-2 ring-primary bg-accent'
                    : 'border-border hover:bg-accent/50'
                  }`}
                title="No icon"
              >
                <span className="text-sm">Ø</span>
              </button>

              {/* Common Emojis */}
              {['📁', '📂', '❤️', '⭐', '🎬', '🎥', '📸', '🎨', '👤', '👥', '🏢', '🏠', '🌍', '💡', '🔥', '✨'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    // Remove existing emoji prefix if any
                    const cleanName = name.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, '')
                    setName(`${emoji} ${cleanName}`)
                  }}
                  className={`w-8 h-8 rounded-md border flex items-center justify-center text-lg transition-all ${name.startsWith(emoji)
                      ? 'border-primary ring-2 ring-primary bg-accent'
                      : 'border-border hover:bg-accent/50'
                    }`}
                  title="Select icon"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Folder Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name *</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Characters, Locations, Props"
              value={name.replace(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/, '')} // Display name without emoji
              onChange={(e) => {
                const currentEmoji = name.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]\s?/)?.[0] || ''
                setName(currentEmoji + e.target.value)
              }}
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Example: {name || 'Folder Name'}
            </p>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color (Optional)</Label>
            <div className="flex gap-2 flex-wrap">
              {/* No color option */}
              <button
                type="button"
                onClick={() => setSelectedColor(undefined)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === undefined
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-border hover:border-foreground'
                  }`}
                title="No color"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-transparent via-muted to-transparent border border-border" />
              </button>

              {/* Color options */}
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-border hover:border-foreground'
                    }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : mode === 'create'
                ? 'Create Folder'
                : 'Update Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
