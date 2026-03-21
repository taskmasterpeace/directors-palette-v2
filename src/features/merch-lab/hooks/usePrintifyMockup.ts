import { useEffect, useRef, useCallback } from 'react'
import { useMerchLabStore } from './useMerchLabStore'
import { MERCH_PRODUCTS } from '../constants/products'

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 45000

export function usePrintifyMockup() {
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const variants = useMerchLabStore((s) => s.variants)

  const setMockupProductId = useMerchLabStore((s) => s.setMockupProductId)
  const setMockupUploadId = useMerchLabStore((s) => s.setMockupUploadId)
  const setMockupImages = useMerchLabStore((s) => s.setMockupImages)
  const setIsLoadingMockup = useMerchLabStore((s) => s.setIsLoadingMockup)

  const requestIdRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const activeDesign = generatedDesigns[activeDesignIndex]

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = undefined
    }
  }, [])

  const pollForMockup = useCallback(async (productId: string, reqId: number, startTime: number) => {
    if (requestIdRef.current !== reqId) return

    try {
      const res = await fetch(`/api/merch-lab/mockup?productId=${productId}`)
      if (!res.ok) {
        console.warn('[Mockup] Poll failed:', res.status)
        throw new Error('Poll failed')
      }

      const data = await res.json()

      if (requestIdRef.current !== reqId) return

      if (data.ready && data.images.length > 0) {
        console.log('[Mockup] Images ready:', data.images.length)
        setMockupImages(data.images)
        setIsLoadingMockup(false)
        return
      }

      if (Date.now() - startTime > POLL_TIMEOUT) {
        console.warn('[Mockup] Poll timeout after', POLL_TIMEOUT, 'ms')
        setIsLoadingMockup(false)
        return
      }

      pollTimerRef.current = setTimeout(() => pollForMockup(productId, reqId, startTime), POLL_INTERVAL)
    } catch (err) {
      console.error('[Mockup] Poll error:', err)
      if (requestIdRef.current === reqId) {
        setIsLoadingMockup(false)
      }
    }
  }, [setMockupImages, setIsLoadingMockup])

  // Only trigger on design URL + product + color changes (not designPosition or mockupUploadId)
  const activeDesignUrl = activeDesign?.url
  const activeDesignId = activeDesign?.id

  useEffect(() => {
    if (!activeDesignUrl || !selectedProductId || !selectedColor) {
      cleanup()
      return
    }

    const matchingVariant = variants.find((v) => v.color === selectedColor)
    if (!matchingVariant) {
      console.warn('[Mockup] No matching variant for color:', selectedColor)
      return
    }

    const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
    const designStyle = product?.designStyles[0] ?? 'center'
    const reqId = ++requestIdRef.current
    const currentDesignPosition = useMerchLabStore.getState().designPosition
    // Read mockupUploadId imperatively to avoid re-triggering when it updates
    const existingUploadId = useMerchLabStore.getState().mockupUploadId

    cleanup()
    setMockupImages([])
    setIsLoadingMockup(true)
    setMockupProductId(null)

    console.log('[Mockup] Creating mockup for', { blueprintId: selectedProductId, color: selectedColor, designStyle })

    const createMockup = async () => {
      try {
        const res = await fetch('/api/merch-lab/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blueprintId: selectedProductId,
            variantId: matchingVariant.id,
            designUrl: activeDesignUrl,
            designPosition: currentDesignPosition,
            designStyle,
            existingUploadId: existingUploadId ?? undefined,
          }),
        })

        if (requestIdRef.current !== reqId) return

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          console.error('[Mockup] Create failed:', res.status, errData)
          setIsLoadingMockup(false)
          return
        }

        const data = await res.json()
        console.log('[Mockup] Draft product created:', data.printifyProductId)
        setMockupProductId(data.printifyProductId)
        setMockupUploadId(data.uploadId)

        pollForMockup(data.printifyProductId, reqId, Date.now())
      } catch (err) {
        console.error('[Mockup] Create error:', err)
        if (requestIdRef.current === reqId) {
          setIsLoadingMockup(false)
        }
      }
    }

    createMockup()

    return cleanup
  }, [activeDesignUrl, activeDesignId, selectedProductId, selectedColor, variants, cleanup, setMockupImages, setIsLoadingMockup, setMockupProductId, setMockupUploadId, pollForMockup])

  useEffect(() => cleanup, [cleanup])
}
