"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { 
  Home, 
  LayoutDashboard, 
  PenSquare, 
  Bell, 
  Search, 
  Settings, 
  User,
  LogOut,
  Plus,
  BookOpen,
  Menu
} from "lucide-react"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const isActive = (path: string) => pathname === path

  const navItems = [
    { name: "Home", href: "/", icon: Home, public: true },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, public: false },
    { name: "Notifications", href: "/notifications", icon: Bell, public: false },
    { name: "Search Entries", href: "/search", icon: BookOpen, public: false },
  ]

  return (
    <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo and Home */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="px-6 py-2 border-[2.5px] border-white/40 rounded-md hover:border-yellow-500 transition-all group"
            >
              <span className="text-xl font-semibold text-white group-hover:text-yellow-500 transition-colors">
                Forgotten Story
              </span>
            </Link>

            <Link
              href="/"
              className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200 ${
                isActive("/")
                  ? "bg-white/10 text-white backdrop-blur-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>
          </div>

          {user ? (
            <>
              {/* Center: Navigation Items */}
              <div className="hidden md:flex items-center justify-center flex-1 px-12">
                <div className="flex items-center">
                  {navItems.filter(item => !item.public).map((item, index) => (
                    <>
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200 ${
                          isActive(item.href)
                            ? "bg-white/10 text-white backdrop-blur-sm"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                      {index < navItems.filter(item => !item.public).length - 1 && (
                        <div className="h-5 w-px bg-white/10 mx-3" />
                      )}
                    </>
                  ))}

                  {/* Sign Out */}
                  <div className="h-5 w-px bg-white/10 mx-3" />
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-xl flex items-center space-x-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Right: New Entry */}
              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <Link
                    href="/new-entry"
                    className="bg-yellow-500 text-black hover:bg-yellow-400 px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Entry</span>
                  </Link>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden p-2 hover:bg-white/10 rounded-lg"
                >
                  <Menu className="w-5 h-5 text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <Link
                href="/sign-in"
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
              >
                <User className="w-4 h-4" />
                <span>Sign in</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-white/10">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {user && (
              <>
                <div className="flex justify-center">
                  <Link
                    href="/new-entry"
                    className="bg-yellow-500 text-black hover:bg-yellow-400 px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200 w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Entry</span>
                  </Link>
                </div>
                {navItems.filter(item => !item.public).map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
                  >
                    {item.name}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

