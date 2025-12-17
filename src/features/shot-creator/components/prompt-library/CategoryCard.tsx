'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { MoreVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react'

interface CategoryCardProps {
  id: string
  name: string
  icon: string
  promptCount: number
  isEditable?: boolean
  onClick: (categoryId: string) => void
  onEdit?: (id: string, updates: { name: string; icon: string }) => void
  onDelete?: (id: string) => void
}

export function CategoryCard({
  id,
  name,
  icon,
  promptCount,
  isEditable = false,
  onClick,
  onEdit,
  onDelete
}: CategoryCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editIcon, setEditIcon] = useState(icon)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(name)
    setEditIcon(icon)
    setIsEditOpen(true)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleteOpen(true)
  }

  const handleSaveEdit = () => {
    if (onEdit && editName.trim()) {
      onEdit(id, { name: editName.trim(), icon: editIcon })
    }
    setIsEditOpen(false)
  }

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(id)
    }
    setIsDeleteOpen(false)
  }

  return (
    <>
      <Card
        onClick={() => onClick(id)}
        className="bg-background border-border cursor-pointer transition-all hover:border-border hover:bg-card group relative"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <h4 className="font-medium text-white">{name}</h4>
                <p className="text-sm text-gray-400">{promptCount} prompts</p>
              </div>
            </div>
            {isEditable && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-red-400">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Icon (emoji)</label>
              <Input
                value={editIcon}
                onChange={(e) => setEditIcon(e.target.value)}
                placeholder="📁"
                className="w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete &quot;{name}&quot;?
            </p>
            {promptCount > 0 && (
              <p className="text-sm text-amber-400 mt-2">
                {promptCount} prompt{promptCount !== 1 ? 's' : ''} will be moved to the Custom category.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
