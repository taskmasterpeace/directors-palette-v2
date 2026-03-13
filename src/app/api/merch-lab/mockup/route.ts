import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { PRINTIFY_PROVIDERS } from '@/features/merch-lab/constants/products'

export const maxDuration = 60

const PRINTIFY_API = 'https://api.printify.com/v1'
const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN!
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID!

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { blueprintId, variantId, designUrl, designPosition, designStyle, existingUploadId } = await request.json()

    if (!blueprintId || !variantId || !designUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const providerId = PRINTIFY_PROVIDERS[blueprintId]
    if (!providerId) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 })
    }

    // Step 1: Upload image to Printify (or reuse existing)
    let uploadId = existingUploadId
    if (!uploadId) {
      const uploadRes = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PRINTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_name: 'merch-design.png', url: designUrl }),
      })
      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        lognog.error('mockup_upload_failed', { status: uploadRes.status, error: err })
        return NextResponse.json({ error: 'Failed to upload design' }, { status: 502 })
      }
      const uploadData = await uploadRes.json()
      uploadId = uploadData.id
    }

    // Step 2: Determine print area placement
    const isPlaced = ['center', 'left-chest', 'back'].includes(designStyle ?? '')
    const imageConfig = {
      id: uploadId,
      x: isPlaced ? (designPosition?.x ?? 0.5) : 0.5,
      y: isPlaced ? (designPosition?.y ?? 0.5) : 0.5,
      scale: isPlaced ? (designPosition?.scale ?? 1) : 1,
      angle: 0,
    }

    const position = designStyle === 'back' ? 'back' : 'front'

    // Step 3: Create draft product
    const productRes = await fetch(`${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PRINTIFY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `Mockup Preview - ${Date.now()}`,
        blueprint_id: blueprintId,
        print_provider_id: providerId,
        variants: [{ id: variantId, price: 0, is_enabled: true }],
        print_areas: [{
          variant_ids: [variantId],
          placeholders: [{
            position,
            images: [imageConfig],
          }],
        }],
      }),
    })

    if (!productRes.ok) {
      const err = await productRes.text()
      lognog.error('mockup_product_failed', { status: productRes.status, error: err })
      return NextResponse.json({ error: 'Failed to create mockup product' }, { status: 502 })
    }

    const productData = await productRes.json()

    return NextResponse.json({
      printifyProductId: productData.id,
      uploadId,
    })
  } catch (error) {
    lognog.error('mockup_create_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mockup creation failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const res = await fetch(
      `${PRINTIFY_API}/shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`,
      { headers: { Authorization: `Bearer ${PRINTIFY_TOKEN}` } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const data = await res.json()
    const images = data.images ?? []

    return NextResponse.json({
      ready: images.length > 0,
      images: images.map((img: { src: string; position: string; variant_ids: number[] }) => ({
        src: img.src,
        position: img.position ?? 'default',
        variantIds: img.variant_ids ?? [],
      })),
    })
  } catch (error) {
    lognog.error('mockup_poll_error', { error: String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mockup poll failed' },
      { status: 500 }
    )
  }
}
