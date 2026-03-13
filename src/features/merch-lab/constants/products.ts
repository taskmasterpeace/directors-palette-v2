import type { PrintifyProduct } from '../types'

export const MERCH_PRODUCTS: PrintifyProduct[] = [
  // --- Apparel (placed designs) ---
  {
    blueprintId: 12,
    name: 'T-Shirt',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  {
    blueprintId: 77,
    name: 'Hoodie',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['center', 'left-chest', 'back'],
    hasSizes: true,
    hasFrontBack: true,
  },
  // --- Apparel (all-over-print) ---
  {
    blueprintId: 281,
    name: 'AOP T-Shirt',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['all-over'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 450,
    name: 'AOP Hoodie',
    icon: 'Shirt',
    category: 'apparel',
    designStyles: ['all-over'],
    hasSizes: true,
    hasFrontBack: false,
  },
  // --- Wall Art ---
  {
    blueprintId: 282,
    name: 'Poster',
    icon: 'Image',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 937,
    name: 'Canvas Print',
    icon: 'Frame',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 532,
    name: 'Puzzle',
    icon: 'Puzzle',
    category: 'wall-art',
    designStyles: ['full-bleed'],
    hasSizes: true,
    hasFrontBack: false,
  },
  // --- Accessories ---
  {
    blueprintId: 478,
    name: 'Mug 11oz',
    icon: 'Coffee',
    category: 'accessory',
    designStyles: ['wrap'],
    hasSizes: false,
    hasFrontBack: false,
  },
  {
    blueprintId: 400,
    name: 'Stickers',
    icon: 'Sticker',
    category: 'accessory',
    designStyles: ['center'],
    hasSizes: true,
    hasFrontBack: false,
  },
  {
    blueprintId: 413,
    name: 'AOP Backpack',
    icon: 'Backpack',
    category: 'accessory',
    designStyles: ['all-over'],
    hasSizes: false,
    hasFrontBack: false,
  },
]

export const PRINTIFY_PROVIDERS: Record<number, number> = {
  12: 99,    // T-Shirt — Printify Choice
  77: 99,    // Hoodie — Printify Choice
  281: 10,   // AOP T-Shirt — MWW On Demand
  450: 10,   // AOP Hoodie — MWW On Demand
  282: 99,   // Poster — Printify Choice
  937: 105,  // Canvas Print — Jondo
  532: 59,   // Puzzle — Imagine Your Photos
  478: 99,   // Mug — Printify Choice
  400: 99,   // Stickers — Printify Choice
  413: 10,   // AOP Backpack — MWW On Demand
}

export const MARGIN_MULTIPLIER = 1.25
export const MAX_QUANTITY = 25

export const PRODUCT_CATEGORIES = [
  { id: 'apparel', label: 'Apparel' },
  { id: 'wall-art', label: 'Wall Art' },
  { id: 'accessory', label: 'Accessories' },
] as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]['id']
