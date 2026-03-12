import type { PrintifyProduct } from '../types'

export const MERCH_PRODUCTS: PrintifyProduct[] = [
  {
    blueprintId: 12,
    name: 'T-Shirt',
    icon: '👕',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  {
    blueprintId: 77,
    name: 'Hoodie',
    icon: '🧥',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  {
    blueprintId: 49,
    name: 'Crewneck',
    icon: '👔',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  {
    blueprintId: 507,
    name: 'Tote Bag',
    icon: '👜',
    category: 'accessory',
    designStyles: ['all-over'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 478,
    name: 'Mug',
    icon: '☕',
    category: 'drinkware',
    designStyles: ['wrap'],
    hasSizes: false,
    hasFrontBack: false,
  },
  {
    blueprintId: 400,
    name: 'Stickers',
    icon: '🏷️',
    category: 'sticker',
    designStyles: ['center'],
    hasSizes: false,
    hasFrontBack: false,
  },
]

// Preferred print providers per blueprint (update after Printify account setup)
export const PRINTIFY_PROVIDERS: Record<number, number> = {
  12: 99,   // T-Shirt — Printify Choice (996 variants, 125 colors)
  77: 99,   // Hoodie — Printify Choice (274 variants, 36 colors)
  49: 99,   // Crewneck — Printify Choice (257 variants, 8 colors)
  507: 48,  // Tote Bag — Colorway (15 variants, 5 colors x 3 sizes)
  478: 99,  // Mug — Printify Choice (2 variants: 11oz, 15oz)
  400: 99,  // Stickers — Printify Choice (4 variants: 2"/3"/4"/5.5")
}

export const MARGIN_MULTIPLIER = 1.25
export const MAX_QUANTITY = 25
