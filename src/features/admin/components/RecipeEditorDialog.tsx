"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Trash2, Upload, X } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import type { Recipe, RecipeCategory, RecipeField, RecipeStageType, RecipeToolId } from "@/features/shot-creator/types/recipe.types"
import { parseStageTemplate, RECIPE_TOOLS } from "@/features/shot-creator/types/recipe.types"
import { compressImage } from "@/utils/image-compression"

interface RecipeEditorDialogProps {
    recipe: Recipe | null
    categories: RecipeCategory[]
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (updates: Partial<Recipe>) => Promise<void>
}

interface EditableStage {
    id: string
    order: number
    type: RecipeStageType
    template: string
    toolId?: RecipeToolId
    fields: RecipeField[]
    referenceImages: { id: string; url: string; name: string }[]
}

export function RecipeEditorDialog({
    recipe,
    categories,
    open,
    onOpenChange,
    onSave,
}: RecipeEditorDialogProps) {
    const [saving, setSaving] = useState(false)
    const [activeStageTab, setActiveStageTab] = useState("0")

    // Form state
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [recipeNote, setRecipeNote] = useState("")
    const [categoryId, setCategoryId] = useState("")
    const [suggestedAspectRatio, setSuggestedAspectRatio] = useState("")
    const [suggestedModel, setSuggestedModel] = useState("")
    const [isSystem, setIsSystem] = useState(false)
    const [isSystemOnly, setIsSystemOnly] = useState(false)
    const [stages, setStages] = useState<EditableStage[]>([])
    const [uploadingStageIndex, setUploadingStageIndex] = useState<number | null>(null)

    // File input refs (one per stage)
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

    // Reset form when recipe changes or dialog opens
    useEffect(() => {
        if (recipe) {
            // Edit mode - populate form with existing recipe
            setName(recipe.name)
            setDescription(recipe.description || "")
            setRecipeNote(recipe.recipeNote || "")
            setCategoryId(recipe.categoryId || "")
            setSuggestedAspectRatio(recipe.suggestedAspectRatio || "")
            setSuggestedModel(recipe.suggestedModel || "")
            setIsSystem(recipe.isSystem || false)
            setIsSystemOnly(recipe.isSystemOnly || false)
            setStages(recipe.stages.map(s => ({
                id: s.id,
                order: s.order,
                type: s.type || 'generation',
                template: s.template,
                toolId: s.toolId,
                fields: s.fields || [],
                referenceImages: (s.referenceImages || []).map(img => ({
                    id: img.id,
                    url: img.url,
                    name: img.name || img.url.split('/').pop() || 'image'
                })),
            })))
            setActiveStageTab("0")
        } else if (open) {
            // Create mode - initialize empty form
            setName("")
            setDescription("")
            setRecipeNote("")
            setCategoryId("")
            setSuggestedAspectRatio("")
            setSuggestedModel("")
            setIsSystem(false)
            setIsSystemOnly(false)
            setStages([{
                id: `stage_0_${Date.now()}`,
                order: 0,
                type: 'generation',
                template: "",
                fields: [],
                referenceImages: [],
            }])
            setActiveStageTab("0")
        }
    }, [recipe, open])

    // Parse fields when template changes
    const updateStageTemplate = useCallback((stageIndex: number, template: string) => {
        setStages(prev => {
            const newStages = [...prev]
            const fields = parseStageTemplate(template, stageIndex)
            newStages[stageIndex] = {
                ...newStages[stageIndex],
                template,
                fields,
            }
            return newStages
        })
    }, [])

    // Update stage type (generation vs tool)
    const updateStageType = useCallback((stageIndex: number, type: RecipeStageType) => {
        setStages(prev => {
            const newStages = [...prev]
            newStages[stageIndex] = {
                ...newStages[stageIndex],
                type,
                // Clear toolId if switching to generation, set default if switching to tool
                toolId: type === 'tool' ? 'remove-background' : undefined,
                // Clear template and fields if switching to tool
                template: type === 'tool' ? '' : newStages[stageIndex].template,
                fields: type === 'tool' ? [] : newStages[stageIndex].fields,
            }
            return newStages
        })
    }, [])

    // Update stage toolId
    const updateStageToolId = useCallback((stageIndex: number, toolId: RecipeToolId) => {
        setStages(prev => {
            const newStages = [...prev]
            newStages[stageIndex] = {
                ...newStages[stageIndex],
                toolId,
            }
            return newStages
        })
    }, [])

    const addStage = useCallback(() => {
        const newStageIndex = stages.length
        setStages(prev => [...prev, {
            id: `stage_${newStageIndex}_${Date.now()}`,
            order: newStageIndex,
            type: 'generation',
            template: "",
            fields: [],
            referenceImages: [],
        }])
        setActiveStageTab(String(newStageIndex))
    }, [stages.length])

    const removeStage = useCallback((stageIndex: number) => {
        if (stages.length <= 1) {
            return // Don't remove the last stage
        }
        setStages(prev => {
            const newStages = prev.filter((_, i) => i !== stageIndex)
            // Re-order remaining stages
            return newStages.map((s, i) => ({ ...s, order: i }))
        })
        // Switch to previous tab if removing current
        if (activeStageTab === String(stageIndex)) {
            setActiveStageTab(String(Math.max(0, stageIndex - 1)))
        }
    }, [stages.length, activeStageTab])

    // Handle reference image upload for a stage
    const handleImageUpload = useCallback(async (stageIndex: number, file: File) => {
        setUploadingStageIndex(stageIndex)

        try {
            // Compress image before upload
            const compressedFile = await compressImage(file)

            const formData = new FormData()
            formData.append('file', compressedFile)

            const response = await fetch('/api/upload-file', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Failed to upload image')
            }

            const data = await response.json()
            const imageUrl = data.url
            const imageName = file.name

            // Add the image to the stage
            setStages(prev => {
                const newStages = [...prev]
                newStages[stageIndex] = {
                    ...newStages[stageIndex],
                    referenceImages: [
                        ...newStages[stageIndex].referenceImages,
                        {
                            id: `img_${Date.now()}`,
                            url: imageUrl,
                            name: imageName,
                        }
                    ],
                }
                return newStages
            })
        } catch (err) {
            console.error('Error uploading image:', err)
            alert('Upload failed. Try a smaller image.')
        } finally {
            setUploadingStageIndex(null)
        }
    }, [])

    // Handle file input change
    const handleFileChange = useCallback((stageIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            handleImageUpload(stageIndex, file)
        }
        // Reset the input so the same file can be selected again
        event.target.value = ''
    }, [handleImageUpload])

    // Trigger file input click
    const triggerFileUpload = useCallback((stageIndex: number) => {
        fileInputRefs.current[stageIndex]?.click()
    }, [])

    // Remove a reference image from a stage
    const removeReferenceImage = useCallback((stageIndex: number, imageId: string) => {
        setStages(prev => {
            const newStages = [...prev]
            newStages[stageIndex] = {
                ...newStages[stageIndex],
                referenceImages: newStages[stageIndex].referenceImages.filter(img => img.id !== imageId),
            }
            return newStages
        })
    }, [])

    const handleSave = async () => {
        console.log('[RecipeEditorDialog] handleSave called', { name, categoryId, stageCount: stages.length })

        if (!name.trim()) {
            console.warn('[RecipeEditorDialog] Save aborted: empty name')
            return
        }

        setSaving(true)
        try {
            const updates = {
                name: name.trim(),
                description: description.trim() || undefined,
                recipeNote: recipeNote.trim() || undefined,
                categoryId,
                suggestedAspectRatio: suggestedAspectRatio || undefined,
                suggestedModel: suggestedModel || undefined,
                isSystem,
                isSystemOnly,
                stages: stages.map((s, i) => ({
                    id: s.id,
                    order: i,
                    type: s.type,
                    template: s.template,
                    toolId: s.toolId,
                    fields: s.fields,
                    referenceImages: s.referenceImages,
                })),
            }

            console.log('[RecipeEditorDialog] Calling onSave with updates:', updates)
            await onSave(updates)
            console.log('[RecipeEditorDialog] onSave completed successfully')
        } catch (error) {
            console.error('[RecipeEditorDialog] Save failed:', error)
            // Re-throw so parent can handle
            throw error
        } finally {
            setSaving(false)
        }
    }

    const isCreateMode = !recipe

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white">{isCreateMode ? 'Create Recipe' : 'Edit Recipe'}</DialogTitle>
                    <DialogDescription>
                        {isCreateMode
                            ? 'Create a new recipe with stage templates. Fields are automatically extracted from templates.'
                            : 'Modify recipe settings and stage templates. Fields are automatically extracted from templates.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Recipe Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                                placeholder="My Recipe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            {cat.icon} {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 h-20"
                            placeholder="A short description of what this recipe does..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recipeNote">Recipe Note (shown to user)</Label>
                        <Textarea
                            id="recipeNote"
                            value={recipeNote}
                            onChange={(e) => setRecipeNote(e.target.value)}
                            className="bg-zinc-800 border-zinc-700 h-16"
                            placeholder="Tips or instructions for the user..."
                        />
                    </div>

                    {/* Settings Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="aspectRatio">Suggested Aspect Ratio</Label>
                            <Select value={suggestedAspectRatio || "none"} onValueChange={(v) => setSuggestedAspectRatio(v === "none" ? "" : v)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Not set" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    <SelectItem value="none">Not set</SelectItem>
                                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                    <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                    <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                                    <SelectItem value="4:3">4:3 (Classic)</SelectItem>
                                    <SelectItem value="3:4">3:4 (Portrait Classic)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">Suggested Model</Label>
                            <Select value={suggestedModel || "none"} onValueChange={(v) => setSuggestedModel(v === "none" ? "" : v)}>
                                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                    <SelectValue placeholder="Default" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                    <SelectItem value="none">Default</SelectItem>
                                    <SelectItem value="nano-banana">Nano Banana (fast)</SelectItem>
                                    <SelectItem value="nano-banana-pro">Nano Banana Pro (quality)</SelectItem>
                                    <SelectItem value="ideogram-v2">Ideogram v2 (text)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Flags */}
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="isSystem"
                                checked={isSystem}
                                onCheckedChange={(checked) => setIsSystem(checked === true)}
                            />
                            <Label htmlFor="isSystem" className="text-sm">
                                System Recipe
                                <span className="text-zinc-500 ml-1">(built-in)</span>
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="isSystemOnly"
                                checked={isSystemOnly}
                                onCheckedChange={(checked) => setIsSystemOnly(checked === true)}
                            />
                            <Label htmlFor="isSystemOnly" className="text-sm">
                                System-Only
                                <span className="text-zinc-500 ml-1">(hidden from users)</span>
                            </Label>
                        </div>
                    </div>

                    {/* Stages */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Stages ({stages.length})</Label>
                            <Button variant="outline" size="sm" onClick={addStage}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Stage
                            </Button>
                        </div>

                        <Tabs value={activeStageTab} onValueChange={setActiveStageTab}>
                            <TabsList className="bg-zinc-800 flex-wrap h-auto">
                                {stages.map((_, idx) => (
                                    <TabsTrigger
                                        key={idx}
                                        value={String(idx)}
                                        className="data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                                    >
                                        Stage {idx + 1}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {stages.map((stage, idx) => (
                                <TabsContent key={idx} value={String(idx)} className="mt-4">
                                    <div className="space-y-4 p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                                        {/* Stage Header */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-amber-400 font-medium">Stage {idx + 1}</span>
                                            {stages.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeStage(idx)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                    Remove
                                                </Button>
                                            )}
                                        </div>

                                        {/* Stage Type Selector */}
                                        <div className="space-y-2">
                                            <Label>Stage Type</Label>
                                            <Select
                                                value={stage.type}
                                                onValueChange={(value) => updateStageType(idx, value as RecipeStageType)}
                                            >
                                                <SelectTrigger className="bg-zinc-900 border-zinc-700 w-[200px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-800 border-zinc-700">
                                                    <SelectItem value="generation">🎨 Image Generation</SelectItem>
                                                    <SelectItem value="tool">🔧 Tool</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Tool Selection (only for tool stages) */}
                                        {stage.type === 'tool' && (
                                            <div className="space-y-2">
                                                <Label>Select Tool</Label>
                                                <Select
                                                    value={stage.toolId || 'remove-background'}
                                                    onValueChange={(value) => updateStageToolId(idx, value as RecipeToolId)}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700 w-[350px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-800 border-zinc-700">
                                                        {Object.values(RECIPE_TOOLS).map(tool => (
                                                            <SelectItem key={tool.id} value={tool.id}>
                                                                <span className="flex items-center gap-2">
                                                                    <span>{tool.icon} {tool.name}</span>
                                                                    <span className="text-zinc-500">({tool.cost} pts)</span>
                                                                    {tool.outputType === 'multi' && 'outputCount' in tool && (
                                                                        <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                                                            {tool.outputCount}x output
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {stage.toolId && RECIPE_TOOLS[stage.toolId] && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-zinc-500">
                                                            {RECIPE_TOOLS[stage.toolId].description}
                                                        </p>
                                                        {RECIPE_TOOLS[stage.toolId].outputType === 'multi' && 'outputCount' in RECIPE_TOOLS[stage.toolId] && (
                                                            <p className="text-xs text-amber-400">
                                                                This tool produces {(RECIPE_TOOLS[stage.toolId] as { outputCount: number }).outputCount} separate images as output
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Template (only for generation stages) */}
                                        {stage.type !== 'tool' && (
                                            <div className="space-y-2">
                                                <Label>Template</Label>
                                                <Textarea
                                                    value={stage.template}
                                                    onChange={(e) => updateStageTemplate(idx, e.target.value)}
                                                    className="bg-zinc-900 border-zinc-700 font-mono text-sm min-h-[200px]"
                                                    placeholder="Enter your prompt template here. Use <<FIELD_NAME:type!>> for required fields or <<FIELD_NAME:type>> for optional fields.

Example: A portrait of <<CHARACTER_NAME:name!>> in <<STYLE:text>> style."
                                                />
                                            </div>
                                        )}

                                        {/* Extracted Fields Preview (only for generation stages) */}
                                        {stage.type !== 'tool' && stage.fields && stage.fields.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-zinc-400">Detected Fields:</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {stage.fields.map(field => (
                                                        <Badge
                                                            key={field.id}
                                                            className={field.required
                                                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                                : "bg-zinc-700/50 text-zinc-400 border-zinc-600"
                                                            }
                                                        >
                                                            {field.name}
                                                            <span className="ml-1 text-xs opacity-60">({field.type})</span>
                                                            {field.required && <span className="ml-1 text-red-400">*</span>}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Reference Images */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-zinc-400">Reference Images:</Label>
                                                <div>
                                                    {/* Hidden file input */}
                                                    <input
                                                        ref={(el) => { fileInputRefs.current[idx] = el }}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleFileChange(idx, e)}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => triggerFileUpload(idx)}
                                                        disabled={uploadingStageIndex === idx}
                                                        className="text-xs"
                                                    >
                                                        {uploadingStageIndex === idx ? (
                                                            <>
                                                                <LoadingSpinner size="xs" color="current" className="mr-1" />
                                                                Uploading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-3 h-3 mr-1" />
                                                                Add Image
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                            {stage.referenceImages && stage.referenceImages.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {stage.referenceImages.map((img) => (
                                                        <div
                                                            key={img.id}
                                                            className="group relative flex items-center gap-2 bg-zinc-900 rounded px-2 py-1 border border-zinc-700"
                                                        >
                                                            {/* Thumbnail preview */}
                                                            {img.url && (
                                                                <img
                                                                    src={img.url}
                                                                    alt={img.name}
                                                                    className="w-8 h-8 object-cover rounded"
                                                                    onError={(e) => {
                                                                        console.error('[RecipeEditorDialog] Failed to load image:', {
                                                                            url: img.url,
                                                                            name: img.name,
                                                                            imageId: img.id,
                                                                        });
                                                                        // Show broken image indicator
                                                                        e.currentTarget.classList.add('opacity-30');
                                                                    }}
                                                                    onLoad={() => {
                                                                        console.log('[RecipeEditorDialog] Image loaded successfully:', img.url);
                                                                    }}
                                                                />
                                                            )}
                                                            <span className="text-xs text-zinc-400 max-w-[120px] truncate">
                                                                {img.name || img.url.split('/').pop()}
                                                            </span>
                                                            {/* Remove button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeReferenceImage(idx, img.id)}
                                                                className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                                                                title="Remove image"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-zinc-600">No reference images - click &quot;Add Image&quot; to upload</p>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="flex-col items-stretch gap-4">
                    {!name.trim() && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                            <p className="text-sm text-red-400">
                                ⚠ Recipe name is required to save
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving || !name.trim()}
                                            className="bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? (
                                                <>
                                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                                                    {isCreateMode ? 'Creating...' : 'Saving...'}
                                                </>
                                            ) : (
                                                isCreateMode ? 'Create Recipe' : 'Save Changes'
                                            )}
                                        </Button>
                                    </div>
                                </TooltipTrigger>
                                {(!name.trim() && !saving) && (
                                    <TooltipContent>
                                        <p>Recipe name is required</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
