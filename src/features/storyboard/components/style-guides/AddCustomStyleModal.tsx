'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, ImageIcon } from 'lucide-react'
import { useCustomStylesStore } from '@/features/shot-creator/store/custom-styles.store'

interface AddCustomStyleModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onStyleAdded?: (styleId: string) => void
}

export function AddCustomStyleModal({ open, onOpenChange, onStyleAdded }: AddCustomStyleModalProps) {
    const [name, setName] = useState('')
    const [imageData, setImageData] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { addCustomStyle } = useCustomStylesStore()

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) return

        const reader = new FileReader()
        reader.onload = (e) => {
            setImageData(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFileSelect(file)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleSave = () => {
        if (!name.trim() || !imageData) return

        const styleId = addCustomStyle({
            name: name.trim(),
            description: `Custom style: ${name.trim()}`,
            imagePath: imageData,
            stylePrompt: `in the ${name.trim()} style of the reference image`
        })

        // Reset and close
        setName('')
        setImageData(null)
        onOpenChange(false)
        onStyleAdded?.(styleId)
    }

    const handleClose = () => {
        setName('')
        setImageData(null)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Custom Style</DialogTitle>
                    <DialogDescription>
                        Upload a character sheet or reference image to create a reusable style.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label>Style Reference Image</Label>
                        <div
                            className={`
                                relative border-2 border-dashed rounded-lg p-6
                                transition-colors cursor-pointer
                                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                                ${imageData ? 'border-solid border-primary' : ''}
                            `}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imageData ? (
                                <div className="relative aspect-video">
                                    <img
                                        src={imageData}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                        <span className="text-white text-sm">Click to change</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Upload className="w-8 h-8 mb-2" />
                                    <p className="text-sm font-medium">Drop image here or click to upload</p>
                                    <p className="text-xs mt-1">PNG, JPG, WebP supported</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleFileSelect(file)
                                }}
                            />
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="style-name">Style Name</Label>
                        <Input
                            id="style-name"
                            placeholder="e.g., Anime, Watercolor, My Custom Style"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {name && (
                            <p className="text-xs text-muted-foreground">
                                Will use prompt: &ldquo;in the {name} style of the reference image&rdquo;
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || !imageData}
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Add Style
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
