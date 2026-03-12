import { NextResponse } from 'next/server'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS } from '@/features/merch-lab/constants/products'

export const maxDuration = 30

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN

// Simple in-memory cache: blueprintId -> { data, timestamp }
const cache = new Map<number, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const blueprintId = Number(searchParams.get('blueprintId'))

    if (!blueprintId || !PRINTIFY_PROVIDERS[blueprintId]) {
      return NextResponse.json({ error: 'Invalid blueprint ID' }, { status: 400 })
    }

    // Check cache
    const cached = cache.get(blueprintId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const providerId = PRINTIFY_PROVIDERS[blueprintId]

    // Fetch variants from Printify
    const res = await fetch(
      `${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    )

    if (!res.ok) {
      throw new Error(`Printify API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()

    // Transform into our variant format using structured options fields
    const variants = data.variants?.map((v: { id: number; title: string; options: Record<string, string>; price: number }) => {
      const opts = v.options ?? {}
      return {
        id: v.id,
        title: v.title,
        color: opts.color ?? 'Default',
        colorHex: opts.color ? '#333333' : '#333333', // Printify doesn't provide hex — UI fetches swatches separately
        size: opts.size ?? 'One Size',
        price: v.price,
      }
    }) ?? []

    const result = { blueprintId, providerId, variants }

    // Cache result
    cache.set(blueprintId, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    lognog.error('merch_products_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

