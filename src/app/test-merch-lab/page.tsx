'use client'

import dynamic from 'next/dynamic'

const MerchLab = dynamic(
  () => import('@/features/merch-lab').then(m => ({ default: m.MerchLab })),
  { ssr: false }
)

export default function TestMerchLab() {
  return (
    <div className="h-screen w-full bg-background text-foreground">
      <MerchLab />
    </div>
  )
}
