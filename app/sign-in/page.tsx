"use client"

export const dynamic = 'force-dynamic' // <--- Add this line

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { FcGoogle } from "react-icons/fc"
import Link from "next/link"
import { getSafeRedirectPath } from "@/utils/redirect"

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const redirectPath = getSafeRedirectPath(
          searchParams.get('redirectedFrom'),
          '/dashboard'
        )
        router.push(redirectPath)
      }
    }
    checkUser()
  }, [router, searchParams, supabase.auth])

  const handleGoogleSignIn = async () => {
    try {
      const redirectedFrom = getSafeRedirectPath(
        searchParams.get('redirectedFrom'),
        '/dashboard'
      )

      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('redirectedFrom', redirectedFrom)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        console.error('Auth Error:', error)
        throw error
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[url('/mountains.jpg')] bg-cover bg-center">
      <div className="min-h-screen w-full backdrop-blur-sm bg-black/25 flex flex-col">
        {/* Header */}
        <div className="w-full p-4">
          <Link href="/" className="text-white font-medium px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 inline-block">
            ← Back to Home
          </Link>
        </div>

        {/* Sign In Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 shadow-lg p-8">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                <p className="text-gray-300">Sign in to continue your journey</p>
              </div>

              <button
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors"
              >
                <FcGoogle className="w-6 h-6" />
                Continue with Google
              </button>

              <p className="text-gray-400 text-sm text-center mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  )
}