'use client'

import { Shirt, Sparkles, ShoppingCart, CheckCircle2, ArrowRight } from 'lucide-react'
import { cn } from '@/utils/utils'
import type { LucideIcon } from 'lucide-react'

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: 'Pick Product', icon: Shirt },
  { label: 'Create Design', icon: Sparkles },
  { label: 'Order', icon: ShoppingCart },
]

export function PipelineStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-3 border-b border-border/20 bg-card/20 px-4 py-2.5">
      {STEPS.map((step, i) => {
        const stepNum = i + 1
        const completed = currentStep > stepNum
        const active = currentStep === stepNum
        const Icon = step.icon

        return (
          <div key={step.label} className="flex items-center gap-3">
            {i > 0 && (
              <ArrowRight
                className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  currentStep > i ? 'text-amber-400' : 'text-muted-foreground/20'
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                  completed
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                    : active
                      ? 'border-2 border-amber-400 bg-amber-500/15 text-amber-400'
                      : 'border border-border/40 bg-card/40 text-muted-foreground/40'
                )}
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider transition-colors',
                    completed
                      ? 'text-amber-400'
                      : active
                        ? 'text-foreground/80'
                        : 'text-muted-foreground/30'
                  )}
                >
                  Step {stepNum}
                </p>
                <p
                  className={cn(
                    'text-xs transition-colors',
                    completed || active
                      ? 'text-foreground/70'
                      : 'text-muted-foreground/25'
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
