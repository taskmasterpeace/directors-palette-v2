'use client'

import { useEffect, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import Image from "next/image"
import { categories, suggestedTags } from "../constants"

interface CategorySelectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (category: string, tags: string[]) => void
    initialCategory?: Category
    initialTags?: string[]
    imageUrl?: string
}

export type Category = 'people' | 'places' | 'props' | 'unorganized'

export default function CategorySelectionDialog({
    open,
    onOpenChange,
    onSave,
    initialCategory,
    initialTags = [],
    imageUrl
}: CategorySelectionDialogProps) {
    const [category, setCategory] = useState<Category>(initialCategory || 'unorganized')
    const [tags, setTags] = useState<string[]>(initialTags)
    const [tagInput, setTagInput] = useState('')

    useEffect(() => {
        if (open) {
            setCategory(initialCategory || 'unorganized')
            setTags(initialTags)
            setTagInput('')
        } else {
            document.body.style.pointerEvents = ''
        }
        return () => {
            document.body.style.pointerEvents = ''
        }
    }, [open, initialCategory, initialTags])

    const handleAddTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()])
            setTagInput('')
        }
    }

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag))
    }

    const handleSave = () => {
        onSave(category, tags)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Save to Reference Library</DialogTitle>
                    <DialogDescription>
                        Choose a category and add tags to organize your generated image
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Image Preview */}
                    {imageUrl && (
                        <div className="flex justify-center">
                            <Image
                                src={imageUrl}
                                alt="Generated"
                                width={128}
                                height={128}
                                className="w-32 h-32 object-cover rounded-lg border"
                            />
                        </div>
                    )}

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={(value: Category) => setCategory(value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        <div>
                                            <div className="font-medium text-left">{cat.label}</div>
                                            <div className="text-xs text-muted-foreground">{cat.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Show selected category description */}
                        <div className="p-3 bg-muted rounded-md">
                            <p className="text-sm text-muted-foreground">
                                {categories.find(c => c.value === category)?.description}
                            </p>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label>Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Add a tag..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddTag()
                                    }
                                }}
                            />
                            <Button type="button" onClick={handleAddTag}>Add</Button>
                        </div>

                        {/* Current Tags */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map(tag => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="flex items-center gap-1"
                                >
                                    {tag}
                                    <span
                                        className="w-3 h-3 cursor-pointer hover:text-destructive flex items-center justify-center"
                                        onClick={() => handleRemoveTag(tag)}
                                    >
                                        <X className="w-3 h-3" />
                                    </span>
                                </Badge>
                            ))}
                        </div>

                        {/* Suggested Tags */}
                        <div className="mt-2">
                            <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                            <div className="flex flex-wrap gap-1">
                                {suggestedTags[category].map(tag => (
                                    <Badge
                                        key={tag}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-accent text-xs"
                                        onClick={() => {
                                            if (!tags.includes(tag)) {
                                                setTags([...tags, tag])
                                            }
                                        }}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        Save to Library
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}