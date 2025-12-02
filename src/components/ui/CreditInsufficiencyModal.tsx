/**
 * Credit Insufficiency Modal
 * Displays when users don't have enough credits for an operation
 * Provides purchase options and alternatives
 */

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Zap, TrendingDown, AlertCircle } from 'lucide-react'

interface CreditPackage {
  credits: number
  price: number
  popular?: boolean
  bonus?: number
}

interface AlternativeOption {
  label: string
  credits: number
  description: string
  settings: Record<string, unknown>
}

interface CreditInsufficiencyModalProps {
  isOpen: boolean
  onClose: () => void
  required: number
  available: number
  operation: string
  alternatives?: AlternativeOption[]
  onPurchase?: (packageId: string) => void
  onUseAlternative?: (settings: Record<string, unknown>) => void
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 500, price: 5.00 },
  { credits: 1000, price: 9.00, popular: true, bonus: 100 },
  { credits: 2500, price: 20.00, bonus: 300 },
  { credits: 5000, price: 35.00, bonus: 750 }
]

export function CreditInsufficiencyModal({
  isOpen,
  onClose,
  required,
  available,
  operation,
  alternatives = [],
  onPurchase,
  onUseAlternative
}: CreditInsufficiencyModalProps) {
  const shortfall = required - available
  const recommendedPackage = CREDIT_PACKAGES.find(pkg =>
    (pkg.credits + (pkg.bonus || 0)) >= shortfall
  ) || CREDIT_PACKAGES[1]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Insufficient Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Credit Status */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-amber-800">Credit Requirements</h3>
                <p className="text-amber-700">
                  {operation} requires <strong>{required} credits</strong> but you only have <strong>{available} credits</strong>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-amber-800">{shortfall}</div>
                <div className="text-sm text-amber-600">credits needed</div>
              </div>
            </div>
          </div>

          {/* Credit Packages */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Purchase Credits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CREDIT_PACKAGES.map((pkg, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 transition-colors ${
                    pkg === recommendedPackage
                      ? 'border-accent bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        {pkg.credits.toLocaleString()} Credits
                        {pkg.bonus && (
                          <Badge variant="secondary">+{pkg.bonus} bonus</Badge>
                        )}
                      </div>
                      {pkg.popular && (
                        <Badge className="mt-1">Most Popular</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${pkg.price.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        {(pkg.price / (pkg.credits + (pkg.bonus || 0)) * 100).toFixed(1)}¢/credit
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant={pkg === recommendedPackage ? "default" : "outline"}
                    onClick={() => onPurchase?.(pkg.credits.toString())}
                  >
                    {pkg === recommendedPackage ? "Recommended" : "Purchase"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Alternative Options */}
          {alternatives.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Alternative Options
              </h3>
              <div className="space-y-2">
                {alternatives.map((alt, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{alt.label}</div>
                      <div className="text-sm text-gray-600">{alt.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{alt.credits} credits</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onUseAlternative?.(alt.settings)}
                      >
                        Use This
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => onPurchase?.(recommendedPackage.credits.toString())}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Buy {recommendedPackage.credits} Credits - ${recommendedPackage.price.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}