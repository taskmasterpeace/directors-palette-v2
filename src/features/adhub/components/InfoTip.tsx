'use client'

import { useState } from 'react'
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/utils'

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
