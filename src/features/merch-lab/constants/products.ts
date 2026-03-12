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
    blueprintId: 375,
    name: 'Tote Bag',
    icon: '👜',
    category: 'accessory',
    designStyles: ['all-over'],
    hasSizes: false,
    hasFrontBack: true,
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
  12: 99,
  77: 99,
  49: 99,
  375: 99,
  478: 99,
  400: 99,
}

export const MARGIN_MULTIPLIER = 1.25
export const MAX_QUANTITY = 25
export const DESIGN_GENERATION_PTS = 5
