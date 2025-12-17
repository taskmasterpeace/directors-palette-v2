"use client"

/**
 * TokenLibrary Component
 *
 * Displays all tokens grouped by category with CRUD operations.
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Camera,
  Users,
  Palette,
  Move,
  Volume2,
  Sparkles,
  Music,
  BookOpen,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { DraggableTokenCard } from './TokenCard'
import type {
  Token,
  TokenCategory,
  InclusionRule,
  TokenOption,
  TokenCategoryMeta,
} from '../types/prompt-template.types'

interface TokenLibraryProps {
  tokens: Token[]
  categories: TokenCategoryMeta[]
  onAddToken: (token: Token) => void
  onUpdateToken: (tokenId: string, updates: Partial<Token>) => void
  onDeleteToken: (tokenId: string) => void
}

// Category icons
const categoryIcons: Record<TokenCategory, React.ReactNode> = {
  cinematography: <Camera className="w-4 h-4" />,
  content: <Users className="w-4 h-4" />,
  visualLook: <Palette className="w-4 h-4" />,
  motion: <Move className="w-4 h-4" />,
  audio: <Volume2 className="w-4 h-4" />,
  style: <Sparkles className="w-4 h-4" />,
  musicLab: <Music className="w-4 h-4" />,
  storybook: <BookOpen className="w-4 h-4" />,
}

const categoryStyles: Record<TokenCategory, { text: string; bg: string; border: string }> = {
  cinematography: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  content: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  visualLook: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  motion: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  audio: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  style: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  musicLab: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  storybook: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
}

const INCLUSION_RULES: { value: InclusionRule; label: string; description: string }[] = [
  { value: 'always', label: 'Always', description: 'Always included in prompt' },
  { value: 'conditionalOnNoStyle', label: 'No Style', description: 'Only when no style is selected' },
  { value: 'separate', label: 'Separate', description: 'Handled separately (style)' },
  { value: 'additive', label: 'Additive', description: 'Appended for animation/audio' },
  { value: 'optional', label: 'Optional', description: 'User can toggle on/off' },
]

export function TokenLibrary({
  tokens,
  categories,
  onAddToken,
  onUpdateToken,
  onDeleteToken,
}: TokenLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<TokenCategory>>(
    new Set(['cinematography', 'content'])
  )
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<Token | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Group tokens by category
  const tokensByCategory = useMemo(() => {
    const filtered = searchQuery
      ? tokens.filter(t =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : tokens

    return categories.reduce((acc, cat) => {
      acc[cat.id] = filtered.filter(t => t.category === cat.id)
      return acc
    }, {} as Record<TokenCategory, Token[]>)
  }, [tokens, categories, searchQuery])

  const toggleCategory = (category: TokenCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const handleEditToken = (token: Token) => {
    setEditingToken({ ...token })
    setIsCreating(false)
    setEditDialogOpen(true)
  }

  const handleCreateToken = () => {
    const newToken: Token = {
      id: crypto.randomUUID(),
      name: '',
      label: '',
      category: 'content',
      inclusionRule: 'optional',
      placeholder: '',
      options: [],
      allowCustom: true,
    }
    setEditingToken(newToken)
    setIsCreating(true)
    setEditDialogOpen(true)
  }

  const handleSaveToken = () => {
    if (!editingToken) return

    // Validate
    if (!editingToken.name || !editingToken.label) {
      alert('Name and label are required')
      return
    }

    // Set placeholder if not set
    if (!editingToken.placeholder) {
      editingToken.placeholder = `{${editingToken.name}}`
    }

    if (isCreating) {
      onAddToken(editingToken)
    } else {
      onUpdateToken(editingToken.id, editingToken)
    }

    setEditDialogOpen(false)
    setEditingToken(null)
  }

  const handleDeleteToken = (tokenId: string) => {
    if (confirm('Are you sure you want to delete this token? It will be removed from all templates.')) {
      onDeleteToken(tokenId)
    }
  }

  const updateEditingToken = (updates: Partial<Token>) => {
    if (!editingToken) return
    setEditingToken({ ...editingToken, ...updates })
  }

  const addOption = () => {
    if (!editingToken) return
    const newOption: TokenOption = {
      value: '',
      label: '',
    }
    setEditingToken({
      ...editingToken,
      options: [...editingToken.options, newOption],
    })
  }

  const updateOption = (index: number, updates: Partial<TokenOption>) => {
    if (!editingToken) return
    const newOptions = [...editingToken.options]
    newOptions[index] = { ...newOptions[index], ...updates }
    setEditingToken({ ...editingToken, options: newOptions })
  }

  const removeOption = (index: number) => {
    if (!editingToken) return
    const newOptions = editingToken.options.filter((_, i) => i !== index)
    setEditingToken({ ...editingToken, options: newOptions })
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-sm font-semibold">Token Library</CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/50 text-amber-400 hover:bg-amber-500/10 hover:border-amber-400/60 transition-colors"
            onClick={handleCreateToken}
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Add Token
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-zinc-800 border-zinc-700 text-sm focus:border-amber-500/50 focus:ring-amber-500/20"
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-2">
            {categories.map((category) => {
              const categoryTokens = tokensByCategory[category.id] || []
              const isExpanded = expandedCategories.has(category.id)

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full py-2.5 hover:bg-zinc-800/50 rounded-lg px-3 -mx-2 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className={`${categoryStyles[category.id].text} ${categoryStyles[category.id].bg} p-1.5 rounded-md`}>
                        {categoryIcons[category.id]}
                      </span>
                      <span className="font-medium text-sm text-zinc-200">
                        {category.label}
                      </span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${categoryStyles[category.id].bg} ${categoryStyles[category.id].text} border ${categoryStyles[category.id].border}`}>
                        {categoryTokens.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1.5 mt-1 ml-6">
                    {categoryTokens.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-2">No tokens in this category</p>
                    ) : (
                      categoryTokens.map((token) => (
                        <DraggableTokenCard
                          key={token.id}
                          id={token.id}
                          token={token}
                          onEdit={() => handleEditToken(token)}
                          onDelete={() => handleDeleteToken(token.id)}
                        />
                      ))
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Edit/Create Token Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isCreating ? 'Create Token' : 'Edit Token'}
            </DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Add a new token to the library'
                : 'Modify token properties and options'}
            </DialogDescription>
          </DialogHeader>

          {editingToken && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="token-name">Internal Name</Label>
                  <Input
                    id="token-name"
                    value={editingToken.name}
                    onChange={(e) => updateEditingToken({ name: e.target.value })}
                    placeholder="e.g., shotSize"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-label">Display Label</Label>
                  <Input
                    id="token-label"
                    value={editingToken.label}
                    onChange={(e) => updateEditingToken({ label: e.target.value })}
                    placeholder="e.g., Shot Size"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              {/* Category & Rule */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={editingToken.category}
                    onValueChange={(v) => updateEditingToken({ category: v as TokenCategory })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <span className={categoryStyles[cat.id].text}>
                              {categoryIcons[cat.id]}
                            </span>
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inclusion Rule</Label>
                  <Select
                    value={editingToken.inclusionRule}
                    onValueChange={(v) => updateEditingToken({ inclusionRule: v as InclusionRule })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {INCLUSION_RULES.map((rule) => (
                        <SelectItem key={rule.value} value={rule.value}>
                          {rule.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Placeholder */}
              <div className="space-y-2">
                <Label htmlFor="token-placeholder">Placeholder</Label>
                <Input
                  id="token-placeholder"
                  value={editingToken.placeholder}
                  onChange={(e) => updateEditingToken({ placeholder: e.target.value })}
                  placeholder="{tokenName}"
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={addOption}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editingToken.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option.value}
                        onChange={(e) => updateOption(index, { value: e.target.value })}
                        placeholder="Value"
                        className="bg-zinc-800 border-zinc-700 h-8 text-xs flex-1"
                      />
                      <Input
                        value={option.label}
                        onChange={(e) => updateOption(index, { label: e.target.value })}
                        placeholder="Label"
                        className="bg-zinc-800 border-zinc-700 h-8 text-xs flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                        onClick={() => removeOption(index)}
                      >
                        <span className="text-lg">&times;</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingToken.allowCustom || false}
                    onChange={(e) => updateEditingToken({ allowCustom: e.target.checked })}
                    className="rounded border-zinc-600"
                  />
                  <span className="text-sm text-zinc-300">Allow Custom Input</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingToken.required || false}
                    onChange={(e) => updateEditingToken({ required: e.target.checked })}
                    className="rounded border-zinc-600"
                  />
                  <span className="text-sm text-zinc-300">Required</span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveToken}
              className="bg-amber-500 text-black hover:bg-amber-600"
            >
              {isCreating ? 'Create Token' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
