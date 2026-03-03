import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getAPIClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

/**
 * GET /api/recipes
 * Fetch all recipes for the authenticated user (user-owned + system)
 * Uses service role client to bypass RLS on user_recipes table
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = await getAPIClient()

    const { data, error } = await adminClient
      .from('user_recipes')
      .select('*')
      .or(`user_id.eq.${user.id},is_system.eq.true`)
      .order('created_at', { ascending: false })

    if (error) {
      logger.api.error('Error fetching recipes', { error: error.message })
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }

    return NextResponse.json({ recipes: data })
  } catch (error) {
    logger.api.error('Recipes fetch error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
