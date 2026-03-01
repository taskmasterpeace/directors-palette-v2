'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, Sparkles } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useBrandStore } from '../hooks/useBrandStore'

interface NewBrandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewBrandDialog({ open, onOpenChange }: NewBrandDialogProps) {
  const { createBrand, generateBrandGuide, isGeneratingGuide } = useBrandStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'generating'>('input')

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }, [])

  const handleSubmit = async () => {
    if (!name.trim() || !description.trim()) return

    setStep('generating')

    try {
      // Step 1: Create brand record
      const logoUrl = logoPreview // For now, use base64 — later: upload to Supabase Storage
      const brand = await createBrand(name.trim(), logoUrl ?? undefined, description.trim())

      // Step 2: Generate brand guide
      await generateBrandGuide(brand.id, logoUrl, description.trim())

      // Done — close dialog
      handleReset()
      onOpenChange(false)
    } catch {
      setStep('input')
    }
  }

  const handleReset = () => {
    setName('')
    setDescription('')
    setLogoPreview(null)
    setStep('input')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isGeneratingGuide) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            {step === 'input' ? 'New Brand' : 'Generating Brand Guide'}
          </DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? 'Upload a logo and describe the brand. AI will generate a complete brand guide.'
              : 'Analyzing your brand and generating a visual identity guide...'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 py-2">
            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border/60 rounded-lg cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-xs">Click to upload logo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
            </div>

            {/* Brand name */}
            <div className="space-y-2">
              <Label htmlFor="brand-name">Brand Name</Label>
              <Input
                id="brand-name"
                placeholder="e.g., Acme Corp"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="brand-desc">Company Description</Label>
              <Textarea
                id="brand-desc"
                placeholder="Describe the brand, its products, target audience, and personality..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-3xl border border-primary/20 animate-pulse" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">Analyzing brand identity...</p>
              <p className="text-xs text-muted-foreground">
                Extracting colors, typography, voice, and visual style
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !description.trim()}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Brand Guide
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
