import { useEffect, useRef, useCallback } from 'react'
import { useMerchLabStore } from './useMerchLabStore'
import { MERCH_PRODUCTS } from '../constants/products'

const POLL_INTERVAL = 2000
const POLL_TIMEOUT = 30000

export function usePrintifyMockup() {
  const generatedDesigns = useMerchLabStore((s) => s.generatedDesigns)
  const activeDesignIndex = useMerchLabStore((s) => s.activeDesignIndex)
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const designPosition = useMerchLabStore((s) => s.designPosition)
  const variants = useMerchLabStore((s) => s.variants)
  const mockupUploadId = useMerchLabStore((s) => s.mockupUploadId)

  const setMockupProductId = useMerchLabStore((s) => s.setMockupProductId)
  const setMockupUploadId = useMerchLabStore((s) => s.setMockupUploadId)
  const setMockupImages = useMerchLabStore((s) => s.setMockupImages)
  const setIsLoadingMockup = useMerchLabStore((s) => s.setIsLoadingMockup)

  const requestIdRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const activeDesign = generatedDesigns[activeDesignIndex]
  const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)

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
      if (!res.ok) throw new Error('Poll failed')

      const data = await res.json()

      if (requestIdRef.current !== reqId) return

      if (data.ready && data.images.length > 0) {
        setMockupImages(data.images)
        setIsLoadingMockup(false)
        return
      }

      if (Date.now() - startTime > POLL_TIMEOUT) {
        setIsLoadingMockup(false)
        return
      }

      pollTimerRef.current = setTimeout(() => pollForMockup(productId, reqId, startTime), POLL_INTERVAL)
    } catch {
      if (requestIdRef.current === reqId) {
        setIsLoadingMockup(false)
      }
    }
  }, [setMockupImages, setIsLoadingMockup])

  useEffect(() => {
    if (!activeDesign?.url || !selectedProductId || !selectedColor) {
      cleanup()
      return
    }

    const matchingVariant = variants.find((v) => v.color === selectedColor)
    if (!matchingVariant) return

    const designStyle = product?.designStyles[0] ?? 'center'
    const reqId = ++requestIdRef.current

    cleanup()
    setMockupImages([])
    setIsLoadingMockup(true)
    setMockupProductId(null)

    const createMockup = async () => {
      try {
        const res = await fetch('/api/merch-lab/mockup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blueprintId: selectedProductId,
            variantId: matchingVariant.id,
            designUrl: activeDesign.url,
            designPosition,
            designStyle,
            existingUploadId: mockupUploadId ?? undefined,
          }),
        })

        if (requestIdRef.current !== reqId) return

        if (!res.ok) {
          setIsLoadingMockup(false)
          return
        }

        const data = await res.json()
        setMockupProductId(data.printifyProductId)
        setMockupUploadId(data.uploadId)

        pollForMockup(data.printifyProductId, reqId, Date.now())
      } catch {
        if (requestIdRef.current === reqId) {
          setIsLoadingMockup(false)
        }
      }
    }

    createMockup()

    return cleanup
  }, [activeDesign?.url, activeDesign?.id, selectedProductId, selectedColor, variants, product, designPosition, mockupUploadId, cleanup, setMockupImages, setIsLoadingMockup, setMockupProductId, setMockupUploadId, pollForMockup])

  useEffect(() => cleanup, [cleanup])
}
