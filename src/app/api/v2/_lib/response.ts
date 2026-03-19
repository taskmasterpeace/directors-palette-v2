import { NextResponse } from 'next/server'

/**
 * Standard success response envelope
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard error response envelope
 */
export function errorResponse(
  code: string,
  message: string,
  status: number
) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  )
}

/** Common error shorthand helpers */
export const errors = {
  unauthorized: (msg = 'Missing or invalid API key') =>
    errorResponse('UNAUTHORIZED', msg, 401),

  insufficientPts: (required: number, balance: number) =>
    errorResponse('INSUFFICIENT_PTS', `Need ${required} pts, you have ${balance}`, 402),

  forbidden: (msg = 'Action not allowed') =>
    errorResponse('FORBIDDEN', msg, 403),

  notFound: (msg = 'Resource not found') =>
    errorResponse('NOT_FOUND', msg, 404),

  validation: (msg: string) =>
    errorResponse('VALIDATION_ERROR', msg, 422),

  rateLimited: (retryAfter: number) =>
    NextResponse.json(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    ),

  internal: (msg = 'Internal server error') =>
    errorResponse('INTERNAL_ERROR', msg, 500),
}
