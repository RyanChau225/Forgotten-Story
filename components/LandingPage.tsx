"use client"

import { signIn } from "next-auth/react"
import Link from "next/link"
import { Facebook, Twitter, Instagram } from "lucide-react"
import BackgroundImage from "./BackgroundImage"

export default function LandingPage() {
  const handleStartJourney = async () => {
    await signIn('credentials', {
      email: 'test@example.com',
      password: 'password',
      callbackUrl: '/dashboard'
    })
  }

  return (
    <>
      <BackgroundImage opacity={0.7} />
      <div className="flex flex-col">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col justify-center items-center text-center px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Rediscover Yourself, One Memory at a Time</h1>
            <p className="text-xl mb-8">
              Forgotten Story helps you capture life's moments and rediscover them when you need them most.
            </p>
            <button
              onClick={handleStartJourney}
              className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors text-lg"
            >
              Start Your Journey
            </button>
          </div>
          <div className="mt-12 flex justify-center space-x-6">
            <Link href="#" className="text-white hover:text-yellow-500 transition-colors">
              <Facebook size={24} />
            </Link>
            <Link href="#" className="text-white hover:text-yellow-500 transition-colors">
              <Twitter size={24} />
            </Link>
            <Link href="#" className="text-white hover:text-yellow-500 transition-colors">
              <Instagram size={24} />
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-32">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-16 text-center">Key Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
              <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
                <h3 className="text-xl font-semibold mb-4">Engaging Summaries</h3>
                <p>AI-generated highlights make your past entries irresistible to read.</p>
              </div>
              <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
                <h3 className="text-xl font-semibold mb-4">Emotional Insights</h3>
                <p>Track your moods and patterns to understand your growth over time.</p>
              </div>
              <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
                <h3 className="text-xl font-semibold mb-4">Tailored Experience</h3>
                <p>Fully customizable with themes, prompts, and notification settings.</p>
              </div>
              <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
                <h3 className="text-xl font-semibold mb-4">Privacy First</h3>
                <p>Secure your entries with encryption and offline access.</p>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="py-32">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-16 text-center">About Forgotten Story</h2>
            <div className="max-w-3xl mx-auto">
              <p className="mb-6 text-lg">
                Forgotten Story is more than just a journaling app; it's a personal time capsule that lets you
                rediscover the moments that shaped your life. By blending daily journaling with AI-powered insights and
                notifications, the app makes it easy to revisit cherished memories you might have forgotten.
              </p>
              <p className="mb-6 text-lg">
                Our mission is to help people connect with their past, understand their present, and shape their future.
                We believe that every moment of your life is valuable and worth remembering.
              </p>
              <p className="mb-6 text-lg">
                Start capturing your story today and see how every moment, big or small, can become a treasured memory.
              </p>
              <div className="text-center mt-12">
                <Link
                  href="/signup"
                  className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors text-lg inline-block"
                >
                  Join Forgotten Story
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

