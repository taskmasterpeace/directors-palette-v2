'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useState, useRef } from 'react'
import { toast } from '@/hooks/use-toast'
import { getClient } from '@/lib/db/client'
import { useUnifiedGalleryStore } from '@/features/shot-creator/store/unified-gallery-store'

interface CharacterReferenceUploadProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    entityTag: string
    entityName: string
    entityType?: 'character' | 'location' | 'prop' // Optional - for future use
}

/**
 * Modal for uploading a reference image and auto-tagging it with entity @tag
 */
export function CharacterReferenceUpload({
    open,
    onOpenChange,
    entityTag,
    entityName,
    entityType: _entityType
}: CharacterReferenceUploadProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid File',
                description: 'Please select an image file',
                variant: 'destructive'
            })
            return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'File Too Large',
                description: 'Please select an image under 10MB',
                variant: 'destructive'
            })
            return
        }

        setSelectedFile(file)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setIsUploading(true)
        try {
            const normalizedTag = entityTag.startsWith('@') ? entityTag : `@${entityTag}`

            // Get Supabase client
            const supabase = await getClient()
            if (!supabase) {
                throw new Error('Database connection not available')
            }

            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (authError || !user) {
                throw new Error('User not authenticated')
            }

            // Generate unique filename
            const fileExt = selectedFile.name.split('.').pop() || 'jpg'
            const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
            const storagePath = `generations/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('directors-palette')
                .upload(storagePath, selectedFile, {
                    contentType: selectedFile.type,
                    upsert: false
                })

            if (uploadError) {
                throw new Error(`Upload failed: ${uploadError.message}`)
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('directors-palette')
                .getPublicUrl(storagePath)

            // Insert into gallery table
            const predictionId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const { error: insertError } = await supabase
                .from('gallery')
                .insert({
                    user_id: user.id,
                    prediction_id: predictionId,
                    generation_type: 'image',
                    public_url: publicUrl,
                    storage_path: storagePath,
                    file_size: selectedFile.size,
                    metadata: {
                        reference: normalizedTag,
                        prompt: `Reference image for ${entityName}`,
                        model: 'uploaded',
                        uploaded: true,
                        uploadedAt: new Date().toISOString()
                    }
                })
                .select()
                .single()

            if (insertError) {
                // Clean up storage if database insert fails
                await supabase.storage.from('directors-palette').remove([storagePath])
                throw new Error(`Database insert failed: ${insertError.message}`)
            }

            // Add to local store
            const addImage = useUnifiedGalleryStore.getState().addImage
            addImage({
                url: publicUrl,
                prompt: `Reference image for ${entityName}`,
                source: 'shot-creator',
                model: 'uploaded',
                reference: normalizedTag,
                settings: {
                    aspectRatio: '1:1',
                    resolution: '1024x1024'
                },
                tags: [],
                creditsUsed: 0,
                timestamp: Date.now(),
                status: 'completed',
                persistence: {
                    isPermanent: true,
                    storagePath: storagePath,
                    fileSize: selectedFile.size,
                    downloadedAt: new Date().toISOString()
                }
            })

            toast({
                title: 'Upload Complete',
                description: `Reference image uploaded and tagged as ${normalizedTag}`,
            })

            onOpenChange(false)
            setPreviewUrl(null)
            setSelectedFile(null)
        } catch (error) {
            console.error('Error uploading reference:', error)
            toast({
                title: 'Upload Failed',
                description: error instanceof Error ? error.message : 'Unknown error',
                variant: 'destructive'
            })
        } finally {
            setIsUploading(false)
        }
    }

    const handleCancel = () => {
        onOpenChange(false)
        setPreviewUrl(null)
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleCancel}>
            <DialogContent className="max-w-md bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Upload Reference for {entityName}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Upload an image that will be automatically tagged as{' '}
                        <code className="text-xs bg-card px-2 py-0.5 rounded text-emerald-400">
                            @{entityTag}
                        </code>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {/* File Input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Preview or Upload Area */}
                    {previewUrl ? (
                        <div className="space-y-3">
                            <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-border">
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                Choose Different Image
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-border transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-muted-foreground mb-1">Click to select an image</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                        <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isUploading ? (
                                <>
                                    <LoadingSpinner size="sm" color="current" className="mr-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload & Tag
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
