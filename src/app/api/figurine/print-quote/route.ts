import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { lognog } from '@/lib/lognog'
import { convertToObj } from '@/features/figurine-studio/services/glb-converter.service'
import { shapewaysService } from '@/features/figurine-studio/services/shapeways.service'

export const maxDuration = 120

// Material name mapping
const MATERIAL_NAMES: Record<number, string> = {
  317: 'PLA Basic',
  6: 'Nylon White',
  25: 'Nylon Black',
  231: 'Full Color Standard',
  232: 'Full Color Smooth',
}

// 30% markup, converted to pts at 100 pts/$1
function calculatePts(shapewaysPrice: number): number {
  const withMarkup = shapewaysPrice * 1.3
  return Math.ceil(withMarkup * 100)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email)

    if (!userIsAdmin) {
      const rl = checkRateLimit(`print-quote:${user.id}`, RATE_LIMITS.PRINT_QUOTE)
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    }

    const { glbUrl, sizeCm } = await request.json()
    if (!glbUrl || !sizeCm) {
      return NextResponse.json(
        { error: 'glbUrl and sizeCm are required' },
        { status: 400 }
      )
    }

    if (sizeCm !== 5 && sizeCm !== 10) {
      return NextResponse.json(
        { error: 'sizeCm must be 5 or 10' },
        { status: 400 }
      )
    }

    lognog.info('figurine_print_quote_started', {
      type: 'business',
      user_id: user.id,
      size_cm: sizeCm,
    })

    // Convert GLB to OBJ at requested scale
    const scaleMm = sizeCm * 10 // 5cm = 50mm, 10cm = 100mm
    const converted = await convertToObj(glbUrl, scaleMm)

    // Upload to Shapeways
    const modelInfo = await shapewaysService.uploadModel(
      converted.obj,
      'figurine.obj',
      'mm'
    )

    // Build pricing response with markup
    const materials = modelInfo.pricing.map(p => ({
      materialId: p.materialId,
      materialName: MATERIAL_NAMES[p.materialId] || `Material ${p.materialId}`,
      shapewaysPrice: p.price,
      ourPricePts: calculatePts(p.price),
    }))

    lognog.info('figurine_print_quote_completed', {
      type: 'business',
      user_id: user.id,
      size_cm: sizeCm,
      shapeways_model_id: modelInfo.modelId,
      materials_available: materials.length,
    })

    return NextResponse.json({
      success: true,
      shapewaysModelId: modelInfo.modelId,
      dimensions: modelInfo.dimensions,
      volume: modelInfo.volume,
      sizeCm,
      materials,
    })
  } catch (error) {
    lognog.error('figurine_print_quote_error', {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get quote' },
      { status: 500 }
    )
  }
}
