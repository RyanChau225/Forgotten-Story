import Image from "next/image"

interface BackgroundImageProps {
  opacity?: number
}

export default function BackgroundImage({ opacity = 0.6 }: BackgroundImageProps) {
  return (
    <div className="fixed inset-0 z-[-1]">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/breathtaking-view-of-mountain-scenery-from-a-path-in-the-valley-free-photo-lQhrerCfQG9KkWidyqSqgYcLySMAol.webp"
        alt="Serene landscape representing a journey through memories"
        fill
        priority
        className="object-cover"
      />
      <div className={`absolute inset-0 bg-black`} style={{ opacity }} />
    </div>
  )
}

