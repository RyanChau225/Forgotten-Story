import Link from "next/link"

export default function About() {
  return (
    <div className="flex-grow container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About Forgotten Story</h1>
      <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
        <p className="mb-4">
          Forgotten Story is more than just a journaling app; it's a personal time capsule that lets you rediscover the
          moments that shaped your life. By blending daily journaling with AI-powered insights and notifications, the
          app makes it easy to revisit cherished memories you might have forgotten.
        </p>
        <h2 className="text-xl font-semibold mb-2">Our Mission</h2>
        <p className="mb-4">
          Our mission is to help people connect with their past, understand their present, and shape their future. We
          believe that every moment of your life is valuable and worth remembering.
        </p>
        <h2 className="text-xl font-semibold mb-2">How It Works</h2>
        <p className="mb-4">
          Forgotten Story uses advanced AI algorithms to analyze your journal entries, identify patterns, and generate
          meaningful insights. Our app sends you timely notifications to remind you of past events, helping you reflect
          on your growth and cherish your memories.
        </p>
        <Link href="/signup" className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-400 inline-block">
          Join Forgotten Story
        </Link>
      </div>
    </div>
  )
}

