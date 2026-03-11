'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, CheckCircle2, AlertCircle, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/utils'
import { SizeSelector } from './SizeSelector'
import { MaterialPicker, type MaterialOption } from './MaterialPicker'
import { DimensionPreview } from './DimensionPreview'
import { ShippingForm, type ShippingAddress } from './ShippingForm'
import { useCreditsStore } from '@/features/credits/store/credits.store'

interface OrderPrintModalProps {
  isOpen: boolean
  onClose: () => void
  glbUrl: string
  figurineId?: string
}

type Step = 'configure' | 'quote' | 'shipping' | 'confirmation'

const STEP_LABELS: Record<Step, string> = {
  configure: 'Configure',
  quote: 'Review Quote',
  shipping: 'Shipping',
  confirmation: 'Confirmed',
}

const STEPS: Step[] = ['configure', 'quote', 'shipping', 'confirmation']

export function OrderPrintModal({ isOpen, onClose, glbUrl, figurineId }: OrderPrintModalProps) {
  const [step, setStep] = useState<Step>('configure')
  const [sizeCm, setSizeCm] = useState<5 | 10>(10)
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOrdering, setIsOrdering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Quote data
  const [shapewaysModelId, setShapewaysModelId] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{ x: number; y: number; z: number } | null>(null)
  const [materials, setMaterials] = useState<MaterialOption[]>([])

  // Confirmation data
  const [orderId, setOrderId] = useState<string | null>(null)
  const [ptsCharged, setPtsCharged] = useState<number | null>(null)

  const { balance } = useCreditsStore()

  const selectedMaterial = materials.find(m => m.materialId === selectedMaterialId)

  const handleGetQuote = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/figurine/print-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ glbUrl, sizeCm }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Request failed: ${response.status}`)
      }

      const data = await response.json()
      setShapewaysModelId(data.shapewaysModelId)
      setDimensions(data.dimensions)
      setMaterials(data.materials)

      // Auto-select first material
      if (data.materials.length > 0) {
        setSelectedMaterialId(data.materials[0].materialId)
      }

      setStep('quote')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote')
    } finally {
      setIsLoading(false)
    }
  }, [glbUrl, sizeCm])

  const handlePlaceOrder = useCallback(async (address: ShippingAddress) => {
    if (!shapewaysModelId || !selectedMaterial) return

    setIsOrdering(true)
    setError(null)

    try {
      const response = await fetch('/api/figurine/print-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shapewaysModelId,
          materialId: selectedMaterial.materialId,
          materialName: selectedMaterial.materialName,
          sizeCm,
          shapewaysPrice: selectedMaterial.shapewaysPrice,
          ourPricePts: selectedMaterial.ourPricePts,
          shippingAddress: address,
          figurineId: figurineId || null,
          dimensions,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Order failed: ${response.status}`)
      }

      const data = await response.json()
      setOrderId(data.orderId)
      setPtsCharged(data.ptsCharged)
      setStep('confirmation')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setIsOrdering(false)
    }
  }, [shapewaysModelId, selectedMaterial, sizeCm, figurineId, dimensions])

  const handleClose = () => {
    // Reset state on close
    setStep('configure')
    setSizeCm(10)
    setSelectedMaterialId(null)
    setIsLoading(false)
    setIsOrdering(false)
    setError(null)
    setShapewaysModelId(null)
    setDimensions(null)
    setMaterials([])
    setOrderId(null)
    setPtsCharged(null)
    onClose()
  }

  if (!isOpen) return null

  const currentStepIndex = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'bg-background border border-border/40 rounded-2xl',
          'shadow-2xl shadow-black/40',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-foreground/90">Order Physical Print</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-border/20 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 flex-1">
                <div className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= currentStepIndex ? 'bg-cyan-400' : 'bg-border/30',
                )} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {STEP_LABELS[step]}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {/* Step 1: Configure */}
            {step === 'configure' && (
              <motion.div
                key="configure"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <SizeSelector value={sizeCm} onChange={setSizeCm} />

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Choose your size, then get a real-time quote from our printing partner.
                    Pricing varies by material and size.
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleGetQuote}
                  disabled={isLoading}
                  className={cn(
                    'w-full h-11 rounded-xl font-semibold text-sm',
                    'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
                    'text-white shadow-lg shadow-cyan-500/20',
                    'disabled:opacity-40 disabled:shadow-none',
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Getting Quote (this may take a minute)...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Get Quote
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Quote / Material Selection */}
            {step === 'quote' && (
              <motion.div
                key="quote"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {dimensions && <DimensionPreview dimensions={dimensions} />}

                <MaterialPicker
                  materials={materials}
                  selectedId={selectedMaterialId}
                  onChange={setSelectedMaterialId}
                />

                {selectedMaterial && balance !== null && balance < selectedMaterial.ourPricePts && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    Insufficient pts. You have {balance.toLocaleString()}, need {selectedMaterial.ourPricePts.toLocaleString()}.
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('configure')}
                    className="flex-1 h-11 rounded-xl"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('shipping')}
                    disabled={!selectedMaterialId || (balance !== null && selectedMaterial ? balance < selectedMaterial.ourPricePts : false)}
                    className={cn(
                      'flex-1 h-11 rounded-xl font-semibold text-sm',
                      'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
                      'text-white shadow-lg shadow-cyan-500/20',
                      'disabled:opacity-40 disabled:shadow-none',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Shipping */}
            {step === 'shipping' && selectedMaterial && (
              <motion.div
                key="shipping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ShippingForm
                  pricePts={selectedMaterial.ourPricePts}
                  isSubmitting={isOrdering}
                  onSubmit={handlePlaceOrder}
                  onBack={() => setStep('quote')}
                />
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mt-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 'confirmation' && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-4"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground/90">Order Placed!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your figurine is being prepared for printing.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-card/40 border border-border/30 text-left space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-mono text-foreground/70">{orderId}</span>
                  </div>
                  {selectedMaterial && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Material</span>
                      <span className="text-foreground/70">{selectedMaterial.materialName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Size</span>
                    <span className="text-foreground/70">{sizeCm}cm</span>
                  </div>
                  {ptsCharged && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Charged</span>
                      <span className="font-semibold text-cyan-400">{ptsCharged.toLocaleString()} pts</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Est. Delivery</span>
                    <span className="text-foreground/70">10-14 business days</span>
                  </div>
                </div>

                <Button
                  onClick={handleClose}
                  className={cn(
                    'w-full h-11 rounded-xl font-semibold text-sm',
                    'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400',
                    'text-white shadow-lg shadow-cyan-500/20',
                  )}
                >
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
