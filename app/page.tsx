"use client"

import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { FaFacebook, FaTwitter, FaInstagram } from "react-icons/fa"
import { ScanLine, CloudUpload, Archive, Sparkles, SmilePlus, Mail } from "lucide-react"

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
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Rediscover Yourself,
            <br />
            One Memory at a Time
          </h1>
          <div className="relative w-full max-w-6xl mb-8 overflow-x-auto px-3 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-full md:w-fit md:mx-auto flex-wrap md:flex-nowrap items-center justify-center gap-2 text-gray-200">
              <span className="w-full md:w-auto text-center md:text-left text-base md:text-lg font-semibold uppercase tracking-widest text-white/85 shrink-0">
                How it works
              </span>
              <span className="hidden md:inline text-white/25" aria-hidden="true">
                |
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 backdrop-blur-sm text-xs md:text-sm whitespace-nowrap">
                Write/Upload an entry
              </span>
              <span className="text-white/40 px-1" aria-hidden="true">
                →
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 backdrop-blur-sm text-xs md:text-sm whitespace-normal md:whitespace-nowrap text-center">
                Receive your personal entry at random through email everyday
              </span>
              <span className="text-white/40 px-1" aria-hidden="true">
                →
              </span>
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 backdrop-blur-sm text-xs md:text-sm whitespace-nowrap">
                Read and re-live your memories
              </span>
            </div>
          </div>

          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
            Forgotten Story helps you capture life&apos;s moments and rediscover them one chapter at a time.
          </p>

          <div className="max-w-3xl mx-auto mb-12 text-gray-200 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <Mail className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Rediscover Through Email</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Receive timely email reminders of your past entries, offering delightful glimpses into your journey.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <ScanLine className="w-8 h-8 text-yellow-400 flex-shrink-0" /> 
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Digitize Your Journals</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Easily transform handwritten pages or typed notes into digital entries, preserving them for years to come.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <Archive className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Your Personal Memory Vault</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Securely store your thoughts, experiences, and precious memories, all in one place.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <Sparkles className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Intelligent Journal Summaries</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Let AI distill your entries into concise summaries, highlighting key themes and moments.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <SmilePlus className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Personalized Affirmations</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Receive uplifting positive affirmations crafted by AI, tailored to your unique journal entries.</p>
              </div>
            </div>


            <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg">
              <CloudUpload className="w-8 h-8 text-yellow-400 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-lg text-white">Secure Cloud Storage</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Your memories are safely backed up to the cloud, accessible whenever and wherever you need them.</p>
              </div>
            </div>

          </div>

          <Link
            href={user ? "/dashboard" : "/sign-in"}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium px-8 py-3 rounded-lg transition-colors"
          >
            {user ? "Go to Dashboard" : "Start Your Journey"}
          </Link>

          <section
            id="how-it-came-about"
            className="w-full max-w-3xl mx-auto mt-12 text-left"
          >
            <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl p-6 md:p-8">
              <p className="text-sm uppercase tracking-widest text-white/70 mb-3">
                How it came about
              </p>
              <p className="text-gray-200 leading-relaxed md:text-lg">
                I built Forgotten Story as a passion project after re-reading my own journal entries from days to years ago and realizing I couldn&apos;t fully recall many of those moments. Each entry brought back a real sense of joy, and I wanted to make it easy to revisit those memories over time.
              </p>
            </div>
          </section>
        </div>

        {/* Footer REMOVED */}
        {/* <div className="w-full p-8 flex justify-center gap-6">
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaFacebook className="w-6 h-6" />
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaTwitter className="w-6 h-6" />
          </a>
          <a href="#" className="text-white/70 hover:text-white transition-colors">
            <FaInstagram className="w-6 h-6" />
          </a>
        </div> */}
      </div>
    </div>
  )
}

