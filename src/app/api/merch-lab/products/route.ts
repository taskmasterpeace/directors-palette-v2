import { NextResponse } from 'next/server'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS } from '@/features/merch-lab/constants/products'

export const maxDuration = 30

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN?.replace(/\s+/g, '')

// Simple in-memory cache: blueprintId -> { data, timestamp }
const cache = new Map<number, { data: unknown; timestamp: number }>()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

// Printify doesn't return hex values — comprehensive color name → hex mapping
const COLOR_HEX_MAP: Record<string, string> = {
  // Core colors
  'Black': '#1a1a1a', 'White': '#FFFFFF', 'Red': '#DC2626', 'Orange': '#EA580C',
  'Gold': '#CA8A04', 'Yellow': '#EAB308', 'Pink': '#EC4899', 'Fuchsia': '#D946EF',
  'Coral': '#F87171', 'Peach': '#FDBA74', 'Mauve': '#C084FC', 'Lilac': '#D8B4FE',
  'Rust': '#B45309', 'Mint': '#86EFAC', 'Sage': '#A3BE8C', 'Teal': '#0D9488',
  'Turquoise': '#2DD4BF', 'Silver': '#CBD5E1',

  // Blues
  'Navy': '#1e3a5f', 'Royal': '#2563EB', 'True Royal': '#2563EB', 'Ocean Blue': '#0369A1',
  'Light Blue': '#93C5FD', 'Baby Blue': '#BFDBFE', 'Steel Blue': '#64748B',
  'Columbia Blue': '#7DD3FC', 'Dusty Blue': '#94A3B8', 'Lavender Blue': '#A5B4FC',
  'Team Navy': '#1E3A5F',

  // Greens
  'Kelly': '#16A34A', 'Forest': '#166534', 'Leaf': '#4D7C0F', 'Olive': '#65A30D',
  'Dark Olive': '#3F6212', 'Military Green': '#4D7C0F', 'Evergreen': '#064E3B',
  'Synthetic Green': '#4ADE80',

  // Browns/Neutrals
  'Brown': '#78350F', 'Pebble Brown': '#92400E', 'Tan': '#D2B48C', 'Sand Dune': '#C2B280',
  'Natural': '#FEFCE8', 'Soft Cream': '#FEF9C3', 'Ash': '#D1D5DB',

  // Reds/Pinks
  'Maroon': '#7F1D1D', 'Cardinal': '#991B1B', 'Canvas Red': '#B91C1C',
  'Berry': '#A21CAF', 'Orchid': '#D946EF', 'Charity Pink': '#F9A8D4',
  'Soft Pink': '#FBCFE8', 'Oxblood Black': '#450A0A',

  // Greys
  'Dark Grey': '#4B5563', 'Dark Grey Heather': '#374151', 'Storm': '#6B7280',
  'Asphalt': '#374151', 'Solid Athletic Grey': '#9CA3AF', 'Solid Black Blend': '#27272A',
  'Solid White Blend': '#F5F5F5',

  // Burnt/Warm
  'Burnt Orange': '#C2410C', 'Autumn': '#B45309', 'Maize Yellow': '#FDE047',
  'Mustard': '#CA8A04', 'Citron': '#A3E635', 'Sunset': '#F59E0B',
  'Deep Teal': '#115E59',

  // Vintage
  'Vintage Black': '#27272A', 'Vintage White': '#FAF5EB', 'Army': '#4D7C0F',

  // Heathers (muted/mixed tones)
  'Athletic Heather': '#9CA3AF', 'Black Heather': '#3F3F46', 'Deep Heather': '#52525B',
  'Heather Aqua': '#67E8F9', 'Heather Autumn': '#D97706', 'Heather Blue': '#60A5FA',
  'Heather Blue Lagoon': '#22D3EE', 'Heather Brown': '#A16207', 'Heather Bubble Gum': '#F9A8D4',
  'Heather Cardinal': '#B91C1C', 'Heather Cement': '#A8A29E', 'Heather Charity Pink': '#F9A8D4',
  'Heather Clay': '#C2956A', 'Heather Columbia Blue': '#7DD3FC', 'Heather Cool Grey': '#9CA3AF',
  'Heather Deep Teal': '#0F766E', 'Heather Dust': '#D6D3D1', 'Heather Dusty Blue': '#94A3B8',
  'Heather Forest': '#166534', 'Heather Grass Green': '#4ADE80', 'Heather Green': '#22C55E',
  'Heather Ice Blue': '#BAE6FD', 'Heather Kelly': '#16A34A', 'Heather Maroon': '#7F1D1D',
  'Heather Mauve': '#C084FC', 'Heather Midnight Navy': '#1E3A5F', 'Heather Military Green': '#4D7C0F',
  'Heather Mint': '#86EFAC', 'Heather Mustard': '#CA8A04', 'Heather Navy': '#1E3A5F',
  'Heather Olive': '#65A30D', 'Heather Orange': '#EA580C', 'Heather Orchid': '#D946EF',
  'Heather Peach': '#FDBA74', 'Heather Prism Blue': '#60A5FA', 'Heather Prism Dusty Blue': '#94A3B8',
  'Heather Prism Ice Blue': '#BAE6FD', 'Heather Prism Lilac': '#D8B4FE',
  'Heather Prism Mint': '#86EFAC', 'Heather Prism Natural': '#FEF9C3',
  'Heather Prism Peach': '#FDBA74', 'Heather Prism Sunset': '#FBBF24',
  'Heather Purple': '#7C3AED', 'Heather Raspberry': '#BE185D', 'Heather Red': '#DC2626',
  'Heather Sand Dune': '#C2B280', 'Heather Sea Green': '#34D399', 'Heather Slate': '#64748B',
  'Heather Stone': '#A8A29E', 'Heather Storm': '#6B7280', 'Heather Sunset': '#FBBF24',
  'Heather Tan': '#D2B48C', 'Heather Team Purple': '#7C3AED', 'Heather True Royal': '#2563EB',
  'Heather Yellow Gold': '#CA8A04',

  // Printify Choice extras
  'Aqua': '#06B6D4', 'Team Purple': '#7C3AED',
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

    const bustCache = request.headers.get('x-bust-cache') === '1'
    if (bustCache) {
      cache.delete(blueprintId)
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

