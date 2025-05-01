import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Maximum file size: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024
// Accepted image types
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic"
]

export function validateImage(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("File type not supported. Please upload a JPEG, PNG, or WebP image.")
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size too large. Please upload an image smaller than 5MB.")
  }
}

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height
        const maxDimension = 1920 // Max width/height

        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width
          width = maxDimension
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height
          height = maxDimension
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }))
          },
          'image/jpeg',
          0.8 // 80% quality
        )
      }
      img.onerror = () => reject(new Error('Failed to load image'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
  })
}
