import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { creditsService } from '@/features/credits'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS, MARGIN_MULTIPLIER } from '@/features/merch-lab/constants/products'

export const maxDuration = 120

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN!
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID!

const ESTIMATED_SHIPPING: Record<string, number> = {
  apparel: 499, accessory: 399, drinkware: 599, sticker: 299,
}
// 1 pt = 1 cent (verified from credits system)

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    const { blueprintId, designUrl, color, size, quantity, shippingAddress, category, designPosition } = await request.json()

    if (!blueprintId || !designUrl || !shippingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const providerId = PRINTIFY_PROVIDERS[blueprintId]
    if (!providerId) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

    // Step 1: Server-side price verification
    const variantsRes = await fetch(
      `${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    )
    if (!variantsRes.ok) throw new Error('Failed to verify pricing')

    const variantsData = await variantsRes.json()
    const matchingVariant = variantsData.variants?.find((v: { id: number; options: Record<string, string> }) => {
      const opts = v.options ?? {}
      const vColor = opts.color ?? 'Default'
      const vSize = opts.size ?? 'One Size'
      return vColor === color && (vSize === size || (!size && vSize === 'One Size'))
    })

    if (!matchingVariant) return NextResponse.json({ error: 'Product variant not found' }, { status: 404 })

    const shippingCents = ESTIMATED_SHIPPING[category ?? 'apparel'] ?? 499
    const totalCents = Math.ceil((matchingVariant.price + shippingCents) * MARGIN_MULTIPLIER)
    const verifiedPts = totalCents * quantity // 1 pt = 1 cent

    // Step 2: Check and deduct pts
    const balance = await creditsService.getBalance(user.id)
    if ((balance?.balance ?? 0) < verifiedPts) {
      return NextResponse.json({ error: 'Insufficient pts', required: verifiedPts }, { status: 402 })
    }

    await creditsService.deductCredits(user.id, 'merch-order', {
      generationType: 'image',
      predictionId: `merch-${Date.now()}`,
      description: `Merch Lab order: ${quantity}x ${color} ${size ?? ''} (Blueprint ${blueprintId})`,
      overrideAmount: verifiedPts,
      user_email: user.email,
    })

    const ptsDeducted = true

    try {
      // Step 3: Upload design image to Printify
      const uploadRes = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: 'merch-design.png',
          url: designUrl,
        }),
      })
      if (!uploadRes.ok) throw new Error('Failed to upload design to Printify')
      const uploadData = await uploadRes.json()

      // Step 4: Create product on Printify
      const productRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Custom Merch - ${Date.now()}`,
          blueprint_id: blueprintId,
          print_provider_id: providerId,
          variants: [
            { id: matchingVariant.id, price: matchingVariant.price, is_enabled: true },
          ],
          print_areas: [
            {
              variant_ids: [matchingVariant.id],
              placeholders: [
                { position: 'front', images: [{ id: uploadData.id, x: designPosition?.x ?? 0.5, y: designPosition?.y ?? 0.5, scale: designPosition?.scale ?? 1, angle: 0 }] },
              ],
            },
          ],
        }),
      })
      if (!productRes.ok) throw new Error('Failed to create Printify product')
      const productData = await productRes.json()

      // Step 5: Submit order
      const orderRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/orders.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_id: `dp-merch-${Date.now()}`,
          line_items: [
            { product_id: productData.id, variant_id: matchingVariant.id, quantity },
          ],
          shipping_method: 1,
          address_to: {
            first_name: shippingAddress.firstName,
            last_name: shippingAddress.lastName,
            address1: shippingAddress.address1,
            address2: shippingAddress.address2 || undefined,
            city: shippingAddress.city,
            region: shippingAddress.state,
            zip: shippingAddress.zip,
            country: shippingAddress.country,
            phone: shippingAddress.phone || undefined,
          },
        }),
      })
      if (!orderRes.ok) throw new Error('Failed to submit Printify order')
      const orderData = await orderRes.json()

      lognog.info('merch_order_submitted', {
        type: 'business',
        user_id: user.id,
        order_id: orderData.id,
        pts_charged: verifiedPts,
        blueprint_id: blueprintId,
        quantity,
      })

      return NextResponse.json({ orderId: orderData.id, ptsCharged: verifiedPts })
    } catch (fulfillmentError) {
      // Refund pts if Printify submission failed
      if (ptsDeducted) {
        try {
          await creditsService.addCredits(user.id, verifiedPts, { type: 'refund', description: 'Refund: Merch order failed' })
          lognog.info('merch_order_refunded', { user_id: user.id, pts_refunded: verifiedPts })
        } catch (refundErr) {
          lognog.error('merch_refund_failed', { user_id: user.id, pts: verifiedPts, error: String(refundErr) })
        }
      }
      throw fulfillmentError
    }
  } catch (error) {
    lognog.error('merch_order_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Order failed' },
      { status: 500 }
    )
  }
}
