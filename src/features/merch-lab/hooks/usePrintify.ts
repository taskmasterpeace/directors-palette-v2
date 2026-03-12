import { useEffect } from 'react'
import { useMerchLabStore } from './useMerchLabStore'
import { MERCH_PRODUCTS } from '../constants/products'

export function usePrintify() {
  const selectedProductId = useMerchLabStore((s) => s.selectedProductId)
  const selectedColor = useMerchLabStore((s) => s.selectedColor)
  const selectedSize = useMerchLabStore((s) => s.selectedSize)
  const variants = useMerchLabStore((s) => s.variants)
  const setVariants = useMerchLabStore((s) => s.setVariants)
  const setIsLoadingCatalog = useMerchLabStore((s) => s.setIsLoadingCatalog)
  const setPricePts = useMerchLabStore((s) => s.setPricePts)

  // Fetch variants when product changes
  useEffect(() => {
    if (!selectedProductId) return
    let cancelled = false

    const fetchVariants = async () => {
      setIsLoadingCatalog(true)
      try {
        const res = await fetch(`/api/merch-lab/products?blueprintId=${selectedProductId}`)
        if (!res.ok) throw new Error('Failed to fetch products')
        const data = await res.json()
        if (!cancelled) setVariants(data.variants ?? [])
      } catch {
        if (!cancelled) setVariants([])
      }
    }

    fetchVariants()
    return () => { cancelled = true }
  }, [selectedProductId, setVariants, setIsLoadingCatalog])

  // Fetch price when variant selection changes
  useEffect(() => {
    if (!selectedProductId || !selectedColor) {
      setPricePts(null)
      return
    }

    const product = MERCH_PRODUCTS.find((p) => p.blueprintId === selectedProductId)
    const matchingVariant = variants.find((v) => {
      const colorMatch = v.color === selectedColor
      const sizeMatch = !product?.hasSizes || v.size === selectedSize
      return colorMatch && sizeMatch
    })

    if (!matchingVariant) {
      setPricePts(null)
      return
    }

    let cancelled = false

    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `/api/merch-lab/price?blueprintId=${selectedProductId}&variantId=${matchingVariant.id}&category=${product?.category ?? 'apparel'}`
        )
        if (!res.ok) throw new Error('Failed to fetch price')
        const data = await res.json()
        if (!cancelled) setPricePts(data.pricePts)
      } catch {
        if (!cancelled) setPricePts(null)
      }
    }

    fetchPrice()
    return () => { cancelled = true }
  }, [selectedProductId, selectedColor, selectedSize, variants, setPricePts])
}
