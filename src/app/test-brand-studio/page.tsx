'use client'

import dynamic from 'next/dynamic'

const BrandStudioLayout = dynamic(
  () => import('@/features/brand-studio').then(m => ({ default: m.BrandStudioLayout })),
  { ssr: false }
)

export default function TestBrandStudio() {
  return (
    <div className="h-screen w-full bg-background text-foreground">
      <BrandStudioLayout />
    </div>
  )
}
