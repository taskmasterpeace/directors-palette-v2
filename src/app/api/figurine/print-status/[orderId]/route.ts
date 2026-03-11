import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { shapewaysService } from '@/features/figurine-studio/services/shapeways.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    // Verify user owns this order
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { data: order } = await supabaseAdmin
      .from('figurine_print_orders')
      .select('*')
      .eq('shapeways_order_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Fetch fresh status from Shapeways
    const status = await shapewaysService.getOrderStatus(orderId)

    // Update our DB with latest status
    const newStatus = mapShapewaysStatus(status.status)
    if (newStatus !== order.status) {
      await supabaseAdmin
        .from('figurine_print_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id)
    }

    return NextResponse.json({
      orderId,
      status: newStatus,
      trackingNumber: status.trackingNumber,
      materialName: order.material_name,
      sizeCm: order.size_cm,
      ptsCharged: order.our_price_pts,
      createdAt: order.created_at,
    })
  } catch (error) {
    lognog.error('figurine_print_status_error', {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get order status' },
      { status: 500 }
    )
  }
}

function mapShapewaysStatus(shapewaysStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'processing': 'in_production',
    'in_production': 'in_production',
    'shipped': 'shipped',
    'delivered': 'shipped',
    'cancelled': 'cancelled',
    'on_hold': 'pending',
  }
  return statusMap[shapewaysStatus.toLowerCase()] || 'pending'
}
