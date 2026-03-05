import { ImageResponse } from 'next/og'
import { getAPIClient } from '@/lib/db/client'

export const runtime = 'nodejs'
export const alt = "Created with Director's Palette"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params

  const supabase = await getAPIClient()
  const { data: image } = await supabase
    .from('gallery')
    .select('public_url')
    .eq('share_id', shareId)
    .single()

  const imageUrl = image?.public_url

  // Fetch font from public directory (reliable on Vercel)
  const fontUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://directorspal.com' : 'http://localhost:3002'}/fonts/BebasNeue-Regular.ttf`
  const fontData = await fetch(fontUrl).then((res) => res.arrayBuffer())

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          position: 'relative',
        }}
      >
        {/* Cinematic border frame */}
        <div
          style={{
            position: 'absolute',
            inset: '0',
            border: '3px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '0',
            display: 'flex',
          }}
        />

        {/* User image centered with padding */}
        {imageUrl && (
          <div
            style={{
              display: 'flex',
              width: '1140px',
              height: '540px',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '8px',
            }}
          >
            <img
              src={imageUrl}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {/* Bottom branding bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '56px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontFamily: 'Bebas Neue',
              fontSize: '24px',
              color: '#f59e0b',
              letterSpacing: '0.1em',
            }}
          >
            {"CREATED WITH DIRECTOR'S PALETTE"}
          </span>
          <span
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            directorspal.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Bebas Neue',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  )
}
