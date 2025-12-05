import Link from "next/link"
import { ArrowRight, Info, Users, Zap } from "lucide-react"

export default function About() {
  return (
    <div className="flex-grow container mx-auto px-4 py-12 md:py-16 lg:py-20">
      <header className="text-center mb-12 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          About Forgotten Story
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
          Your personal time capsule to rediscover the moments that shaped your life.
        </p>
      </header>

      <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl max-w-3xl mx-auto">
        <div className="p-6 md:p-8 lg:p-10 space-y-8">
          <section>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-yellow-400 flex items-center">
              <Info className="w-7 h-7 mr-3 text-yellow-500" /> What is Forgotten Story?
            </h2>
            <p className="text-gray-200 leading-relaxed">
              Forgotten Story is more than just a journaling app; it&apos;s your companion in weaving the narrative of your life. We believe every experience, big or small, contributes to the unique tapestry of who you are. Our platform blends the timeless practice of journaling with modern AI-powered insights, creating a dynamic space to record, reflect, and rediscover your journey.
            </p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-yellow-400 flex items-center">
              <Users className="w-7 h-7 mr-3 text-yellow-500" /> Our Mission
            </h2>
            <p className="text-gray-200 leading-relaxed">
              Our mission is to empower you to connect deeply with your past, gain clarity in your present, and consciously shape your future. We strive to make remembering an active, insightful, and joyful part of your daily life, transforming your memories from forgotten fragments into sources of wisdom and inspiration.
            </p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-yellow-400 flex items-center">
              <Zap className="w-7 h-7 mr-3 text-yellow-500" /> How It Works
            </h2>
            <p className="text-gray-200 leading-relaxed">
              Forgotten Story utilizes intelligent AI to help you uncover patterns, themes, and sentiments within your entries. Our app can send you personalized reminders of past moments and reflections, fostering a continuous dialogue with your evolving self. It&apos;s designed to be intuitive, secure, and a beautiful space for your thoughts.
        </p>
          </section>

          <div className="text-center pt-6">
            <Link 
              href="/new-entry"
              className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-lg font-semibold text-lg transition-transform duration-150 ease-in-out hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-black/50"
            >
              Start a New Memory
              <ArrowRight className="w-5 h-5" />
        </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

