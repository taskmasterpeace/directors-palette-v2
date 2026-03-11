import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { lognog } from '@/lib/lognog'
import { convertToObj } from '@/features/figurine-studio/services/glb-converter.service'
import JSZip from 'jszip'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email)

    if (!userIsAdmin) {
      const rl = checkRateLimit(`figurine-obj:${user.id}`, RATE_LIMITS.PRINT_QUOTE)
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    }

    const { glbUrl } = await request.json()
    if (!glbUrl) {
      return NextResponse.json({ error: 'glbUrl is required' }, { status: 400 })
    }

    lognog.info('figurine_obj_convert_started', {
      type: 'business',
      user_id: user.id,
    })

    // Convert GLB to OBJ at original scale (no scaling for download)
    const result = await convertToObj(glbUrl, null)

    // Create ZIP with OBJ + MTL + texture
    const zip = new JSZip()
    zip.file('figurine.obj', result.obj)
    zip.file('figurine.mtl', result.mtl)
    if (result.texture) {
      zip.file('texture.png', result.texture)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    lognog.info('figurine_obj_convert_completed', {
      type: 'business',
      user_id: user.id,
      size_bytes: zipBuffer.length,
    })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="figurine-obj.zip"',
      },
    })
  } catch (error) {
    lognog.error('figurine_obj_convert_error', {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Conversion failed' },
      { status: 500 }
    )
  }
}
