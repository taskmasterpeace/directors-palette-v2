"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { getImageDimensions } from "@/features/shot-creator/helpers/short-creator.helper"
import { validateImageFile, resizeImage } from "@/features/shot-creator/helpers/image-resize.helper"
import { ShotCreatorReferenceImage } from "../types"
import { useShotCreatorStore } from "../store/shot-creator.store"
import { clipboardManager } from "@/utils/clipboard-manager"
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

export function useReferenceImageManager(maxImages: number = 3) {
    const { toast } = useToast()
    const { shotCreatorReferenceImages, setShotCreatorReferenceImages } = useShotCreatorStore()

    // Progressive disclosure logic
    const getVisibleSlots = () => {
        const filledSlots = shotCreatorReferenceImages.length
        if (filledSlots >= 9 && maxImages > 9) return maxImages
        if (filledSlots >= 6) return Math.min(9, maxImages)
        if (filledSlots >= 3) return Math.min(6, maxImages)
        return Math.min(3, maxImages)
    }
    const visibleSlots = getVisibleSlots()

    // Memory cleanup: Revoke ObjectURLs on unmount
    useEffect(() => {
        return () => {
            shotCreatorReferenceImages.forEach(img => {
                if (img.preview?.startsWith('blob:')) {
                    URL.revokeObjectURL(img.preview)
                }
            })
        }
    }, [shotCreatorReferenceImages])

    // Load + Save images in Supabase
    useEffect(() => {
        const loadImages = async () => {
            try {
                // const saved = ''; //TODO: get saved images from supabase
                // if (saved?.length) setShotCreatorReferenceImages(saved)
            } catch (err) {
                console.error("Failed to load reference images:", err)
                toast({ title: "Load Error", description: "Could not load saved reference images", variant: "destructive" })
            }
        }
        loadImages()
    }, [toast, setShotCreatorReferenceImages])

    useEffect(() => {
        const saveImages = async () => {
            try {
                if (shotCreatorReferenceImages.length > 0) {
                    //TODO: save images to supabase for save
                } else {
                    //TODO: clear images from supabase clear remove
                }
            } catch (err) {
                console.error("Failed to save reference images:", err)
                toast({ title: "Save Error", description: "Could not save reference images", variant: "destructive" })
            }
        }
        saveImages()
    }, [shotCreatorReferenceImages, toast])

    // Upload with validation and resize
    const handleShotCreatorImageUpload = async (file: File): Promise<void> => {
        try {
            // Step 1: Validate file
            const validation = validateImageFile(file)
            if (!validation.valid) {
                toast({
                    title: "Invalid Image",
                    description: validation.error,
                    variant: "destructive"
                })
                return
            }

            // Get dimensions before resize
            const dimensions = await getImageDimensions(file)

            // Step 2: Resize image (use detected aspect ratio)
            const resizedFile = await resizeImage(file, dimensions.aspectRatio)

            // Step 3: Create preview and add to state
            // Use a Promise to await the FileReader so callers can serialize properly
            const previewUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => {
                    if (e.target?.result) {
                        resolve(e.target.result as string)
                    } else {
                        reject(new Error('FileReader returned no result'))
                    }
                }
                reader.onerror = () => reject(new Error('FileReader failed'))
                reader.readAsDataURL(resizedFile)
            })

            const newImage: ShotCreatorReferenceImage = {
                id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                file: resizedFile,
                preview: previewUrl,
                tags: [],
                detectedAspectRatio: dimensions.aspectRatio
            }

            // Use callback form to avoid stale closure - always reads latest state
            setShotCreatorReferenceImages(prev => [...prev, newImage])
            toast({
                title: "Reference Image Added",
                description: `Added ${file.name} (${dimensions.aspectRatio})`
            })
        } catch (err) {
            console.error("Upload error:", err)
            toast({
                title: "Upload Failed",
                description: err instanceof Error ? err.message : "Failed to upload reference image",
                variant: "destructive"
            })
        }
    }

    // Paste
    const handlePasteImage = async (event?: React.MouseEvent) => {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
        }

        try {
            // Try to read image from clipboard first
            const imageDataURL = await clipboardManager.readImage()
            if (imageDataURL) {
                // Convert data URL to blob then to File
                const response = await fetch(imageDataURL)
                const blob = await response.blob()
                const mimeType = blob.type || 'image/png'
                const extension = mimeType.split('/')[1] || 'png'
                const file = new File([blob], `pasted-image.${extension}`, { type: mimeType })
                await handleShotCreatorImageUpload(file)
                return
            }

            // If no image, try text (might be image URL)
            try {
                const text = await clipboardManager.readText()
                if (text && (text.startsWith("http") || text.startsWith("data:image"))) {
                    const newImage: ShotCreatorReferenceImage = {
                        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        url: text,
                        preview: text,
                        tags: [],
                        detectedAspectRatio: "16:9",
                        file: undefined
                    }
                    setShotCreatorReferenceImages(prev => [...prev, newImage])
                    toast({ title: "Image Pasted", description: "Image URL pasted from clipboard" })
                    return
                }
            } catch (textError) {
                console.error("Text read error:", textError)
            }

            // No image or URL found
            toast({
                title: "No Image Found",
                description: "Clipboard does not contain an image or image URL",
                variant: "destructive"
            })
        } catch (err: unknown) {
            console.error("Paste error:", err)
            toast({
                title: "Paste Failed",
                description: err instanceof Error ? err.message : "Unable to paste image",
                variant: "destructive"
            })
        }
    }

    // Camera capture
    const handleCameraCapture = async () => {
        try {
            // Check if we're on a native platform
            if (!Capacitor.isNativePlatform()) {
                toast({
                    title: "Camera Not Available",
                    description: "Camera is only available on mobile devices",
                    variant: "destructive"
                })
                return
            }

            // Request photo from camera
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Uri,
                source: CameraSource.Camera
            })

            if (!photo.webPath) {
                throw new Error('No photo captured')
            }

            // Convert the photo to a File object
            const response = await fetch(photo.webPath)
            const blob = await response.blob()
            const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

            // Use existing upload handler
            await handleShotCreatorImageUpload(file)
        } catch (err: unknown) {
            // User cancelled or error occurred
            if (err instanceof Error && err.message === 'User cancelled photos app') {
                // User cancelled, don't show error
                return
            }
            console.error("Camera capture error:", err)
            toast({
                title: "Camera Error",
                description: err instanceof Error ? err.message : "Failed to capture photo from camera",
                variant: "destructive"
            })
        }
    }

    // Remove
    const removeShotCreatorImage = (id: string) => {
        setShotCreatorReferenceImages(prev => prev.filter((img) => img.id !== id))
        toast({ title: "Reference Removed", description: "Reference image removed" })
    }

    // Multi-file upload (for mobile selecting multiple from library)
    const handleMultipleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return

        const fileArray = Array.from(files)
        // Read current count from store directly to avoid stale closure
        const currentCount = useShotCreatorStore.getState().shotCreatorReferenceImages.length
        const remainingSlots = maxImages - currentCount
        const filesToUpload = fileArray.slice(0, remainingSlots)

        if (filesToUpload.length < fileArray.length) {
            toast({
                title: "Some Images Skipped",
                description: `Only ${remainingSlots} slot(s) available. ${fileArray.length - filesToUpload.length} image(s) skipped.`
            })
        }

        // Upload files sequentially - each awaits FileReader completion
        // and uses callback form of setState, so all images accumulate correctly
        for (const file of filesToUpload) {
            await handleShotCreatorImageUpload(file)
        }
    }

    return {
        visibleSlots,
        handleShotCreatorImageUpload,
        handleMultipleImageUpload,
        handlePasteImage,
        handleCameraCapture,
        removeShotCreatorImage
    }
}
