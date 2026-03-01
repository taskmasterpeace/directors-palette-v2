'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
      const logoUrl = logoPreview
      const brand = await createBrand(name.trim(), logoUrl ?? undefined, description.trim())
      await generateBrandGuide(brand.id, logoUrl, description.trim())
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
      <DialogContent className="sm:max-w-lg border-border/30 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <span className="block">{step === 'input' ? 'New Brand' : 'Generating Brand Guide'}</span>
              <DialogDescription className="font-normal mt-0.5">
                {step === 'input'
                  ? 'Upload a logo and describe the brand.'
                  : 'Analyzing identity and building your guide...'
                }
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'input' ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-2"
            >
              {/* Logo upload */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Logo</Label>
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border/40 rounded-xl cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 relative overflow-hidden group">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
                      <button
                        onClick={(e) => { e.preventDefault(); setLogoPreview(null) }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
                      <Upload className="w-6 h-6 mb-1.5" />
                      <span className="text-xs">Click to upload logo</span>
                      <span className="text-[10px] text-muted-foreground/30 mt-0.5">PNG, SVG, or JPG</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>

              {/* Brand name */}
              <div className="space-y-2">
                <Label htmlFor="brand-name" className="text-xs text-muted-foreground uppercase tracking-wider">Brand Name</Label>
                <Input
                  id="brand-name"
                  placeholder="e.g., Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/30 border-border/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="brand-desc" className="text-xs text-muted-foreground uppercase tracking-wider">Company Description</Label>
                <Textarea
                  id="brand-desc"
                  placeholder="Describe the brand, its products, target audience, and personality..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary/30 border-border/30 resize-none"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center gap-5"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="w-20 h-20 rounded-2xl border border-primary/15"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent, oklch(0.75 0.16 75 / 0.15), transparent)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Analyzing brand identity...</p>
                <p className="text-xs text-muted-foreground/60">
                  Extracting colors, typography, voice, and visual style
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !description.trim()}
                className="gap-2 shadow-lg shadow-primary/10"
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
