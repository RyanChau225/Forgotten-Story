"use client"

import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa"

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <div className="min-h-screen w-full bg-[url('/mountains.jpg')] bg-cover bg-center">
      <div className="min-h-screen w-full backdrop-blur-sm bg-black/25 flex flex-col">
        {/* Header with Sign In */}
        <div className="w-full p-4 flex justify-between items-center">
          <div className="text-white font-medium px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10">
            Forgotten Story
          </div>
          {!user ? (
            <Link
              href="/sign-in"
              className="text-white font-medium px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/50 transition-all"
            >
              Sign in
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="text-white font-medium px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 hover:bg-black/50 transition-all"
            >
              Go to Dashboard
            </Link>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Rediscover Yourself,
            <br />
            One Memory at a Time
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl">
            Forgotten Story helps you capture life's moments and rediscover them
            when you need them most.
          </p>
          <Link
            href={user ? "/dashboard" : "/sign-in"}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-8 py-3 rounded-lg transition-colors"
          >
            {user ? "Go to Dashboard" : "Start Your Journey"}
          </Link>
        </div>

        {/* Footer */}
        <div className="w-full p-8 flex justify-center gap-6">
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaFacebook className="w-6 h-6" />
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaTwitter className="w-6 h-6" />
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaInstagram className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  )
}

