import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getAPIClient } from '@/lib/db/client'
import { SharePageClient } from './SharePageClient'

interface SharePageProps {
  params: Promise<{ shareId: string }>
}

async function getShareData(shareId: string) {
  const supabase = await getAPIClient()

  const { data: image, error } = await supabase
    .from('gallery')
    .select('public_url, metadata, created_at')
    .eq('share_id', shareId)
    .single()

  if (error || !image) return null

  const metadata = image.metadata as Record<string, unknown> | null

  return {
    publicUrl: image.public_url,
    prompt: metadata?.prompt as string | undefined,
    model: metadata?.model as string | undefined,
    source: metadata?.source as string | undefined,
    createdAt: image.created_at,
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params
  const data = await getShareData(shareId)

  if (!data) {
    return { title: 'Not Found - Director\'s Palette' }
  }

  const title = 'Created with Director\'s Palette'
  const description = data.prompt
    ? `"${data.prompt.slice(0, 150)}${data.prompt.length > 150 ? '...' : ''}"`
    : 'AI-generated cinematic imagery'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      siteName: "Director's Palette",
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params
  const data = await getShareData(shareId)

  if (!data) {
    notFound()
  }

  return (
    <SharePageClient
      publicUrl={data.publicUrl}
      prompt={data.prompt}
      model={data.model}
      source={data.source}
      createdAt={data.createdAt}
    />
  )
}
