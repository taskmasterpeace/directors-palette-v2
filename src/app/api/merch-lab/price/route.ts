import { NextResponse } from 'next/server'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS, MARGIN_MULTIPLIER } from '@/features/merch-lab/constants/products'

export const maxDuration = 30

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN?.replace(/\s+/g, '')

// Estimated shipping costs in cents by product category
const ESTIMATED_SHIPPING: Record<string, number> = {
  apparel: 499,    // $4.99
  accessory: 399,  // $3.99
  drinkware: 599,  // $5.99
  sticker: 299,    // $2.99
}

// 1 pt = 1 cent (verified from credits system: centsToTokens is 1:1)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const blueprintId = Number(searchParams.get('blueprintId'))
    const variantId = Number(searchParams.get('variantId'))
    const category = searchParams.get('category') ?? 'apparel'

    if (!blueprintId || !variantId) {
      return NextResponse.json({ error: 'blueprintId and variantId required' }, { status: 400 })
    }

    const providerId = PRINTIFY_PROVIDERS[blueprintId]

    // Fetch current variant pricing from Printify
    const res = await fetch(
      `${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    )

    if (!res.ok) throw new Error(`Printify API error: ${res.status}`)

    const data = await res.json()
    const variant = data.variants?.find((v: { id: number }) => v.id === variantId)

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    const baseCostCents = variant.price
    const shippingCents = ESTIMATED_SHIPPING[category] ?? 499
    const totalCents = Math.ceil((baseCostCents + shippingCents) * MARGIN_MULTIPLIER)
    const pricePts = totalCents // 1 pt = 1 cent

    return NextResponse.json({
      baseCostCents,
      shippingCents,
      totalCents,
      pricePts,
      marginMultiplier: MARGIN_MULTIPLIER,
    })
  } catch (error) {
    lognog.error('merch_price_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price' },
      { status: 500 }
    )
  }
}
