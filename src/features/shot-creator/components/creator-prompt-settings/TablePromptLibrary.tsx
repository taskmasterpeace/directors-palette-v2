'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { clipboardManager } from '@/utils/clipboard-manager'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import '@/features/shot-creator/helpers/prompt-library-init'
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Star,
  StarOff,
  Hash,
  BookOpen,
  Check,
  Filter
} from 'lucide-react'
import { SavedPrompt, usePromptLibraryStore } from "../../store/prompt-library-store"
import { getClient } from "@/lib/db/client"
import { AddPromptDialog } from '../prompt-library/dialogs/AddPromptDialog'
import { logger } from '@/lib/logger'

interface TablePromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void
  showQuickAccess?: boolean
  className?: string
}

interface EditingCell {
  promptId: string
  field: 'title' | 'prompt' | 'tags'
  value: string
}

export function TablePromptLibrary({ onSelectPrompt, showQuickAccess = true, className }: TablePromptLibraryProps) {
  const { toast } = useToast()
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showOnlyQuickAccess, setShowOnlyQuickAccess] = useState(false)

  const {
    prompts,
    categories,
    searchQuery,
    addPrompt,
    updatePrompt,
    deletePrompt,
    toggleQuickAccess,
    setSearchQuery,
    loadUserPrompts,
    getPromptsByCategory
  } = usePromptLibraryStore()

  // Load user prompts on mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const supabase = await getClient()
        if (supabase) {
          const { data: { user }, error } = await supabase.auth.getUser()
          if (!error && user) {
            await loadUserPrompts(user.id)
          } else {
            await loadUserPrompts('guest')
          }
        } else {
          await loadUserPrompts('guest')
        }
      } catch (error) {
        logger.shotCreator.warn('Prompt Library: Failed to check auth status, working offline', { error: error instanceof Error ? error.message : String(error) })
        await loadUserPrompts('guest')
      }
    }
    loadPrompts()
  }, [loadUserPrompts])

  // Filter prompts based on current filters
  const filteredPrompts = useMemo(() => {
    let filtered = prompts

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.prompt.toLowerCase().includes(query) ||
        (Array.isArray(p.tags) ? p.tags : []).some(tag => tag.toLowerCase().includes(query)) ||
        p.reference?.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === filterCategory)
    }

    // Apply quick access filter
    if (showOnlyQuickAccess) {
      filtered = filtered.filter(p => p.isQuickAccess)
    }

    // Sort by usage count and creation date
    return filtered.sort((a, b) => {
      // First by usage count (descending)
      const usageDiff = b.usage.count - a.usage.count
      if (usageDiff !== 0) return usageDiff

      // Then by creation date (newest first)
      return new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    })
  }, [prompts, searchQuery, filterCategory, showOnlyQuickAccess])

  // Handle selecting/deselecting all prompts
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPrompts(new Set(filteredPrompts.map(p => p.id)))
    } else {
      setSelectedPrompts(new Set())
    }
  }

  // Handle selecting/deselecting individual prompt
  const handleSelectPrompt = (promptId: string, checked: boolean) => {
    const newSelected = new Set(selectedPrompts)
    if (checked) {
      newSelected.add(promptId)
    } else {
      newSelected.delete(promptId)
    }
    setSelectedPrompts(newSelected)
  }

  // Handle inline editing
  const handleEditStart = (promptId: string, field: 'title' | 'prompt' | 'tags', currentValue: string) => {
    setEditingCell({
      promptId,
      field,
      value: currentValue
    })
  }

  const handleEditSave = async () => {
    if (!editingCell) return

    const prompt = prompts.find(p => p.id === editingCell.promptId)
    if (!prompt) return

    const updates: Partial<SavedPrompt> = {}

    if (editingCell.field === 'title') {
      updates.title = editingCell.value
    } else if (editingCell.field === 'prompt') {
      updates.prompt = editingCell.value
    } else if (editingCell.field === 'tags') {
      updates.tags = editingCell.value.split(',').map(t => t.trim()).filter(t => t)
    }

    await updatePrompt(editingCell.promptId, updates)
    setEditingCell(null)

    toast({
      title: 'Success',
      description: 'Prompt updated successfully'
    })
  }

  const handleEditCancel = () => {
    setEditingCell(null)
  }

  // Handle bulk operations
  const handleBulkDelete = async () => {
    for (const promptId of selectedPrompts) {
      await deletePrompt(promptId)
    }
    setSelectedPrompts(new Set())
    setIsBulkDeleteOpen(false)

    toast({
      title: 'Success',
      description: `Deleted ${selectedPrompts.size} prompts`
    })
  }

  const handleBulkToggleQuickAccess = async () => {
    for (const promptId of selectedPrompts) {
      await toggleQuickAccess(promptId)
    }
    setSelectedPrompts(new Set())

    toast({
      title: 'Success',
      description: `Updated quick access for ${selectedPrompts.size} prompts`
    })
  }

  const handleBulkCategoryChange = async (categoryId: string) => {
    for (const promptId of selectedPrompts) {
      await updatePrompt(promptId, { categoryId })
    }
    setSelectedPrompts(new Set())

    toast({
      title: 'Success',
      description: `Moved ${selectedPrompts.size} prompts to new category`
    })
  }

  // Handle adding new prompt
  const handleAddPrompt = async (promptData: { title: string; prompt: string; categoryId: string; tags: string; isQuickAccess: boolean }) => {
    if (!promptData.title || !promptData.prompt) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      await addPrompt({
        title: promptData.title,
        prompt: promptData.prompt,
        categoryId: promptData.categoryId,
        tags: promptData.tags.split(',').map(t => t.trim()).filter(t => t),
        isQuickAccess: promptData.isQuickAccess,
        reference: `@${promptData.title.toLowerCase().replace(/\s+/g, '_')}`,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })

      toast({
        title: 'Success',
        description: 'Prompt added to library'
      })

      setIsAddPromptOpen(false)
    } catch (error) {
      logger.shotCreator.error('Failed to add prompt', { error: error instanceof Error ? error.message : String(error) })
      toast({
        title: 'Error',
        description: 'Failed to add prompt',
        variant: 'destructive'
      })
    }
  }

  // Handle copy prompt with @ replacement
  const processPromptReplacements = (prompt: string): string => {
    let processedPrompt = prompt

    const categoryMappings: Record<string, string> = {
      '@cinematic': 'cinematic',
      '@characters': 'characters',
      '@character': 'characters',
      '@lighting': 'lighting',
      '@environments': 'environments',
      '@environment': 'environments',
      '@location': 'environments',
      '@effects': 'effects',
      '@effect': 'effects',
      '@moods': 'moods',
      '@mood': 'moods',
      '@camera': 'camera',
      '@styles': 'styles',
      '@style': 'styles'
    }

    Object.entries(categoryMappings).forEach(([placeholder, categoryId]) => {
      const regex = new RegExp(placeholder.replace('@', '\\@'), 'gi')
      processedPrompt = processedPrompt.replace(regex, () => {
        const categoryPrompts = getPromptsByCategory(categoryId)
        if (categoryPrompts.length === 0) return placeholder

        const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)]
        const snippet = randomPrompt.prompt.split(',')[0].trim()
        return snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet
      })
    })

    return processedPrompt
  }

  const handleSelectPromptForUse = async (prompt: SavedPrompt) => {
    const processedPrompt = processPromptReplacements(prompt.prompt)
    if (onSelectPrompt) {
      onSelectPrompt(processedPrompt)
    }
    try {
      await clipboardManager.writeText(processedPrompt)
      toast({
        title: 'Copied',
        description: 'Prompt copied to clipboard'
      })
    } catch (error) {
      logger.shotCreator.error('Copy failed', { error: error instanceof Error ? error.message : String(error) })
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy prompt',
        variant: 'destructive'
      })
    }
  }

  // Get category info
  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category || { id: categoryId, name: 'Unknown', icon: '📁', color: 'gray' }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="bg-background/90 border-border flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              <Badge variant="outline" className="text-xs">
                {filteredPrompts.length} prompts
              </Badge>
              {selectedPrompts.size > 0 && (
                <Badge variant="secondary" className="text-xs bg-accent">
                  {selectedPrompts.size} selected
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddPromptOpen(true)}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Prompt
            </Button>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4">
          {/* Filters and Search */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border text-white placeholder-gray-400"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48 bg-card border-border">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id} className="text-white">
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showQuickAccess && (
              <Button
                variant={showOnlyQuickAccess ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyQuickAccess(!showOnlyQuickAccess)}
                className="whitespace-nowrap"
              >
                <Star className="w-4 h-4 mr-1" />
                Quick Access Only
              </Button>
            )}
          </div>

          {/* Bulk Operations Toolbar */}
          {selectedPrompts.size > 0 && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-card rounded-lg border border-border">
              <span className="text-sm text-white">
                {selectedPrompts.size} prompt{selectedPrompts.size !== 1 ? 's' : ''} selected:
              </span>

              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkToggleQuickAccess}
                className="text-white border-border"
              >
                <Star className="w-4 h-4 mr-1" />
                Toggle Quick Access
              </Button>

              <Select onValueChange={handleBulkCategoryChange}>
                <SelectTrigger className="w-40 bg-secondary border-border">
                  <SelectValue placeholder="Move to..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id} className="text-white">
                      <span className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPrompts(new Set())}
                className="text-gray-400"
              >
                Clear Selection
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border border-border bg-card/50 flex-1 overflow-x-auto overflow-y-auto">
            <Table className="w-full min-w-[1200px]">
              <TableHeader>
                <TableRow className="border-border hover:bg-secondary/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPrompts.size === filteredPrompts.length && filteredPrompts.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-border"
                    />
                  </TableHead>
                  <TableHead className="text-white w-[15%]">Title</TableHead>
                  <TableHead className="text-white w-[30%]">Prompt</TableHead>
                  <TableHead className="text-white w-[12%]">Category</TableHead>
                  <TableHead className="text-white w-[15%]">Tags</TableHead>
                  <TableHead className="text-white w-[8%] text-center">Usage</TableHead>
                  <TableHead className="text-white w-[8%] text-center">Quick</TableHead>
                  <TableHead className="text-white w-[12%] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrompts.map((prompt) => {
                  const isSelected = selectedPrompts.has(prompt.id)
                  const categoryInfo = getCategoryInfo(prompt.categoryId)

                  return (
                    <TableRow
                      key={prompt.id}
                      className={`border-border hover:bg-secondary/30 ${isSelected ? 'bg-secondary/50' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectPrompt(prompt.id, checked as boolean)}
                          className="border-border"
                        />
                      </TableCell>

                      <TableCell className="font-medium text-white">
                        {editingCell?.promptId === prompt.id && editingCell?.field === 'title' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              className="h-8 bg-secondary border-border text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSave()
                                if (e.key === 'Escape') handleEditCancel()
                              }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleEditSave} className="h-6 w-6 p-0">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => handleEditStart(prompt.id, 'title', prompt.title)}
                            title="Click to edit"
                          >
                            <span className="block truncate pr-2" title={prompt.title}>
                              {prompt.title}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-gray-300">
                        {editingCell?.promptId === prompt.id && editingCell?.field === 'prompt' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              className="h-8 bg-secondary border-border text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSave()
                                if (e.key === 'Escape') handleEditCancel()
                              }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleEditSave} className="h-6 w-6 p-0">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => handleEditStart(prompt.id, 'prompt', prompt.prompt)}
                            title={prompt.prompt}
                          >
                            <div className="max-w-[400px]">
                              <span className="block truncate pr-2" title={prompt.prompt}>
                                {prompt.prompt}
                              </span>
                            </div>
                            {prompt.prompt.includes('@') && (
                              <div className="text-xs text-accent mt-1 italic">
                                Contains @ placeholders
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs border-border text-foreground"
                        >
                          <span className="mr-1">{categoryInfo.icon}</span>
                          {categoryInfo.name}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {editingCell?.promptId === prompt.id && editingCell?.field === 'tags' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              className="h-8 bg-secondary border-border text-white"
                              autoFocus
                              placeholder="tag1, tag2, tag3"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditSave()
                                if (e.key === 'Escape') handleEditCancel()
                              }}
                            />
                            <Button size="sm" variant="ghost" onClick={handleEditSave} className="h-6 w-6 p-0">
                              <Check className="w-3 h-3 text-emerald-400" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() => handleEditStart(prompt.id, 'tags', (Array.isArray(prompt.tags) ? prompt.tags : []).join(', '))}
                            title="Click to edit tags"
                          >
                            {Array.isArray(prompt.tags) && prompt.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {prompt.tags.slice(0, 2).map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs bg-secondary text-muted-foreground">
                                    <Hash className="w-2 h-2 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                                {Array.isArray(prompt.tags) && prompt.tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{prompt.tags.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">No tags</span>
                            )}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">{prompt.usage.count}</span>
                      </TableCell>

                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleQuickAccess(prompt.id)}
                          className="h-8 w-8 p-0"
                        >
                          {prompt.isQuickAccess ? (
                            <Star className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSelectPromptForUse(prompt)}
                            className="h-7 px-2 text-xs bg-accent hover:bg-accent/90 text-white"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePrompt(prompt.id)}
                            className="h-7 w-7 p-0 text-primary hover:text-primary"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredPrompts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                {searchQuery || filterCategory !== 'all' || showOnlyQuickAccess ? (
                  <div>
                    <p>No prompts match your current filters</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterCategory('all')
                        setShowOnlyQuickAccess(false)
                      }}
                      className="mt-2 text-accent"
                    >
                      Clear filters
                    </Button>
                  </div>
                ) : (
                  <p>No prompts in your library yet. Add some to get started!</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Prompt Dialog */}
      <AddPromptDialog
        open={isAddPromptOpen}
        onOpenChange={setIsAddPromptOpen}
        categories={categories}
        onAdd={handleAddPrompt}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="bg-background border-border text-white">
          <DialogHeader>
            <DialogTitle>Delete Selected Prompts</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete {selectedPrompts.size} selected prompt{selectedPrompts.size !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedPrompts.size} Prompt{selectedPrompts.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}