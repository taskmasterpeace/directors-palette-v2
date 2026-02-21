'use client'

import React, { useRef } from 'react'
import { cn } from '@/utils/utils'
import { Upload, X, ImageIcon } from 'lucide-react'
import { useAdLabStore } from '../store/ad-lab.store'

const MAX_ASSETS = 3

function getAssetLabel(index: number): string {
  if (index === 0) return 'Logo'
  return `Asset ${index + 1}`
}

export function BriefInput() {
  const { briefText, briefAssets, setBriefText, addBriefAsset, removeBriefAsset } = useAdLabStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (briefAssets.length >= MAX_ASSETS) break
      if (!file.type.startsWith('image/')) continue

      const asset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        label: getAssetLabel(briefAssets.length),
      }
      addBriefAsset(asset)
    }

    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Textarea */}
      <textarea
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder="Paste your creative brief here...

Include details about the product/service, target audience, brand voice, competitive landscape, and campaign goals."
        className={cn(
          'w-full min-h-[240px] p-4 rounded-lg border border-border bg-card/50 text-sm',
          'resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
          'placeholder:text-muted-foreground/50'
        )}
      />
      <p className="text-xs text-muted-foreground">
        {briefText.length > 0 ? `${briefText.length} characters` : 'Paste a creative brief to get started'}
      </p>

      {/* Asset Uploads */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Logo & Assets ({briefAssets.length}/{MAX_ASSETS})
        </span>

        <div className="flex flex-wrap gap-3">
          {/* Existing asset previews */}
          {briefAssets.map((asset) => (
            <div key={asset.id} className="relative group">
              <div className="w-20 h-20 rounded-lg border border-border overflow-hidden bg-black/20">
                <img
                  src={asset.preview}
                  alt={asset.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white text-center py-0.5 rounded-b-lg">
                {asset.label}
              </span>
              <button
                onClick={() => removeBriefAsset(asset.id)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Upload button */}
          {briefAssets.length < MAX_ASSETS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-20 h-20 rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1',
                'text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors'
              )}
            >
              {briefAssets.length === 0 ? (
                <>
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[9px] font-medium">Logo</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px]">Add</span>
                </>
              )}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
