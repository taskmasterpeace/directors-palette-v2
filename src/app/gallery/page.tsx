import { UnifiedImageGallery } from '@/features/shot-creator/components/unified-gallery/UnifiedImageGallery'

export default function GalleryPage() {
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-gradient-to-b from-background via-card to-background">
      <UnifiedImageGallery />
    </div>
  )
}
