import type React from "react"

interface CenteredLayoutProps {
  children: React.ReactNode
}

export default function CenteredLayout({ children }: CenteredLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  )
}

