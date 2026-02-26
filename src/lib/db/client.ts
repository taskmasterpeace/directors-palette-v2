import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { ConfigurationError } from "@/lib/errors"
import { Database } from "./types"
import { createLogger } from '@/lib/logger'

const log = createLogger('Lib')

// Export typed Supabase client type
export type TypedSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

/**
 * Unified Supabase client that automatically detects environment
 * and creates the appropriate client (server or browser)
 * 
 * Usage:
 * - Server components: `const supabase = await getClient()`
 * - Client components: `const supabase = await getClient()`
 * - Hooks: `const supabase = await getClient()`
 * 
 * The client automatically handles:
 * - Environment detection (server vs browser)
 * - Cookie management on server
 * - Session persistence on browser  
 * - Proper error handling for both environments
 */
export async function getClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        throw new ConfigurationError(
            'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_CONFIG'
        )
    }

    // Server-side client (SSR, API routes, Server Components)
    if (typeof window === 'undefined') {
        try {
            // Dynamic import to avoid bundling server dependencies in browser
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()

            return createServerClient<Database>(supabaseUrl, supabaseKey, {
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
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            })
        } catch (error) {
            log.error('Failed to create server Supabase client', { error: error instanceof Error ? error.message : String(error) })
            throw new ConfigurationError(
                'Failed to create server Supabase client. This might be due to missing Next.js context.',
                'SUPABASE_SERVER_CLIENT'
            )
        }
    }

    // Browser-side client (Client Components, hooks, browser code)
    return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}

export async function getAPIClient() {
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
        throw new ConfigurationError(
            'Missing required environment variables for Supabase API client',
            'SUPABASE_API_CLIENT'
        )
    }

    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    )
}

/**
 * Create a test-specific client that works outside Next.js context
 * Useful for testing and development scenarios
 */
export async function getTestClient() {
    if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
        throw new ConfigurationError(
            'Missing required environment variables for Supabase test client',
            'SUPABASE_TEST_CONFIG'
        )
    }

    // Use dynamic import to avoid ESLint issues
    const { createClient } = await import('@supabase/supabase-js')

    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: false, // Don't persist sessions in tests
                autoRefreshToken: false, // Don't auto-refresh tokens in tests
            },
        }
    )
}

/**
 * Utility to check if we're in a server environment
 */
export function isServerEnvironment(): boolean {
    return typeof window === 'undefined'
}

/**
 * Utility to check if we're in a browser environment  
 */
export function isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined'
}

/**
 * Type guard to ensure Supabase client is properly typed
 */
export type { SupabaseClient } from '@supabase/supabase-js'