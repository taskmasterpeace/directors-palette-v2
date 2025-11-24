'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ImageIcon,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Home
} from 'lucide-react'
import { cn } from '@/utils/utils'
import { useUnifiedGalleryStore, GeneratedImage } from '../../store/unified-gallery-store'
import { GalleryService } from '../../services/gallery.service'
import { ImageCard } from './ImageCard'
import FullscreenModal from './FullScreenModal'
import { useReferenceNamePrompt } from '@/components/providers/PromptProvider'
import Link from 'next/link'

type FilterTab = 'all' | 'tagged' | 'untagged'

const PAGE_SIZE = 24

export function ExpandedGallery() {
  const {
    images,
    loadImagesPaginated,
    removeImage,
    setFullscreenImage,
    fullscreenImage,
    updateImageReference
  } = useUnifiedGalleryStore()

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedImages, setSelectedImages] = useState<string[]>([])

  const showReferenceNamePrompt = useReferenceNamePrompt()

  // Load gallery images
  const loadGallery = useCallback(async (page: number) => {
    console.log(`[ExpandedGallery] Loading gallery page ${page}`)
    setIsLoading(true)
    try {
      const result = await GalleryService.loadUserGalleryPaginated(page, PAGE_SIZE)
      console.log(`[ExpandedGallery] Loaded ${result.images.length} images, total: ${result.total}, totalPages: ${result.totalPages}`)
      loadImagesPaginated(result.images, result.total, result.totalPages)
      setTotalPages(result.totalPages)
      setTotalItems(result.total)
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setIsLoading(false)
    }
  }, [loadImagesPaginated])

  // Initial load
  useEffect(() => {
    loadGallery(currentPage)
  }, [currentPage, loadGallery])

  // Filter images based on tab and search
  const filteredImages = images.filter(image => {
    // Filter by tab
    if (filterTab === 'tagged' && !image.reference) return false
    if (filterTab === 'untagged' && image.reference) return false

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        image.prompt.toLowerCase().includes(query) ||
        image.reference?.toLowerCase().includes(query) ||
        image.model.toLowerCase().includes(query)
      )
    }

    return true
  })

  const handlePageChange = (page: number) => {
    console.log(`[ExpandedGallery] Page change requested: ${page}, current: ${currentPage}, total: ${totalPages}`)
    setCurrentPage(page)
    setSelectedImages([]) // Clear selection when changing pages
  }

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImages(prev =>
      prev.includes(imageUrl)
        ? prev.filter(url => url !== imageUrl)
        : [...prev, imageUrl]
    )
  }

  const handleClearSelection = () => {
    setSelectedImages([])
  }

  const handleDeleteSelected = async () => {
    if (selectedImages.length === 0) return

    const confirmMessage = `Delete ${selectedImages.length} selected image${selectedImages.length > 1 ? 's' : ''}?`
    if (!confirm(confirmMessage)) return

    // Delete each selected image
    for (const imageUrl of selectedImages) {
      await removeImage(imageUrl)
    }

    setSelectedImages([])

    // Reload current page
    await loadGallery(currentPage)
  }

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Delete this image?')) return
    await removeImage(imageUrl)
    await loadGallery(currentPage)
  }

  const handleCopyImage = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl)
    // TODO: Show toast
  }

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `image_${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  // Keyboard navigation for fullscreen modal
  const navigateToImage = useCallback((direction: 'next' | 'previous') => {
    if (!fullscreenImage || filteredImages.length <= 1) return

    const currentIndex = filteredImages.findIndex((img: GeneratedImage) => img.url === fullscreenImage.url)
    if (currentIndex === -1) return

    let newIndex: number
    if (direction === 'next') {
      newIndex = currentIndex === filteredImages.length - 1 ? 0 : currentIndex + 1
    } else {
      newIndex = currentIndex === 0 ? filteredImages.length - 1 : currentIndex - 1
    }

    setFullscreenImage(filteredImages[newIndex])
  }, [fullscreenImage, filteredImages, setFullscreenImage])

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!fullscreenImage) return

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          navigateToImage('next')
          break
        case 'ArrowLeft':
          event.preventDefault()
          navigateToImage('previous')
          break
        case 'Escape':
          event.preventDefault()
          setFullscreenImage(null)
          break
      }
    }

    if (fullscreenImage) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [fullscreenImage, navigateToImage, setFullscreenImage])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-white">Image Gallery</h1>
              <Badge variant="outline" className="text-slate-300">
                {totalItems} {totalItems === 1 ? 'image' : 'images'}
              </Badge>
            </div>

            {selectedImages.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-red-600">
                  {selectedImages.length} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Filter tabs and search */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
              <TabsList className="bg-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-red-600">
                  All
                </TabsTrigger>
                <TabsTrigger value="tagged" className="data-[state=active]:bg-red-600">
                  Tagged
                </TabsTrigger>
                <TabsTrigger value="untagged" className="data-[state=active]:bg-red-600">
                  Untagged
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images..."
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gallery content */}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-24">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-red-500 animate-spin" />
            <p className="text-slate-400">Loading gallery...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-24">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <p className="text-xl text-slate-400 mb-2">No images found</p>
            <p className="text-sm text-slate-500">
              {searchQuery || filterTab !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Start creating images in Shot Creator'}
            </p>
          </div>
        ) : (
          <>
            {/* Image grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
              {filteredImages.map((image: GeneratedImage) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  isSelected={selectedImages.includes(image.url)}
                  onSelect={() => handleImageSelect(image.url)}
                  onZoom={() => setFullscreenImage(image)}
                  onCopy={() => handleCopyImage(image.url)}
                  onDownload={() => handleDownloadImage(image.url)}
                  onDelete={() => handleDeleteImage(image.url)}
                  onSetReference={async () => {
                    const newRef = await showReferenceNamePrompt(image.reference)
                    if (newRef) {
                      await updateImageReference(image.id, newRef)
                    }
                  }}
                  showActions={true}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-2 mb-8">
                {/* Page indicator text */}
                <div className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} ({totalItems} total images)
                </div>

                {/* Pagination buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="min-h-[44px] min-w-[44px] hover:bg-red-600 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            'min-h-[44px] min-w-[44px] transition-colors',
                            currentPage === pageNum
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'hover:bg-red-600 hover:text-white'
                          )}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="min-h-[44px] min-w-[44px] hover:bg-red-600 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <FullscreenModal
          fullscreenImage={fullscreenImage}
          images={filteredImages}
          setFullscreenImage={setFullscreenImage}
          onClose={() => setFullscreenImage(null)}
          onNavigate={navigateToImage}
          onCopyImage={handleCopyImage}
          onDownloadImage={handleDownloadImage}
          onDeleteImage={async (url: string) => {
            await handleDeleteImage(url)
            setFullscreenImage(null)
          }}
          onSendTo={() => {}}
          onSetReference={(id: string, ref: string) => {
            void updateImageReference(id, ref)
          }}
          showReferenceNamePrompt={showReferenceNamePrompt}
        />
      )}
    </div>
  )
}
