"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, RefreshCw, Sparkles, Trash2, Copy, Pencil, Search, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { toast } from "sonner"
import { useRecipeStore } from "@/features/shot-creator/store/recipe.store"
import { useAuth } from "@/features/auth/hooks/useAuth"
import type { Recipe } from "@/features/shot-creator/types/recipe.types"
import { RecipeEditorDialog } from "./RecipeEditorDialog"

export function RecipesTab() {
    const { user } = useAuth()
    const {
        recipes,
        categories,
        isLoading,
        initialize,
        refreshRecipes,
        deleteRecipe,
        duplicateRecipe,
        updateRecipe,
        addRecipe,
    } = useRecipeStore()

    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [typeFilter, setTypeFilter] = useState<string>("all") // all, system, systemOnly, user
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    // Initialize recipe store
    useEffect(() => {
        if (user?.id) {
            initialize(user.id, true) // true = isAdmin
        }
    }, [user?.id, initialize])

    const handleRefresh = useCallback(async () => {
        await refreshRecipes()
        toast.success("Recipes refreshed")
    }, [refreshRecipes])

    const handleDelete = async (recipe: Recipe) => {
        if (!confirm(`Delete recipe "${recipe.name}"? This cannot be undone.`)) {
            return
        }

        setDeletingId(recipe.id)
        try {
            await deleteRecipe(recipe.id)
            toast.success(`Recipe "${recipe.name}" deleted`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete recipe")
        } finally {
            setDeletingId(null)
        }
    }

    const handleDuplicate = async (recipe: Recipe) => {
        setDuplicatingId(recipe.id)
        try {
            const newRecipe = await duplicateRecipe(recipe.id)
            if (newRecipe) {
                toast.success(`Recipe duplicated as "${newRecipe.name}"`)
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to duplicate recipe")
        } finally {
            setDuplicatingId(null)
        }
    }

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe)
        setEditDialogOpen(true)
    }

    const handleCreate = () => {
        setEditingRecipe(null) // null = create mode
        setEditDialogOpen(true)
    }

    const handleSaveEdit = async (updates: Partial<Recipe>) => {
        try {
            if (editingRecipe) {
                // Edit mode
                await updateRecipe(editingRecipe.id, updates)
                toast.success(`Recipe "${editingRecipe.name}" updated`)
            } else {
                // Create mode
                const newRecipe = await addRecipe({
                    name: updates.name || 'New Recipe',
                    description: updates.description,
                    recipeNote: updates.recipeNote,
                    stages: updates.stages || [{
                        id: 'stage_0',
                        order: 0,
                        type: 'generation',
                        template: '',
                        fields: [],
                        referenceImages: [],
                    }],
                    suggestedAspectRatio: updates.suggestedAspectRatio,
                    suggestedResolution: updates.suggestedResolution,
                    suggestedModel: updates.suggestedModel,
                    quickAccessLabel: updates.quickAccessLabel,
                    isQuickAccess: updates.isQuickAccess || false,
                    categoryId: updates.categoryId,
                    isSystem: updates.isSystem || false,
                    isSystemOnly: updates.isSystemOnly || false,
                })
                if (newRecipe) {
                    toast.success(`Recipe "${newRecipe.name}" created`)
                }
            }
            setEditDialogOpen(false)
            setEditingRecipe(null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save recipe")
        }
    }

    const toggleRowExpanded = (recipeId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev)
            if (next.has(recipeId)) {
                next.delete(recipeId)
            } else {
                next.add(recipeId)
            }
            return next
        })
    }

    // Filter recipes
    const filteredRecipes = recipes.filter(recipe => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!recipe.name.toLowerCase().includes(query) &&
                !recipe.description?.toLowerCase().includes(query)) {
                return false
            }
        }

        // Category filter
        if (categoryFilter !== "all" && recipe.categoryId !== categoryFilter) {
            return false
        }

        // Type filter
        if (typeFilter === "system" && !recipe.isSystem) return false
        if (typeFilter === "systemOnly" && !recipe.isSystemOnly) return false
        if (typeFilter === "user" && (recipe.isSystem || recipe.isSystemOnly)) return false

        return true
    })

    const getCategoryIcon = (categoryId: string | undefined): string => {
        if (!categoryId) return "📋"
        const category = categories.find(c => c.id === categoryId)
        return category?.icon || "📋"
    }

    const getCategoryName = (categoryId: string | undefined): string => {
        if (!categoryId) return "Uncategorized"
        const category = categories.find(c => c.id === categoryId)
        return category?.name || categoryId
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-white">Recipe Management</h2>
                    <Badge variant="secondary" className="ml-2">
                        {filteredRecipes.length} / {recipes.length}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Recipe
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-zinc-500" />
                    <Input
                        placeholder="Search recipes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-zinc-800 border-zinc-700"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-zinc-400 text-sm">Category:</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2">
                    <Label className="text-zinc-400 text-sm">Type:</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="systemOnly">System-Only</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Recipes Table */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">All Recipes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400 w-8"></TableHead>
                                <TableHead className="text-zinc-400">Name</TableHead>
                                <TableHead className="text-zinc-400">Category</TableHead>
                                <TableHead className="text-zinc-400">Stages</TableHead>
                                <TableHead className="text-zinc-400">Type</TableHead>
                                <TableHead className="text-zinc-400 w-32">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredRecipes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                        No recipes found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRecipes.map((recipe) => (
                                    <React.Fragment key={recipe.id}>
                                        <TableRow className="border-zinc-800">
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleRowExpanded(recipe.id)}
                                                    className="p-1 h-6 w-6"
                                                >
                                                    {expandedRows.has(recipe.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{recipe.name}</span>
                                                    {recipe.description && (
                                                        <span className="text-xs text-zinc-500 truncate max-w-[300px]">
                                                            {recipe.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-zinc-700">
                                                    {getCategoryIcon(recipe.categoryId)} {getCategoryName(recipe.categoryId)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-zinc-400">
                                                {recipe.stages.length} stage{recipe.stages.length !== 1 ? 's' : ''}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {recipe.isSystem && (
                                                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                                            System
                                                        </Badge>
                                                    )}
                                                    {recipe.isSystemOnly && (
                                                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                                            Hidden
                                                        </Badge>
                                                    )}
                                                    {!recipe.isSystem && !recipe.isSystemOnly && (
                                                        <Badge variant="secondary">
                                                            User
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(recipe)}
                                                        className="text-zinc-400 hover:text-white"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDuplicate(recipe)}
                                                        disabled={duplicatingId === recipe.id}
                                                        className="text-zinc-400 hover:text-white"
                                                    >
                                                        {duplicatingId === recipe.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(recipe)}
                                                        disabled={deletingId === recipe.id}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                    >
                                                        {deletingId === recipe.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(recipe.id) && (
                                            <TableRow key={`${recipe.id}-expanded`} className="border-zinc-800 bg-zinc-950">
                                                <TableCell colSpan={6} className="p-4">
                                                    <div className="space-y-4">
                                                        {/* Recipe Details */}
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-zinc-500">Aspect Ratio:</span>
                                                                <span className="text-white ml-2">{recipe.suggestedAspectRatio || 'Not set'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-zinc-500">Model:</span>
                                                                <span className="text-white ml-2">{recipe.suggestedModel || 'Default'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Stages Preview */}
                                                        <div className="space-y-2">
                                                            <span className="text-zinc-400 text-sm font-medium">Stages:</span>
                                                            {recipe.stages.map((stage, idx) => (
                                                                <div key={stage.id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-amber-400 text-sm font-medium">
                                                                            Stage {idx + 1}
                                                                        </span>
                                                                        {stage.fields && stage.fields.length > 0 && (
                                                                            <div className="flex gap-1">
                                                                                {stage.fields.map(field => (
                                                                                    <Badge key={field.id} variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                                                                                        {field.name}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono max-h-[100px] overflow-y-auto">
                                                                        {stage.template.slice(0, 300)}{stage.template.length > 300 ? '...' : ''}
                                                                    </pre>
                                                                    {stage.referenceImages && stage.referenceImages.length > 0 && (
                                                                        <div className="mt-2 text-xs text-zinc-500">
                                                                            {stage.referenceImages.length} reference image(s)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <RecipeEditorDialog
                recipe={editingRecipe}
                categories={categories}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSave={handleSaveEdit}
            />
        </div>
    )
}
