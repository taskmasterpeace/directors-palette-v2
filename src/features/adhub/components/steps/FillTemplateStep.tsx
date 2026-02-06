'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeft, Sparkles, X, ImageIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/utils'
import { useAdhubStore, ASPECT_RATIO_OPTIONS } from '../../store/adhub.store'
import type { AdhubBrandImage } from '../../types/adhub.types'
import { ReferenceImagesInfoTip } from '../InfoTip'
import { AdhubModelSelector } from '../AdhubModelSelector'
import { RiverflowInputPanel } from '../RiverflowInputPanel'
import { RiverflowCostPreview } from '../RiverflowCostPreview'

export function FillTemplateStep() {
  const {
    selectedBrand,
    selectedTemplate,
    selectedStyle,
    fieldValues,
    setFieldValue,
    selectedReferenceImages,
    toggleReferenceImage,
    aspectRatio,
    setAspectRatio,
    selectedModel,
    riverflowSourceImages,
    riverflowDetailRefs,
    riverflowFontUrls,
    riverflowFontTexts,
    riverflowSettings,
    setIsGenerating,
    setGenerationResult,
    setError,
    previousStep,
    isGenerating,
  } = useAdhubStore()

  const [brandImages, setBrandImages] = useState<AdhubBrandImage[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(true)

  // Fetch brand images
  useEffect(() => {
    async function fetchBrandImages() {
      if (!selectedBrand) return

      try {
        const response = await fetch(`/api/adhub/brands/${selectedBrand.id}/images`)
        if (response.ok) {
          const data = await response.json()
          setBrandImages(data.images || [])
        }
      } catch (error) {
        console.error('Failed to fetch brand images:', error)
      } finally {
        setIsLoadingImages(false)
      }
    }
    fetchBrandImages()
  }, [selectedBrand])

  const handleGenerate = async () => {
    if (!selectedBrand || !selectedTemplate || !selectedStyle) {
      setError('Missing required selections')
      return
    }

    // Validate required fields
    const missingFields = selectedTemplate.fields
      ?.filter(f => f.isRequired && !fieldValues[f.fieldName]?.trim())
      .map(f => f.fieldLabel)

    if (missingFields && missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`)
      return
    }

    setIsGenerating(true)
    setError(undefined)

    try {
      // Build request body with model-specific inputs
      const requestBody: Record<string, unknown> = {
        brandId: selectedBrand.id,
        styleId: selectedStyle.id,
        templateId: selectedTemplate.id,
        fieldValues,
        selectedReferenceImages,
        aspectRatio,
        model: selectedModel,
      }

      // Add Riverflow-specific inputs if using Riverflow
      if (selectedModel === 'riverflow-2-pro') {
        requestBody.riverflowSourceImages = riverflowSourceImages
        requestBody.riverflowDetailRefs = riverflowDetailRefs
        requestBody.riverflowFontUrls = riverflowFontUrls
        requestBody.riverflowFontTexts = riverflowFontTexts
        requestBody.riverflowSettings = riverflowSettings
      }

      const response = await fetch('/api/adhub/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to generate ad'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setGenerationResult(result)
    } catch (error) {
      console.error('Generation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate ad')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!selectedTemplate) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No template selected.</p>
        <Button variant="outline" onClick={previousStep} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  const fields = selectedTemplate.fields || []

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Fill Template Fields</h2>
        <p className="text-muted-foreground mt-1">
          Complete the fields below and select any reference images to include.
        </p>
      </div>

      {/* Model Selector */}
      <AdhubModelSelector />

      {/* Riverflow Panel (shown only when Riverflow selected) */}
      {selectedModel === 'riverflow-2-pro' && <RiverflowInputPanel />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Settings & Fields */}
        <div className="space-y-6">
          {/* Aspect Ratio Selector */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Aspect Ratio
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {ASPECT_RATIO_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAspectRatio(option.value)}
                  className={cn(
                    'flex flex-col items-center p-2 rounded-lg border-2 transition-all text-center',
                    aspectRatio === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent bg-muted/50 hover:border-primary/30'
                  )}
                >
                  {/* Aspect ratio visual preview */}
                  <div className="mb-1.5 flex items-center justify-center w-10 h-10">
                    <div
                      className={cn(
                        'bg-foreground/20 rounded-sm',
                        option.value === '1:1' && 'w-8 h-8',
                        option.value === '4:5' && 'w-7 h-8',
                        option.value === '9:16' && 'w-5 h-9',
                        option.value === '16:9' && 'w-10 h-6',
                        option.value === '4:3' && 'w-9 h-7'
                      )}
                    />
                  </div>
                  <span className="text-xs font-medium">{option.label}</span>
                  <span className="text-[10px] text-muted-foreground">{option.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Fields */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Template Fields
            </h3>

            {fields.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                This template has no fields to fill in.
              </p>
            ) : (
            fields.map((field) => (
              <div key={field.id}>
                <label className="text-sm font-medium mb-1.5 block">
                  {field.fieldLabel}
                  {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
                </label>

                {field.fieldType === 'text' ? (
                  field.placeholder && field.placeholder.length > 50 ? (
                    <Textarea
                      value={fieldValues[field.fieldName] || ''}
                      onChange={(e) => setFieldValue(field.fieldName, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      value={fieldValues[field.fieldName] || ''}
                      onChange={(e) => setFieldValue(field.fieldName, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={fieldValues[field.fieldName] || ''}
                      onChange={(e) => setFieldValue(field.fieldName, e.target.value)}
                      placeholder={field.placeholder || 'Enter image URL'}
                    />
                    {fieldValues[field.fieldName] && (
                      <div className="relative w-24 h-24">
                        <img
                          src={fieldValues[field.fieldName]}
                          alt="Preview"
                          className="w-full h-full object-cover rounded border"
                        />
                        <button
                          onClick={() => setFieldValue(field.fieldName, '')}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
            )}
          </div>
        </div>

        {/* Right Column: Reference Images */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Brand Reference Images
            </h3>
            <ReferenceImagesInfoTip />
          </div>

          {/* Brand Logo */}
          {selectedBrand?.logoUrl && (
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">Brand Logo (auto-included)</p>
              <img
                src={selectedBrand.logoUrl}
                alt="Brand Logo"
                className="h-12 object-contain"
              />
            </div>
          )}

          {/* Reference Images */}
          {isLoadingImages ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : brandImages.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No reference images for this brand.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add images in the brand editor.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {brandImages.map((image) => {
                const isSelected = selectedReferenceImages.includes(image.imageUrl)
                return (
                  <button
                    key={image.id}
                    onClick={() => toggleReferenceImage(image.imageUrl)}
                    className={cn(
                      'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-primary/50'
                    )}
                  >
                    <img
                      src={image.imageUrl}
                      alt={image.description || 'Reference'}
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    {image.description && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[10px] text-white truncate">
                          {image.description}
                        </p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {selectedReferenceImages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedReferenceImages.length} image{selectedReferenceImages.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 p-4 border rounded-lg bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-3">
          Configuration Summary
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Brand</p>
            <p className="font-medium">{selectedBrand?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Template</p>
            <p className="font-medium">{selectedTemplate?.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Style</p>
            <p className="font-medium">{selectedStyle?.displayName}</p>
          </div>
        </div>
      </div>

      {/* Cost Preview for Riverflow */}
      <RiverflowCostPreview />

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={previousStep} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Ad
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
