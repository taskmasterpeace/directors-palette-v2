/**
 * API Key Management
 * GET /api/v1/keys - List user's API keys
 * POST /api/v1/keys - Generate new API key (admin only)
 * DELETE /api/v1/keys - Revoke an API key
 *
 * Note: This endpoint requires session auth, not API key auth
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { adminService } from '@/features/admin/services/admin.service'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'

/**
 * GET /api/v1/keys
 * List user's API keys (admins only)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check if user is admin
    const isAdmin = await adminService.checkAdminEmailAsync(user.email || '')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can have API keys' },
        { status: 403 }
      )
    }

    const keys = await apiKeyService.getUserApiKeys(user.id)

    return NextResponse.json({
      keys: keys.map(key => ({
        id: key.id,
        keyPrefix: key.keyPrefix,
        name: key.name,
        scopes: key.scopes,
        isActive: key.isActive,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
      })),
    })
  } catch (error) {
    console.error('[API Keys] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/keys
 * Generate a new API key (admin only)
 * Returns the full key ONCE - it cannot be retrieved again
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check if user is admin
    const isAdmin = await adminService.checkAdminEmailAsync(user.email || '')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can create API keys' },
        { status: 403 }
      )
    }

    // Check if user already has an active key
    const existingKeys = await apiKeyService.getUserApiKeys(user.id)
    const activeKeys = existingKeys.filter(k => k.isActive)

    if (activeKeys.length > 0) {
      return NextResponse.json(
        {
          error: 'You already have an active API key. Revoke it first to create a new one.',
          existingKey: {
            id: activeKeys[0].id,
            keyPrefix: activeKeys[0].keyPrefix,
          },
        },
        { status: 400 }
      )
    }

    // Parse optional name from body
    let name = 'API Key'
    try {
      const body = await request.json()
      if (body.name) name = body.name
    } catch {
      // No body or invalid JSON - use default name
    }

    // Generate new key
    const newKey = await apiKeyService.generateApiKey(user.id, name)

    if (!newKey) {
      return NextResponse.json(
        { error: 'Failed to generate API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'API key created successfully. Save this key - it will not be shown again!',
      key: {
        id: newKey.id,
        rawKey: newKey.rawKey,  // Only shown once!
        keyPrefix: newKey.keyPrefix,
        name: newKey.name,
        scopes: newKey.scopes,
        createdAt: newKey.createdAt,
      },
    })
  } catch (error) {
    console.error('[API Keys] POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/keys
 * Revoke an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Check if user is admin
    const isAdmin = await adminService.checkAdminEmailAsync(user.email || '')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can manage API keys' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json(
        { error: 'Missing key ID. Use ?id=xxx' },
        { status: 400 }
      )
    }

    const success = await apiKeyService.revokeApiKey(keyId, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to revoke API key. It may not exist or belong to you.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'API key revoked successfully',
    })
  } catch (error) {
    console.error('[API Keys] DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
