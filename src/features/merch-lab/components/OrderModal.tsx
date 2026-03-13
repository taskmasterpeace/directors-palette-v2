'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Check, Loader2 } from 'lucide-react'
import { useMerchLabStore } from '../hooks'
import { MERCH_PRODUCTS } from '../constants/products'
import type { ShippingAddress } from '../types'

const STEPS = ['shipping', 'review', 'processing', 'confirmation'] as const

const COUNTRIES = [
  { code: 'US', name: 'United States' },
]

export function OrderModal() {
  const orderModalOpen = useMerchLabStore((s) => s.orderModalOpen)
  const setOrderModalOpen = useMerchLabStore((s) => s.setOrderModalOpen)
  const orderModalStep = useMerchLabStore((s) => s.orderModalStep)
  const setOrderModalStep = useMerchLabStore((s) => s.setOrderModalStep)
  const shippingAddress = useMerchLabStore((s) => s.shippingAddress)
  const setShippingAddress = useMerchLabStore((s) => s.setShippingAddress)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const selectedSize = useMerchLabStore((s) => s.selectedSize)
  const quantity = useMerchLabStore((s) => s.quantity)
  const pricePts = useMerchLabStore((s) => s.pricePts)
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const printifyOrderId = useMerchLabStore((s) => s.printifyOrderId)
  const setPrintifyOrderId = useMerchLabStore((s) => s.setPrintifyOrderId)
  const setIsOrdering = useMerchLabStore((s) => s.setIsOrdering)
  const resetOrder = useMerchLabStore((s) => s.resetOrder)

  const [orderError, setOrderError] = useState<string | null>(null)
  const [shippingForm, setShippingForm] = useState<ShippingAddress>({
    firstName: '', lastName: '', address1: '', address2: '',
    city: '', state: '', zip: '', country: 'US', phone: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
  const activeDesign = generatedDesigns[activeDesignIndex]
  const stepIndex = STEPS.indexOf(orderModalStep)

  if (!orderModalOpen) return null

  const validateShipping = () => {
    const required = ['firstName', 'lastName', 'address1', 'city', 'state', 'zip', 'country']
    const errors: Record<string, boolean> = {}
    let valid = true
    for (const field of required) {
      if (!shippingForm[field as keyof ShippingAddress]?.trim()) {
        errors[field] = true
        valid = false
      }
    }
    setFieldErrors(errors)
    return valid
  }

  const handleShippingSubmit = () => {
    if (!validateShipping()) return
    setShippingAddress(shippingForm)
    setOrderModalStep('review')
  }

  const handleConfirmOrder = async () => {
    setOrderModalStep('processing')
    setIsOrdering(true)
    setOrderError(null)

    try {
      const res = await fetch('/api/merch-lab/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blueprintId: selectedProductId,
          designUrl: activeDesign?.url,
          color: selectedColor,
          size: selectedSize,
          quantity,
          shippingAddress: shippingForm,
          category: product?.category ?? 'apparel',
          designPosition: useMerchLabStore.getState().designPosition,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Order failed')
      }

      const data = await res.json()
      setPrintifyOrderId(data.orderId)
      setOrderModalStep('confirmation')
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Order failed')
      setOrderModalStep('review')
    } finally {
      setIsOrdering(false)
    }
  }

  const handleClose = () => {
    setOrderModalOpen(false)
    if (orderModalStep === 'confirmation') resetOrder()
    setOrderModalStep('shipping')
    setOrderError(null)
    setFieldErrors({})
  }

  const inputClass = 'w-full rounded-lg border border-border/50 bg-card/30 px-3 py-2 text-sm focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20'
  const labelClass = 'text-[11px] font-medium text-muted-foreground/70 mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-border/30 bg-background p-6 shadow-2xl"
      >
        <button onClick={handleClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <div className="mb-2 text-lg font-semibold">Order {product?.name}</div>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-amber-500' : 'bg-border/30'}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {orderModalStep === 'shipping' && (
            <motion.div key="shipping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input className={`${inputClass} ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                      value={shippingForm.firstName} onChange={(e) => setShippingForm({ ...shippingForm, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input className={`${inputClass} ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                      value={shippingForm.lastName} onChange={(e) => setShippingForm({ ...shippingForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Address *</label>
                  <input className={`${inputClass} ${fieldErrors.address1 ? 'border-red-500' : ''}`}
                    value={shippingForm.address1} onChange={(e) => setShippingForm({ ...shippingForm, address1: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Address Line 2</label>
                  <input className={inputClass}
                    value={shippingForm.address2} onChange={(e) => setShippingForm({ ...shippingForm, address2: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>City *</label>
                    <input className={`${inputClass} ${fieldErrors.city ? 'border-red-500' : ''}`}
                      value={shippingForm.city} onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>State *</label>
                    <input className={`${inputClass} ${fieldErrors.state ? 'border-red-500' : ''}`}
                      value={shippingForm.state} onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP *</label>
                    <input className={`${inputClass} ${fieldErrors.zip ? 'border-red-500' : ''}`}
                      value={shippingForm.zip} onChange={(e) => setShippingForm({ ...shippingForm, zip: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Country *</label>
                    <select className={inputClass} value={shippingForm.country}
                      onChange={(e) => setShippingForm({ ...shippingForm, country: e.target.value })}>
                      {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Phone</label>
                    <input className={inputClass}
                      value={shippingForm.phone} onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })} />
                  </div>
                </div>
              </div>
              <button onClick={handleShippingSubmit}
                className="mt-5 w-full rounded-[10px] bg-gradient-to-r from-amber-600 to-amber-500 py-2.5 text-sm font-semibold text-white">
                Continue to Review
              </button>
            </motion.div>
          )}

          {orderModalStep === 'review' && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {orderError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {orderError}
                </div>
              )}
              <div className="space-y-2 rounded-xl border border-border/30 bg-card/20 p-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{product?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Color</span><span>{selectedColor}</span></div>
                {selectedSize && <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{selectedSize}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Quantity</span><span>{quantity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ship to</span><span>{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.zip}</span></div>
                <div className="border-t border-border/20 pt-2 flex justify-between font-semibold text-amber-400">
                  <span>Total</span><span>{(pricePts ?? 0) * quantity} pts</span>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={() => setOrderModalStep('shipping')}
                  className="flex-1 rounded-[10px] border border-border/30 py-2.5 text-sm font-medium hover:bg-card/60">
                  Back
                </button>
                <button onClick={handleConfirmOrder}
                  className="flex-1 rounded-[10px] bg-gradient-to-r from-emerald-600 to-emerald-500 py-2.5 text-sm font-semibold text-white">
                  Confirm &amp; Pay
                </button>
              </div>
            </motion.div>
          )}

          {orderModalStep === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Submitting your order to Printify...</p>
            </motion.div>
          )}

          {orderModalStep === 'confirmation' && (
            <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">Order Submitted!</div>
                <p className="mt-1 text-sm text-muted-foreground">Your merch is being printed and will ship soon.</p>
                {printifyOrderId && (
                  <p className="mt-2 text-xs text-muted-foreground/50">Order ID: {printifyOrderId}</p>
                )}
              </div>
              <button onClick={handleClose}
                className="mt-2 rounded-[10px] bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white">
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
