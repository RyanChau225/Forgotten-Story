import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSafeRedirectPath } from '@/utils/redirect'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectedFrom = requestUrl.searchParams.get('redirectedFrom')
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Redirect to a validated, same-site path (prevents open redirects).
    const redirectTo = getSafeRedirectPath(redirectedFrom, '/dashboard')
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // If no code or other error, redirect to sign-in
  return NextResponse.redirect(new URL('/sign-in', request.url))
} 