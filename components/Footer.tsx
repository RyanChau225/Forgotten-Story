import Link from "next/link"
import { Linkedin, Mail } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Left: Quote Section */}
          <div className="flex-1 max-w-md">
            <p className="text-gray-400 text-sm font-medium italic">
              "Rediscover yourself, one memory at a time."
            </p>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              A personal journal that helps you track your daily experiences, emotions, and memories.
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex items-center space-x-6">
            <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-xs">
              About
            </Link>
            <div className="h-3 w-px bg-white/10" />
            <Link href="mailto:feedback@forgotten-story.com" className="text-gray-400 hover:text-white transition-colors text-xs">
              Feedback
            </Link>
            <div className="h-3 w-px bg-white/10" />
            <Link 
              href="https://www.linkedin.com/in/ryanchauu/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              LinkedIn
            </Link>
            <div className="h-3 w-px bg-white/10" />
            <Link 
              href="mailto:chau.r225@gmail.com"
              className="text-gray-400 hover:text-white transition-colors text-xs"
            >
              Email
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-400 text-xs">
            © {new Date().getFullYear()} Forgotten Story. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

