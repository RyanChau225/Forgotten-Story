import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is signed in and trying to access /sign-in page
  if (session && req.nextUrl.pathname === '/sign-in') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // If there's no session and the user is trying to access protected routes
  if (!session && (
    req.nextUrl.pathname.startsWith('/dashboard') ||
    req.nextUrl.pathname.startsWith('/api/entries') ||
    req.nextUrl.pathname.startsWith('/search') ||
    req.nextUrl.pathname.startsWith('/profile') ||
    req.nextUrl.pathname.startsWith('/settings')
  )) {
    const redirectUrl = new URL('/sign-in', req.url)
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
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