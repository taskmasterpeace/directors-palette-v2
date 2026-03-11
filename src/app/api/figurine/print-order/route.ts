import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { isAdminEmail } from '@/features/admin/types/admin.types'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'
import { shapewaysService } from '@/features/figurine-studio/services/shapeways.service'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    const userIsAdmin = isAdminEmail(user.email)

    if (!userIsAdmin) {
      const rl = checkRateLimit(`print-order:${user.id}`, RATE_LIMITS.PRINT_ORDER)
      if (!rl.allowed) {
        const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000)
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.', retryAfter },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
    }

    const {
      shapewaysModelId,
      materialId,
      materialName,
      sizeCm,
      shapewaysPrice,
      ourPricePts,
      shippingAddress,
      figurineId,
      dimensions,
    } = await request.json()

    // Validate required fields
    if (!shapewaysModelId || !materialId || !materialName || !sizeCm || !ourPricePts || !shippingAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate shipping address
    const { firstName, lastName, address1, city, state, zip, country, phone } = shippingAddress
    if (!firstName || !lastName || !address1 || !city || !state || !zip || !country || !phone) {
      return NextResponse.json(
        { error: 'Incomplete shipping address' },
        { status: 400 }
      )
    }

    // Check credits (admins still pay for physical prints per spec)
    const balance = await creditsService.getBalance(user.id)
    const currentBalance = balance?.balance ?? 0
    if (currentBalance < ourPricePts) {
      return NextResponse.json(
        {
          error: 'Insufficient pts',
          details: `You need ${ourPricePts} pts but only have ${currentBalance}.`,
          required: ourPricePts,
          balance: currentBalance,
        },
        { status: 402 }
      )
    }

    lognog.info('figurine_print_order_started', {
      type: 'business',
      user_id: user.id,
      material_id: materialId,
      size_cm: sizeCm,
      pts_cost: ourPricePts,
    })

    // Place order on Shapeways
    const orderResult = await shapewaysService.placeOrder(
      shapewaysModelId,
      materialId,
      shippingAddress
    )

    // Atomic pts deduction AFTER successful order
    await creditsService.deductCredits(user.id, 'shapeways-print', {
      generationType: 'image',
      predictionId: orderResult.orderId,
      description: `Physical figurine print: ${materialName} ${sizeCm}cm`,
      overrideAmount: ourPricePts,
      user_email: user.email,
    })

    // Save order to DB
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { error: insertError } = await supabaseAdmin
      .from('figurine_print_orders')
      .insert({
        user_id: user.id,
        figurine_id: figurineId || null,
        shapeways_model_id: shapewaysModelId,
        shapeways_order_id: orderResult.orderId,
        material_id: materialId,
        material_name: materialName,
        size_cm: sizeCm,
        shapeways_price: shapewaysPrice,
        our_price_pts: ourPricePts,
        status: 'pending',
        shipping_address: shippingAddress,
        dimensions: dimensions || null,
      })

    if (insertError) {
      lognog.error('figurine_print_order_db_error', {
        type: 'error',
        error: insertError.message,
        user_id: user.id,
        shapeways_order_id: orderResult.orderId,
      })
      // Order was placed and pts deducted — log but don't fail the response
    }

    lognog.info('figurine_print_order_completed', {
      type: 'business',
      user_id: user.id,
      shapeways_order_id: orderResult.orderId,
      material_id: materialId,
      size_cm: sizeCm,
      pts_charged: ourPricePts,
    })

    return NextResponse.json({
      success: true,
      orderId: orderResult.orderId,
      status: orderResult.status,
      ptsCharged: ourPricePts,
    })
  } catch (error) {
    lognog.error('figurine_print_order_error', {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to place order' },
      { status: 500 }
    )
  }
}
