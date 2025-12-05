import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Thin pass-through middleware. Auth is enforced inside pages/APIs.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

// Update matcher to include auth routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/sign-in',
    '/dashboard',
    '/search',
    '/profile',
    '/settings',
  ],
} 