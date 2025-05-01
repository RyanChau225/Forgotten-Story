import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    // Redirect to the state path or dashboard
    const redirectTo = state || '/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // If no code or other error, redirect to sign-in
  return NextResponse.redirect(new URL('/sign-in', request.url))
} 