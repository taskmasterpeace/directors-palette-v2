'use client'

import React, { useState, useRef } from 'react'
import { useShotCreatorSettings } from "../../hooks"
import { useCustomStylesStore, CustomStyle, AnyStyle } from "../../store/custom-styles.store"
import type { PresetStyleId } from '@/features/storyboard/types/storyboard.types'
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
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Palette, X, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { toast } from '@/hooks/use-toast'

interface StyleSelectorProps {
    compact?: boolean
}

const StyleSelector = ({ compact = false }: StyleSelectorProps) => {
    const { settings, updateSettings } = useShotCreatorSettings()
    const {
        addCustomStyle,
        deleteCustomStyle,
        hidePresetStyle,
        getAllStyles,
        getStyleById
    } = useCustomStylesStore()

    const selectedStyleId = settings.selectedStyle
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [styleToDelete, setStyleToDelete] = useState<AnyStyle | null>(null)

    // Form state for creating new style
    const [newStyleName, setNewStyleName] = useState('')
    const [newStyleDescription, setNewStyleDescription] = useState('')
    const [newStylePrompt, setNewStylePrompt] = useState('')
    const [newStyleImage, setNewStyleImage] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Get all visible styles
    const allStyles = getAllStyles()

    // Find current style (could be preset or custom)
    const currentStyle = selectedStyleId ? getStyleById(selectedStyleId) : undefined

    const handleStyleChange = (value: string) => {
        if (value === 'none') {
            updateSettings({ selectedStyle: null })
        } else if (value === 'create-new') {
            setCreateDialogOpen(true)
        } else {
            updateSettings({ selectedStyle: value })
        }
    }

    const clearStyle = () => {
        updateSettings({ selectedStyle: null })
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please select an image under 5MB',
                variant: 'destructive'
            })
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            setNewStyleImage(dataUrl)
        }
        reader.readAsDataURL(file)
    }

    const handleCreateStyle = () => {
        if (!newStyleName.trim()) {
            toast({
                title: 'Name required',
                description: 'Please enter a name for your style',
                variant: 'destructive'
            })
            return
        }

        if (!newStyleImage) {
            toast({
                title: 'Image required',
                description: 'Please upload a reference image for your style',
                variant: 'destructive'
            })
            return
        }

        const stylePrompt = newStylePrompt.trim() || `in the ${newStyleName} style of the reference image`

        const newId = addCustomStyle({
            name: newStyleName.trim(),
            description: newStyleDescription.trim() || 'Custom style',
            imagePath: newStyleImage,
            stylePrompt
        })

        // Select the new style
        updateSettings({ selectedStyle: newId })

        // Reset form
        setNewStyleName('')
        setNewStyleDescription('')
        setNewStylePrompt('')
        setNewStyleImage('')
        setCreateDialogOpen(false)

        toast({
            title: 'Style created',
            description: `"${newStyleName}" has been added to your styles`
        })
    }

    const openDeleteDialog = (style: AnyStyle, e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setStyleToDelete(style)
        setDeleteDialogOpen(true)
    }

    const handleDeleteStyle = () => {
        if (!styleToDelete) return

        const isCustom = 'isCustom' in styleToDelete && styleToDelete.isCustom
        const styleName = styleToDelete.name

        if (isCustom) {
            // Actually delete custom styles
            deleteCustomStyle(styleToDelete.id)
        } else {
            // Hide preset styles
            hidePresetStyle(styleToDelete.id as PresetStyleId)
        }

        // Clear selection if deleted style was selected
        if (selectedStyleId === styleToDelete.id) {
            updateSettings({ selectedStyle: null })
        }

        setDeleteDialogOpen(false)
        setStyleToDelete(null)

        toast({
            title: 'Style removed',
            description: `"${styleName}" has been removed from your styles`
        })
    }

    const isCustomStyle = (style: AnyStyle): style is CustomStyle => {
        return 'isCustom' in style && style.isCustom === true
    }

    // Compact mode: just the select, no label or clear button
    if (compact) {
        return (
            <>
                <Select
                    value={selectedStyleId || 'none'}
                    onValueChange={handleStyleChange}
                >
                    <SelectTrigger className="bg-card border-border text-white h-9 text-sm">
                        <SelectValue placeholder="No style">
                            {currentStyle ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-4 h-4 rounded overflow-hidden flex-shrink-0">
                                        {currentStyle.imagePath ? (
                                            currentStyle.imagePath.startsWith('data:') ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={currentStyle.imagePath}
                                                    alt={currentStyle.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Image
                                                    src={currentStyle.imagePath}
                                                    alt={currentStyle.name}
                                                    width={16}
                                                    height={16}
                                                    className="w-full h-full object-cover"
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <Palette className="w-2 h-2 text-zinc-500" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="truncate text-sm">{currentStyle.name}</span>
                                </div>
                            ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">
                            <span className="text-muted-foreground">No style</span>
                        </SelectItem>
                        <SelectItem value="create-new" className="text-amber-500">
                            <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Create New...</span>
                            </div>
                        </SelectItem>
                        {allStyles.length > 0 && <div className="h-px bg-border my-1" />}
                        {allStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                                        {style.imagePath ? (
                                            style.imagePath.startsWith('data:') ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={style.imagePath} alt={style.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Image src={style.imagePath} alt={style.name} width={20} height={20} className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <Palette className="w-3 h-3 text-zinc-500" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="truncate">{style.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Create Style Dialog - reuse from full mode */}
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Palette className="w-5 h-5 text-amber-500" />
                                Create Custom Style
                            </DialogTitle>
                            <DialogDescription>
                                Add your own style with a reference image
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Reference Image *</Label>
                                <div
                                    className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {newStyleImage ? (
                                        <div className="relative w-full aspect-video rounded overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={newStyleImage} alt="Style preview" className="w-full h-full object-cover" />
                                            <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); setNewStyleImage(''); }}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="py-8">
                                            <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                                            <p className="text-sm text-zinc-400">Click to upload image</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="style-name">Style Name *</Label>
                                <Input id="style-name" placeholder="e.g., Anime, Watercolor" value={newStyleName} onChange={(e) => setNewStyleName(e.target.value)} className="bg-zinc-800 border-zinc-700" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="style-prompt">Style Prompt <span className="text-xs text-muted-foreground">(optional)</span></Label>
                                <Textarea id="style-prompt" placeholder={`Default: "in the ${newStyleName || '[name]'} style"`} value={newStylePrompt} onChange={(e) => setNewStylePrompt(e.target.value)} className="bg-zinc-800 border-zinc-700 min-h-[60px]" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateStyle} className="bg-amber-500 text-black hover:bg-amber-600">
                                <Plus className="w-4 h-4 mr-2" />
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Style
                </Label>
                {selectedStyleId && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearStyle}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                    </Button>
                )}
            </div>
            <Select
                value={selectedStyleId || 'none'}
                onValueChange={handleStyleChange}
            >
                <SelectTrigger className="bg-card border-border text-white">
                    <SelectValue placeholder="No style selected">
                        {currentStyle ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0 relative">
                                    {currentStyle.imagePath ? (
                                        currentStyle.imagePath.startsWith('data:') ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={currentStyle.imagePath}
                                                alt={currentStyle.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Image
                                                src={currentStyle.imagePath}
                                                alt={currentStyle.name}
                                                width={20}
                                                height={20}
                                                className="w-full h-full object-cover"
                                            />
                                        )
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                            <Palette className="w-3 h-3 text-zinc-500" />
                                        </div>
                                    )}
                                </div>
                                <span>{currentStyle.name}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">No style</span>
                        )}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">
                        <span className="text-muted-foreground">No style</span>
                    </SelectItem>

                    {/* Create New Style Option */}
                    <SelectItem value="create-new" className="text-amber-500">
                        <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            <span>Create New Style...</span>
                        </div>
                    </SelectItem>

                    {/* Separator */}
                    {allStyles.length > 0 && (
                        <div className="h-px bg-border my-1" />
                    )}

                    {/* All Styles (Preset + Custom) */}
                    {allStyles.map((style) => (
                        <SelectItem key={style.id} value={style.id}>
                            <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-6 h-6 rounded overflow-hidden flex-shrink-0">
                                        {style.imagePath ? (
                                            style.imagePath.startsWith('data:') ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={style.imagePath}
                                                    alt={style.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Image
                                                    src={style.imagePath}
                                                    alt={style.name}
                                                    width={24}
                                                    height={24}
                                                    className="w-full h-full object-cover"
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <Palette className="w-3 h-3 text-zinc-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate">
                                            {style.name}
                                            {isCustomStyle(style) && (
                                                <span className="ml-1 text-xs text-amber-500">(custom)</span>
                                            )}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate">
                                            {style.description}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                    onClick={(e) => openDeleteDialog(style, e)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {currentStyle && currentStyle.stylePrompt && (
                <p className="text-xs text-muted-foreground">
                    Auto-injects: &quot;{currentStyle.stylePrompt}&quot;
                </p>
            )}

            {/* Create Style Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Palette className="w-5 h-5 text-amber-500" />
                            Create Custom Style
                        </DialogTitle>
                        <DialogDescription>
                            Add your own style with a reference image
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Style Image */}
                        <div className="space-y-2">
                            <Label>Reference Image *</Label>
                            <div
                                className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {newStyleImage ? (
                                    <div className="relative w-full aspect-video rounded overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={newStyleImage}
                                            alt="Style preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setNewStyleImage('')
                                            }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="py-8">
                                        <Upload className="w-8 h-8 mx-auto text-zinc-500 mb-2" />
                                        <p className="text-sm text-zinc-400">Click to upload image</p>
                                        <p className="text-xs text-zinc-500 mt-1">PNG, JPG, WebP up to 5MB</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Style Name */}
                        <div className="space-y-2">
                            <Label htmlFor="style-name">Style Name *</Label>
                            <Input
                                id="style-name"
                                placeholder="e.g., Anime, Watercolor, Vintage"
                                value={newStyleName}
                                onChange={(e) => setNewStyleName(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="style-desc">Description</Label>
                            <Input
                                id="style-desc"
                                placeholder="Brief description of the style"
                                value={newStyleDescription}
                                onChange={(e) => setNewStyleDescription(e.target.value)}
                                className="bg-zinc-800 border-zinc-700"
                            />
                        </div>

                        {/* Style Prompt */}
                        <div className="space-y-2">
                            <Label htmlFor="style-prompt">
                                Style Prompt
                                <span className="text-xs text-muted-foreground ml-2">(optional)</span>
                            </Label>
                            <Textarea
                                id="style-prompt"
                                placeholder={`Default: "in the ${newStyleName || '[style name]'} style of the reference image"`}
                                value={newStylePrompt}
                                onChange={(e) => setNewStylePrompt(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 min-h-[80px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                This text is appended to your prompt when this style is selected
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateStyle}
                            className="bg-amber-500 text-black hover:bg-amber-600"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Style
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Style?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {styleToDelete && (
                                <>
                                    Are you sure you want to remove &quot;{styleToDelete.name}&quot;?
                                    {!('isCustom' in styleToDelete && styleToDelete.isCustom) && (
                                        <span className="block mt-2 text-amber-500/80">
                                            This is a preset style. It will be hidden but can be restored later.
                                        </span>
                                    )}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteStyle}
                            className="bg-red-500 hover:bg-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default StyleSelector
