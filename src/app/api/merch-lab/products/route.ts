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

    // Transform into our variant format
    const variants = data.variants?.map((v: Record<string, unknown>) => ({
      id: v.id,
      title: v.title,
      color: extractColor(v.title as string),
      colorHex: extractColorHex(v.options as Record<string, unknown>),
      size: extractSize(v.title as string),
      price: v.price,
    })) ?? []

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

// Helpers to parse Printify variant titles (format: "Black / S", "White / M", etc.)
function extractColor(title: string): string {
  return title.split('/')[0]?.trim() ?? title
}

function extractSize(title: string): string {
  const parts = title.split('/')
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'One Size'
}

function extractColorHex(options: Record<string, unknown>): string {
  if (options?.color) return String(options.color)
  return '#333333'
}
