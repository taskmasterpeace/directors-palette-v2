import { NextResponse } from 'next/server'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS } from '@/features/merch-lab/constants/products'

export const maxDuration = 30

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN

// Simple in-memory cache: blueprintId -> { data, timestamp }
const cache = new Map<number, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Printify doesn't return hex values — map common color names to hex
const COLOR_HEX_MAP: Record<string, string> = {
  'Black': '#1a1a1a', 'White': '#FFFFFF', 'Navy': '#1e3a5f',
  'Red': '#DC2626', 'Royal': '#2563EB', 'Sport Grey': '#9CA3AF',
  'Dark Heather': '#4B5563', 'Ash': '#D1D5DB', 'Irish Green': '#16A34A',
  'Forest Green': '#166534', 'Maroon': '#7F1D1D', 'Orange': '#EA580C',
  'Gold': '#CA8A04', 'Purple': '#7C3AED', 'Sand': '#D2B48C',
  'Light Blue': '#93C5FD', 'Light Pink': '#F9A8D4', 'Heliconia': '#EC4899',
  'Cardinal Red': '#991B1B', 'Sapphire': '#1D4ED8', 'Military Green': '#4D7C0F',
  'Charcoal': '#374151', 'Heather': '#9CA3AF', 'Natural': '#FEFCE8',
  'Carolina Blue': '#60A5FA', 'Indigo Blue': '#4338CA', 'Daisy': '#FACC15',
  'Antique Cherry Red': '#B91C1C', 'Antique Sapphire': '#1E40AF',
  'Aqua': '#06B6D4', 'Azalea': '#F472B6', 'Berry': '#A21CAF',
  'Garnet': '#881337', 'Graphite Heather': '#6B7280', 'Ice Grey': '#E5E7EB',
  'Iris': '#818CF8', 'Kelly Green': '#15803D', 'Kiwi': '#84CC16',
  'Midnight': '#0F172A', 'Mint Green': '#86EFAC', 'Old Gold': '#B45309',
  'Olive': '#65A30D', 'Orchid': '#D946EF', 'Safety Green': '#65A30D',
  'Safety Orange': '#EA580C', 'Tan': '#D2B48C', 'Tropical Blue': '#38BDF8',
  'Turf Green': '#16A34A', 'Violet': '#7C3AED', 'Yellow Haze': '#FDE047',
  'Cherry Red': '#DC2626', 'Cornsilk': '#FEF3C7', 'Heather Sapphire': '#3B82F6',
  'Brown Savana': '#78350F', 'Tweed': '#A8A29E', 'Dark Chocolate': '#3B1F0B',
  'Russet': '#92400E', 'Stone Blue': '#64748B', 'Prairie Dust': '#C2B280',
  'Sunset': '#F59E0B', 'Seafoam': '#5EEAD4', 'Coral Silk': '#FB7185',
  'Default': '#6B7280',
}

function colorToHex(name: string): string {
  return COLOR_HEX_MAP[name] ?? COLOR_HEX_MAP[name.split(' ').map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ')] ?? '#6B7280'
}

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
      const colorName = opts.color ?? 'Default'
      return {
        id: v.id,
        title: v.title,
        color: colorName,
        colorHex: colorToHex(colorName),
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

