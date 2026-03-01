import type { Brand } from '../types'

const BASE = '/api/brand-studio'

export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch(`${BASE}/brands`)
  if (!res.ok) throw new Error('Failed to fetch brands')
  return res.json()
}

export async function createBrand(data: {
  name: string
  logo_url?: string
  raw_company_info?: string
}): Promise<Brand> {
  const res = await fetch(`${BASE}/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create brand')
  }
  return res.json()
}

export async function updateBrand(data: Partial<Brand> & { id: string }): Promise<Brand> {
  const res = await fetch(`${BASE}/brands`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update brand')
  }
  return res.json()
}

export async function generateBrandGuide(data: {
  brand_id: string
  logo_url?: string | null
  company_description: string
}): Promise<Brand> {
  const res = await fetch(`${BASE}/generate-brand-guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Brand guide generation failed')
  }
  return res.json()
}
