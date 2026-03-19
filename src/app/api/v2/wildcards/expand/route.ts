import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateV2ApiKey, isAuthContext } from '../../_lib/middleware'
import { successResponse, errors } from '../../_lib/response'
import { apiKeyService } from '@/features/api-keys/services/api-key.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ApiV2')

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const auth = await validateV2ApiKey(request)
    if (!isAuthContext(auth)) return auth

    const body = await request.json()
    const { prompt, count: rawCount } = body

    if (!prompt || typeof prompt !== 'string') {
      return errors.validation('prompt is required and must be a string')
    }

    const count = Math.min(Math.max(Number(rawCount) || 1, 1), 20)

    // Find wildcard tokens in prompt
    const tokenRegex = /_([a-zA-Z0-9_]+)_/g
    const tokens: string[] = []
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(prompt)) !== null) {
      if (!tokens.includes(match[1])) {
        tokens.push(match[1])
      }
    }

    // If no tokens found, return prompt as-is
    if (tokens.length === 0) {
      const expansions = Array.from({ length: count }, () => ({
        text: prompt,
        wildcards_used: {},
      }))

      await apiKeyService.logUsage({
        apiKeyId: auth.apiKeyId,
        userId: auth.userId,
        endpoint: '/v2/wildcards/expand',
        method: 'POST',
        statusCode: 200,
        responseTimeMs: Date.now() - startTime,
      })

      return successResponse({ expansions })
    }

    // Fetch matching wildcards from DB by name
    const supabase = getSupabase()
    const { data: wildcardData, error } = await supabase
      .from('wildcards')
      .select('name, content')
      .or(`user_id.eq.${auth.userId},is_shared.eq.true`)
      .in('name', tokens)

    if (error) {
      log.error('Failed to fetch wildcards', { error: error.message })
      return errors.internal('Failed to fetch wildcards')
    }

    // Build a map of wildcard name -> lines
    const wildcardMap: Record<string, string[]> = {}
    for (const w of wildcardData || []) {
      if (typeof w.content === 'string') {
        wildcardMap[w.name] = w.content
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)
      }
    }

    // Generate expansions
    const expansions = Array.from({ length: count }, () => {
      let expanded = prompt
      const wildcardsUsed: Record<string, string> = {}

      for (const token of tokens) {
        const lines = wildcardMap[token]
        if (lines && lines.length > 0) {
          const chosen = lines[Math.floor(Math.random() * lines.length)]
          expanded = expanded.replace(new RegExp(`_${token}_`, 'g'), chosen)
          wildcardsUsed[token] = chosen
        }
      }

      return { text: expanded, wildcards_used: wildcardsUsed }
    })

    await apiKeyService.logUsage({
      apiKeyId: auth.apiKeyId,
      userId: auth.userId,
      endpoint: '/v2/wildcards/expand',
      method: 'POST',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
    })

    return successResponse({ expansions })
  } catch (err) {
    log.error('POST /v2/wildcards/expand error', { error: err instanceof Error ? err.message : String(err) })
    return errors.internal()
  }
}
