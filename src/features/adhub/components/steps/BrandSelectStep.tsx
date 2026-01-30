'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Building2, Trash2, Edit2, ChevronRight, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/utils/utils'
import { useAdhubStore } from '../../store/adhub.store'
import type { AdhubBrand } from '../../types/adhub.types'

export function BrandSelectStep() {
  const {
    brands,
    setBrands,
    selectedBrand,
    selectBrand,
    nextStep,
  } = useAdhubStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<AdhubBrand | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [contextText, setContextText] = useState('')

  // Fetch brands
  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch('/api/adhub/brands')
        if (response.ok) {
          const data = await response.json()
          setBrands(data.brands || [])
        }
      } catch (error) {
        console.error('Failed to fetch brands:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBrands()
  }, [setBrands])

  const resetForm = () => {
    setName('')
    setLogoUrl('')
    setContextText('')
    setEditingBrand(null)
  }

  const handleOpenDialog = (brand?: AdhubBrand) => {
    if (brand) {
      setEditingBrand(brand)
      setName(brand.name)
      setLogoUrl(brand.logoUrl || '')
      setContextText(brand.contextText || '')
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return

    setIsCreating(true)
    try {
      const endpoint = editingBrand
        ? `/api/adhub/brands/${editingBrand.id}`
        : '/api/adhub/brands'
      const method = editingBrand ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl.trim() || undefined,
          contextText: contextText.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (editingBrand) {
          setBrands(brands.map(b => b.id === editingBrand.id ? data.brand : b))
        } else {
          setBrands([data.brand, ...brands])
        }
        setDialogOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save brand:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return

    try {
      const response = await fetch(`/api/adhub/brands/${brandId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setBrands(brands.filter(b => b.id !== brandId))
        if (selectedBrand?.id === brandId) {
          selectBrand(undefined)
        }
      }
    } catch (error) {
      console.error('Failed to delete brand:', error)
    }
  }

  const handleSelect = (brand: AdhubBrand) => {
    selectBrand(brand)
  }

  const handleContinue = () => {
    if (selectedBrand) {
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
        <h2 className="text-2xl font-bold">Select a Brand</h2>
        <p className="text-muted-foreground mt-1">
          Choose an existing brand or create a new one for your ad.
        </p>
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Create New Brand Card */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              onClick={() => handleOpenDialog()}
              className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <Plus className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Create Brand</span>
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? 'Edit Brand' : 'Create New Brand'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Brand Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Company"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Logo URL</label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Brand Context</label>
                <Textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Describe your brand, target audience, tone, etc."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name.trim() || isCreating}>
                  {isCreating ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Existing Brands */}
        {brands.map((brand) => (
          <div
            key={brand.id}
            className={cn(
              'relative border rounded-lg p-4 cursor-pointer transition-all min-h-[160px]',
              selectedBrand?.id === brand.id
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect(brand)}
          >
            {/* Logo or Icon */}
            <div className="flex items-start gap-3 mb-3">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-12 h-12 object-contain rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{brand.name}</h3>
                {brand.contextText && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {brand.contextText}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenDialog(brand)
                }}
                className="p-1.5 rounded hover:bg-accent"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(brand.id)
                }}
                className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selected Indicator */}
            {selectedBrand?.id === brand.id && (
              <div className="absolute bottom-2 right-2">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <ImageIcon className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!selectedBrand}
          className="gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
