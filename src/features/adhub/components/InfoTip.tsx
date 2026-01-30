'use client'

import { useState } from 'react'
import { HelpCircle, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { cn } from '@/utils/utils'
import Image from 'next/image'
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
            <strong className="text-foreground">Template</strong> = What to say (with fill-in fields)
            <p className="text-xs opacity-80">Image fields become reference images</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-medium text-pink-400 shrink-0">3</div>
          <div>
            <strong className="text-foreground">Style</strong> = How it looks (visual direction)
            <p className="text-xs opacity-80">Adds creative guidelines to AI</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border/50 text-xs">
          <strong className="text-foreground">Final Prompt</strong> = Template + Brand Context + Style
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
 * Template-specific info
 */
export function TemplateInfoTip() {
  return (
    <InfoTip title="What is a Template?">
      <div className="space-y-2">
        <p><strong>Template = Ad structure with fill-in fields</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Goal Prompt:</strong> What the ad should achieve</li>
          <li><strong>Text Fields:</strong> Values inserted into prompt</li>
          <li><strong>Image Fields:</strong> Become reference images</li>
        </ul>
        <div className="pt-2 border-t border-border/30">
          <p className="text-[10px] font-mono bg-muted/50 px-1 py-0.5 rounded">
            {`{{product_name}}`} → &ldquo;Premium Headphones&rdquo;
          </p>
        </div>
      </div>
    </InfoTip>
  )
}

/**
 * Style-specific info
 */
export function StyleInfoTip() {
  return (
    <InfoTip title="What is a Style?">
      <div className="space-y-2">
        <p><strong>Style = Visual & creative direction</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Composition:</strong> Layout, spacing, elements</li>
          <li><strong>Typography:</strong> Font choices, hierarchy</li>
          <li><strong>Color:</strong> Palette, contrast, mood</li>
          <li><strong>Tone:</strong> Writing style, CTA approach</li>
        </ul>
        <p className="pt-2 border-t border-border/30 text-[10px]">
          Style instructions guide AI on HOW it looks
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
          <div className="flex items-start gap-1.5">
            <span className="text-green-400">✓</span>
            <span>Template image field uploads</span>
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
          {/* Architecture Diagram */}
          <div className="rounded-lg overflow-hidden border border-border">
            <Image
              src="/docs/adhub-architecture-diagram.jpg"
              alt="Adhub Architecture Diagram"
              width={1200}
              height={600}
              className="w-full h-auto"
            />
          </div>

          {/* Explanation */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Inputs */}
            <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <h4 className="font-semibold text-purple-400 mb-2">1. Inputs (Three Pillars)</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Templates:</strong> What the ad does - goal prompt with {`{{placeholders}}`} and input fields
                </li>
                <li>
                  <strong className="text-foreground">Styles:</strong> How it looks - detailed visual instructions (typography, color, tone)
                </li>
                <li>
                  <strong className="text-foreground">Brands:</strong> Who it&apos;s for - logo, context text, reference images
                </li>
              </ul>
            </div>

            {/* Composition */}
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <h4 className="font-semibold text-amber-400 mb-2">2. Prompt Composition</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Step 1:</strong> Replace {`{{placeholders}}`} with your field values
                </li>
                <li>
                  <strong className="text-foreground">Step 2:</strong> Add brand context (target audience, tone, values)
                </li>
                <li>
                  <strong className="text-foreground">Step 3:</strong> Append style modifiers (visual direction)
                </li>
                <li>
                  <strong className="text-foreground">Images:</strong> Collect logo + selected refs + image fields
                </li>
              </ul>
            </div>

            {/* Output */}
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <h4 className="font-semibold text-green-400 mb-2">3. Generation & Output</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">AI Model:</strong> Replicate nano-banana-pro processes the composed prompt
                </li>
                <li>
                  <strong className="text-foreground">Inputs:</strong> Final prompt + reference images + aspect ratio
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
              <span className="px-3 py-1 rounded bg-purple-500/20 text-purple-400">Your Selections</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-amber-500/20 text-amber-400">Composition Engine</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-blue-500/20 text-blue-400">AI Model</span>
              <span className="text-muted-foreground">→</span>
              <span className="px-3 py-1 rounded bg-green-500/20 text-green-400">Final Ad</span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Brand + Template + Style = Composed Prompt → AI Generation → Professional Ad
            </p>
          </div>

          {/* Key Insights */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Reusable:</strong> Same template works across multiple brands
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Consistent:</strong> Style presets ensure visual consistency
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="text-green-400">✓</span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Fast:</strong> No prompt engineering needed - just fill in fields
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
