import "./globals.css"
import { Inter } from "next/font/google"
import Navigation from "@/components/Navigation"
import Footer from "@/components/Footer"
import BackgroundImage from "@/components/BackgroundImage"
import Providers from "@/components/Providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Forgotten Story",
  description: "Rediscover yourself, one memory at a time.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} text-white relative`}>
        <Providers>
          <BackgroundImage opacity={0.7} />
          <Navigation />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

