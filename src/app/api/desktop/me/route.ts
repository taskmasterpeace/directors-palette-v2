import { NextRequest, NextResponse } from 'next/server'
import { authenticateDesktopRequest, withDesktopCors } from '@/lib/auth/desktop-auth'

export async function OPTIONS() {
  return withDesktopCors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
  const result = await authenticateDesktopRequest(request)

  if (result instanceof NextResponse) {
    return withDesktopCors(result)
  }

  return withDesktopCors(NextResponse.json(result.user))
}
