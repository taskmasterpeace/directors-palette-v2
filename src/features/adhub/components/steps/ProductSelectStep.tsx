'use client'

import React, { useEffect, useState } from 'react'
import {
  Plus,
  Package,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/utils/utils'
import { toast } from 'sonner'
import { useAdhubStore } from '../../store/adhub.store'
import type { AdhubProduct, AdhubExtractedCopy } from '../../types/adhub.types'

const EMPTY_COPY: AdhubExtractedCopy = {
  headline: '',
  tagline: '',
  valueProp: '',
  features: [],
  audience: '',
}

export function ProductSelectStep() {
  const {
    selectedBrand,
    products,
    setProducts,
    selectedProduct,
    selectProduct,
    isExtracting,
    setIsExtracting,
    nextStep,
    previousStep,
  } = useAdhubStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<AdhubProduct | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [rawText, setRawText] = useState('')
  const [extractedCopy, setExtractedCopy] = useState<AdhubExtractedCopy>(EMPTY_COPY)
  const [hasExtracted, setHasExtracted] = useState(false)
  const [featureInput, setFeatureInput] = useState('')

  // Fetch products for this brand
  useEffect(() => {
    async function fetchProducts() {
      if (!selectedBrand) return

      try {
        const response = await fetch(`/api/adhub/products?brandId=${selectedBrand.id}`)
        if (response.ok) {
          const data = await response.json()
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [selectedBrand, setProducts])

  const resetForm = () => {
    setName('')
    setRawText('')
    setExtractedCopy(EMPTY_COPY)
    setHasExtracted(false)
    setEditingProduct(null)
    setFeatureInput('')
  }

  const handleOpenDialog = (product?: AdhubProduct) => {
    if (product) {
      setEditingProduct(product)
      setName(product.name)
      setRawText(product.rawText)
      setExtractedCopy(product.extractedCopy)
      setHasExtracted(true)
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleExtractCopy = async () => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      toast.error('Please paste at least 10 characters of product description')
      return
    }

    setIsExtracting(true)
    try {
      const response = await fetch('/api/adhub/extract-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract copy')
      }

      const data = await response.json()
      setExtractedCopy(data.extractedCopy)
      setHasExtracted(true)

      // Auto-set name if empty
      if (!name.trim() && data.extractedCopy.headline) {
        setName(data.extractedCopy.headline)
      }

      toast.success('Ad copy extracted successfully!')
    } catch (error) {
      console.error('Extract copy error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to extract copy')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !selectedBrand) return
    if (!hasExtracted) {
      toast.error('Please extract copy before saving')
      return
    }

    setIsSaving(true)
    try {
      const endpoint = editingProduct
        ? `/api/adhub/products/${editingProduct.id}`
        : '/api/adhub/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand.id,
          name: name.trim(),
          rawText,
          extractedCopy,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (editingProduct) {
          setProducts(products.map(p => p.id === editingProduct.id ? data.product : p))
          if (selectedProduct?.id === editingProduct.id) {
            selectProduct(data.product)
          }
        } else {
          setProducts([data.product, ...products])
        }
        setDialogOpen(false)
        resetForm()
        toast.success(editingProduct ? 'Product updated' : 'Product created')
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('Failed to save product')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product?')) return

    try {
      const response = await fetch(`/api/adhub/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProducts(products.filter(p => p.id !== productId))
        if (selectedProduct?.id === productId) {
          selectProduct(undefined)
        }
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
    }
  }

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setExtractedCopy(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()],
      }))
      setFeatureInput('')
    }
  }

  const handleRemoveFeature = (index: number) => {
    setExtractedCopy(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const handleContinue = () => {
    if (selectedProduct) {
      nextStep()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Select a Product</h2>
        </div>
        <p className="text-muted-foreground mt-1">
          Choose a product for <strong>{selectedBrand?.name}</strong>, or create one by pasting a product description.
        </p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Create New Product Card */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <button
              onClick={() => handleOpenDialog()}
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <Plus className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Create Product</span>
            </button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Product Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Premium Wireless Headphones"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Product Description
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste a product page, marketing brief, or any description. The AI will extract key ad copy.
                </p>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your product description, landing page copy, marketing brief, or any text about this product..."
                  rows={6}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {rawText.length} characters
                  </span>
                  <Button
                    onClick={handleExtractCopy}
                    disabled={isExtracting || rawText.trim().length < 10}
                    size="sm"
                    className="gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Extract Ad Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Extracted Copy Review/Edit */}
              {hasExtracted && (
                <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Extracted Ad Copy
                    <span className="text-xs text-muted-foreground font-normal">(editable)</span>
                  </h4>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Headline</label>
                    <Input
                      value={extractedCopy.headline}
                      onChange={(e) => setExtractedCopy(prev => ({ ...prev, headline: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Tagline</label>
                    <Input
                      value={extractedCopy.tagline}
                      onChange={(e) => setExtractedCopy(prev => ({ ...prev, tagline: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Value Proposition</label>
                    <Textarea
                      value={extractedCopy.valueProp}
                      onChange={(e) => setExtractedCopy(prev => ({ ...prev, valueProp: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Key Features</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {extractedCopy.features.map((feature, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-background border"
                        >
                          {feature}
                          <button onClick={() => handleRemoveFeature(i)} className="hover:text-destructive">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        placeholder="Add a feature..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature() } }}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={handleAddFeature}>
                        Add
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Target Audience</label>
                    <Input
                      value={extractedCopy.audience}
                      onChange={(e) => setExtractedCopy(prev => ({ ...prev, audience: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || !hasExtracted || isSaving}
                >
                  {isSaving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Existing Products */}
        {products.map((product) => (
          <div
            key={product.id}
            className={cn(
              'relative group border rounded-lg p-4 cursor-pointer transition-all min-h-[160px]',
              selectedProduct?.id === product.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => selectProduct(product)}
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 bg-muted rounded flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{product.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {product.extractedCopy.tagline}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">
              {product.extractedCopy.valueProp}
            </p>

            {product.extractedCopy.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {product.extractedCopy.features.slice(0, 3).map((f, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                    {f}
                  </span>
                ))}
                {product.extractedCopy.features.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{product.extractedCopy.features.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenDialog(product) }}
                className="p-1.5 rounded hover:bg-accent"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(product.id) }}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousStep} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!selectedProduct}
          className="gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
