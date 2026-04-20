'use client'

import React, { useRef } from 'react'
import { Upload, ImageIcon, VideoIcon, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CompactShotCard } from './CompactShotCard'
import { AnimatorUnifiedGallery } from './AnimatorUnifiedGallery'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ShotAnimationConfig, AnimationModel, ModelSettings } from '../types'
import { ANIMATION_MODELS } from '../config/models.config'

interface AnimatorPreviewProps {
  filteredShots: ShotAnimationConfig[]
  shotConfigs: ShotAnimationConfig[]
  selectedModel: AnimationModel
  currentModelSettings: ModelSettings
  isDragOver: boolean
  galleryCollapsed: boolean
  mobileGalleryOpen: boolean
  onDragEnter: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUpdateShotConfig: (id: string, updates: ShotAnimationConfig) => void
  onDeleteShot: (id: string) => void
  onManageReferences: (configId: string) => void
  onManageLastFrame: (configId: string) => void
  onRetryVideo: (shotConfigId: string, galleryId: string) => void
  onDropStartFrame: (configId: string, imageUrl: string, imageName?: string) => void
  onDropLastFrame: (configId: string, imageUrl: string) => void
  onDeleteVideo: (galleryId: string) => void
  onToggleGalleryCollapsed: () => void
  onSetMobileGalleryOpen: (open: boolean) => void
  onOpenGalleryModal: () => void
}

export function AnimatorPreview({
  filteredShots,
  shotConfigs,
  selectedModel,
  currentModelSettings,
  isDragOver,
  galleryCollapsed,
  mobileGalleryOpen,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onUpdateShotConfig,
  onDeleteShot,
  onManageReferences,
  onManageLastFrame,
  onRetryVideo,
  onDropStartFrame,
  onDropLastFrame,
  onDeleteVideo,
  onToggleGalleryCollapsed,
  onSetMobileGalleryOpen,
  onOpenGalleryModal,
}: AnimatorPreviewProps) {
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const currentModelConfig = ANIMATION_MODELS[selectedModel] || ANIMATION_MODELS['seedance-1.5-pro']

  return (
    <div className={`flex-1 overflow-hidden grid grid-cols-1 ${galleryCollapsed ? '' : 'lg:grid-cols-[1fr_400px]'}`}>
      {/* Left: Shots Grid */}
      <div
        ref={dropZoneRef}
        className="overflow-y-auto relative"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {filteredShots.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-96 text-muted-foreground border-2 border-dashed rounded-lg m-4 transition-colors cursor-pointer hover:border-border hover:text-foreground ${isDragOver ? 'border-primary bg-primary/10' : 'border-border/50'}`}
            onClick={() => document.getElementById('file-upload-toolbar')?.click()}
          >
            <Upload className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-medium">{isDragOver ? 'Drop images to add shots' : 'Click to upload images'}</p>
            <p className="text-sm mt-2">or press Ctrl+V to paste from clipboard</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-border"
              onClick={(e) => { e.stopPropagation(); onOpenGalleryModal() }}
            >
              <ImageIcon className="w-4 h-4 mr-1" />
              Browse Gallery
            </Button>
          </div>
        ) : (
          <div className="p-2 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pb-24 content-stretch">
            {filteredShots.map((config) => (
              <CompactShotCard
                key={config.id}
                config={config}
                maxReferenceImages={currentModelConfig.maxReferenceImages}
                supportsLastFrame={currentModelConfig.supportsLastFrame}
                selectedModel={selectedModel}
                currentModelSettings={currentModelSettings}
                onUpdate={(updates) => onUpdateShotConfig(config.id, updates)}
                onDelete={() => onDeleteShot(config.id)}
                onManageReferences={() => onManageReferences(config.id)}
                onManageLastFrame={() => onManageLastFrame(config.id)}
                onRetryVideo={(galleryId) => onRetryVideo(config.id, galleryId)}
                onDropStartFrame={(imageUrl, imageName) => onDropStartFrame(config.id, imageUrl, imageName)}
                onDropLastFrame={(imageUrl) => onDropLastFrame(config.id, imageUrl)}
              />
            ))}
            <div
              className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg transition-colors cursor-pointer border-border/50 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
              onClick={() => document.getElementById('file-upload-toolbar')?.click()}
            >
              <Upload className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Click to add images</p>
              <p className="text-[10px] mt-1 opacity-60">or Ctrl+V to paste</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Unified Gallery - Desktop */}
      {!galleryCollapsed && (
        <div className="hidden lg:block">
          <AnimatorUnifiedGallery
            shotConfigs={shotConfigs}
            onDelete={onDeleteVideo}
          />
        </div>
      )}

      {/* Gallery Toggle Button - Desktop */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex fixed right-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-md hover:bg-secondary"
        onClick={onToggleGalleryCollapsed}
        title={galleryCollapsed ? 'Show video gallery' : 'Hide video gallery'}
      >
        {galleryCollapsed ? (
          <PanelRightOpen className="w-4 h-4" />
        ) : (
          <PanelRightClose className="w-4 h-4" />
        )}
      </Button>

      {/* Mobile Gallery Button */}
      {isMobile && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-20 right-3 z-40 rounded-full h-10 px-3 bg-card/90 backdrop-blur-sm shadow-lg border-border"
          onClick={() => onSetMobileGalleryOpen(true)}
        >
          <VideoIcon className="w-4 h-4 mr-1.5" />
          Gallery
        </Button>
      )}

      {/* Mobile Gallery Sheet */}
      <Sheet open={mobileGalleryOpen} onOpenChange={onSetMobileGalleryOpen}>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Generated Videos</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto h-full">
            <AnimatorUnifiedGallery
              shotConfigs={shotConfigs}
              onDelete={onDeleteVideo}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
