'use client'

import { useState } from 'react'
import { HelpCircle, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface InfoTipProps {
  title: string
  children: React.ReactNode
  variant?: 'inline' | 'collapsible'
  className?: string
}

/**
 * Compact info tip component for explaining concepts
 * - inline: Shows as a small "?" icon with popover on hover/click
 * - collapsible: Shows as expandable section
 */
export function InfoTip({ title, children, variant = 'inline', className }: InfoTipProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'collapsible') {
    return (
      <div className={cn('border border-border/50 rounded-lg overflow-hidden', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <HelpCircle className="w-4 h-4" />
            {title}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {isOpen && (
          <div className="px-3 py-2 text-sm text-muted-foreground border-t border-border/50 bg-background">
            {children}
          </div>
        )}
      </div>
    )
  }

  // Inline variant with popover
  return (
    <div className={cn('relative inline-block', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-muted/50 transition-colors"
        aria-label={`Help: ${title}`}
      >
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Popover */}
          <div className="absolute z-50 left-0 top-full mt-1 w-72 p-3 rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-medium text-sm">{title}</span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-0.5 rounded hover:bg-muted"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Quick reference guide showing the flow of Adhub
 */
export function AdhubFlowGuide() {
  return (
    <InfoTip title="How Adhub Works" variant="collapsible">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-medium text-purple-400 shrink-0">1</div>
          <div>
            <strong className="text-foreground">Brand</strong> = Your identity (logo + context)
            <p className="text-xs opacity-80">Logo auto-included as reference image</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-400 shrink-0">2</div>
          <div>
            <strong className="text-foreground">Product</strong> = What you&apos;re advertising
            <p className="text-xs opacity-80">Paste a description, AI extracts ad copy</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-medium text-pink-400 shrink-0">3</div>
          <div>
            <strong className="text-foreground">Create Ad</strong> = Pick a preset + generate
            <p className="text-xs opacity-80">Preset fills the prompt with your product copy</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border/50 text-xs">
          <strong className="text-foreground">Final Prompt</strong> = Preset Template + Product Copy + Brand Context
        </div>
      </div>
    </InfoTip>
  )
}

/**
 * Brand-specific info
 */
export function BrandInfoTip() {
  return (
    <InfoTip title="What is a Brand?">
      <div className="space-y-2">
        <p><strong>Brand = Your visual identity</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Logo:</strong> Auto-included in every ad as reference</li>
          <li><strong>Context:</strong> Target audience, tone, values</li>
          <li><strong>Reference Images:</strong> Style examples for AI</li>
        </ul>
        <p className="pt-2 border-t border-border/30 text-[10px]">
          Tip: Good brand context = more consistent ads
        </p>
      </div>
    </InfoTip>
  )
}

/**
 * Reference images info
 */
export function ReferenceImagesInfoTip() {
  return (
    <InfoTip title="Reference Images">
      <div className="space-y-2">
        <p><strong>Reference images guide the AI&apos;s visual output</strong></p>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-start gap-1.5">
            <span className="text-green-400">✓</span>
            <span>Brand logo (auto-included)</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-green-400">✓</span>
            <span>Brand style images you select</span>
          </div>
        </div>
        <p className="pt-2 border-t border-border/30 text-[10px]">
          More references = more consistent results
        </p>
      </div>
    </InfoTip>
  )
}

/**
 * Full architecture diagram modal
 * Shows the complete Adhub system architecture with explanations
 */
export function ArchitectureHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">How It Works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Adhub Architecture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Explanation */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Inputs */}
            <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <h4 className="font-semibold text-purple-400 mb-2">1. Brand + Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Brand:</strong> Your identity - logo, context text, reference images
                </li>
                <li>
                  <strong className="text-foreground">Product:</strong> What you&apos;re advertising - paste a description and AI extracts headline, tagline, features
                </li>
              </ul>
            </div>

            {/* Composition */}
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <h4 className="font-semibold text-amber-400 mb-2">2. Preset + Prompt</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Preset:</strong> Pre-made ad style (Product Hero, Social Story, etc.)
                </li>
                <li>
                  <strong className="text-foreground">Auto-fill:</strong> Product copy fills the preset template
                </li>
                <li>
                  <strong className="text-foreground">Context:</strong> Brand context + style modifiers appended
                </li>
              </ul>
            </div>

            {/* Output */}
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <h4 className="font-semibold text-green-400 mb-2">3. Generation & Output</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">AI Model:</strong> nano-banana-pro or riverflow-2-pro
                </li>
                <li>
                  <strong className="text-foreground">Inputs:</strong> Composed prompt + reference images + aspect ratio
                </li>
                <li>
                  <strong className="text-foreground">Output:</strong> Professional ad image saved to your gallery
                </li>
              </ul>
            </div>
          </div>

          {/* Flow Summary */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h4 className="font-semibold mb-3">The Complete Flow</h4>
            <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
              <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-400">Brand + Product</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-amber-500/20 text-amber-400">Preset Template</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-400">AI Model</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-green-500/20 text-green-400">Final Ad</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Product Copy + Preset + Brand Context = Composed Prompt → AI Generation → Ad
            </p>
          </div>

          {/* Key Insights */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Smart:</strong> AI extracts ad copy from product descriptions
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Consistent:</strong> Presets ensure professional ad styles
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Fast:</strong> No prompt engineering - paste, pick, generate
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Brand-safe:</strong> Logo and context auto-included
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
