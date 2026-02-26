import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if middleware is refreshing user sessions.
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Capture browser and IP for login tracking
      const userAgent = request.headers.get('user-agent') || undefined
      const forwardedFor = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      const ipAddress = forwardedFor?.split(',')[0].trim() || realIp || undefined

      // Get user's name from OAuth metadata
      const userName = data.user.user_metadata?.full_name ||
                       data.user.user_metadata?.name ||
                       undefined

      // Get the OAuth provider (google, etc.)
      const provider = data.user.app_metadata?.provider || 'oauth'

      // Check if this is a new user (created within last 30 seconds)
      const createdAt = new Date(data.user.created_at).getTime()
      const isNewUser = (Date.now() - createdAt) < 30000

      // Log the login event
      lognog.info(isNewUser ? 'User signup completed' : 'User login', {
        user_id: data.user.id,
        user_email: data.user.email || undefined,
        user_name: userName,
        auth_method: `${provider}_oauth`,
        is_new_user: isNewUser,
        ip_address: ipAddress,
        user_agent: userAgent,
      })

      // Successful auth - redirect to home or specified next URL
      return NextResponse.redirect(`${origin}${next}`)
    }

    if (error) {
      logger.auth.error('Auth callback error', { error: error })
      lognog.warn('OAuth login failed', {
        error_message: error.message,
        route: '/auth/callback',
      })
    }
    // Redirect to error page on failure
    return NextResponse.redirect(`${origin}/auth/signin?error=callback_failed`)
  }

  // No code provided - redirect to sign in
  return NextResponse.redirect(`${origin}/auth/signin?error=no_code`)
}
