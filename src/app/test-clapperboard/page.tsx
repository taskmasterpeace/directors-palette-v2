'use client'

import { ClapperboardSpinner } from '@/features/shot-creator/components/unified-gallery/ClapperboardSpinner'

const TEST_MODELS = [
  { model: 'z-image-turbo', label: 'Z-Image Turbo (2s)' },
  { model: 'nano-banana-2', label: 'Nano Banana 2 (10s)' },
  { model: 'seedream-5-lite', label: 'Seedream 5 Lite (49s)' },
  { model: 'nano-banana-pro', label: 'Nano Banana Pro (30s)' },
]

export default function TestClapperboardPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <h1 className="text-xl font-bold text-foreground mb-6">Clapperboard Spinner Test</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {TEST_MODELS.map(({ model, label }) => (
          <div key={model} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="aspect-square flex items-center justify-center">
              <ClapperboardSpinner
                model={model}
                prompt="A cinematic wide shot of a sunset over mountains, golden hour lighting"
              />
            </div>
            <div className="text-xs text-center text-muted-foreground p-2 border-t border-border">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
