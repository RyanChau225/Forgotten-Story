import Link from "next/link"
import BackgroundImage from "./BackgroundImage"

export default function SignUpForm() {
  return (
    <>
      <BackgroundImage opacity={0.7} />
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-lg">
            <h2 className="text-3xl font-bold mb-6 text-center text-white">Sign Up</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  placeholder="Create a password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full px-4 py-3 rounded-2xl bg-white/20 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  placeholder="Confirm your password"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full bg-yellow-500 text-black py-3 rounded-2xl font-bold hover:bg-yellow-400 transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </form>
            <p className="mt-4 text-center text-gray-300">
              Already have an account?{" "}
              <Link href="/login" className="text-yellow-500 hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

