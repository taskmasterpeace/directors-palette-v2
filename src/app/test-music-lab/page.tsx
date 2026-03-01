'use client'

import dynamic from 'next/dynamic'

const MusicLabHub = dynamic(
  () => import('@/features/music-lab/components/MusicLabHub').then(m => ({ default: m.MusicLabHub })),
  { ssr: false }
)

export default function TestMusicLab() {
  // Use a test userId - the components will work with any string for rendering
  const testUserId = 'test-user-screenshots'

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col">
      <div className="p-2 bg-card/50 text-xs text-muted-foreground border-b border-border/50">
        Test: Music Lab Hub (Artist Chat + Sound Studio)
      </div>
      <div className="flex-1 overflow-hidden">
        <MusicLabHub userId={testUserId} />
      </div>
    </div>
  )
}
