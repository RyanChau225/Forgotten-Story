import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    
    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }

      // Get the redirectedFrom parameter from the state
      const state = requestUrl.searchParams.get('state')
      let redirectTo = '/dashboard'
      
      if (state) {
        try {
          const stateObj = JSON.parse(decodeURIComponent(state))
          if (stateObj.redirectedFrom) {
            redirectTo = stateObj.redirectedFrom
          }
        } catch (e) {
          console.error('Error parsing state:', e)
        }
      }

      return NextResponse.redirect(new URL(redirectTo, request.url))
    }

    return NextResponse.redirect(new URL('/sign-in', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
} 