"use client"

import { useState } from "react"
import { Upload, Loader2, RefreshCw, Copy, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ImageToText() {
  const [image, setImage] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()

  // Preprocess image before OCR
  const preprocessImage = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(imageUrl)

        // Set canvas size to match image
        canvas.width = img.width
        canvas.height = img.height

        // Draw original image
        ctx.drawImage(img, 0, 0)

        // Increase contrast
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalCompositeOperation = 'difference'
        ctx.drawImage(img, 0, 0)

        // Convert to black and white
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
          const threshold = 128
          const color = avg > threshold ? 255 : 0
          data[i] = data[i + 1] = data[i + 2] = color
        }
        ctx.putImageData(imageData, 0, 0)

        resolve(canvas.toDataURL('image/png'))
      }
      img.src = imageUrl
    })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setExtractedText("")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setExtractedText("")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleExtractText = async () => {
    if (!image) return

    setIsProcessing(true)
    setProgress(0)

    try {
      // Convert base64 to raw binary
      const base64Data = image.split(',')[1]
      const imageBuffer = Buffer.from(base64Data, 'base64')

      // Prepare request to Google Cloud Vision API
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to extract text')
      }

      const data = await response.json()
      setExtractedText(data.text)

      toast({
        title: "Text extracted successfully",
        description: "Text has been extracted using Google Cloud Vision API.",
      })
    } catch (error) {
      console.error("Error extracting text:", error)
      toast({
        title: "Error extracting text",
        description: "Please try with a clearer image or different handwriting style.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(extractedText)
    toast({
      title: "Text copied to clipboard",
      description: "You can now paste it anywhere.",
    })
  }

  const handleReset = () => {
    setImage(null)
    setExtractedText("")
    setProgress(0)
  }

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Image to Text Converter</h1>
          <p className="text-gray-400">
            Upload a picture of your handwritten or printed journal entry to convert it to text
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 ${
                image ? "border-yellow-500/50" : "border-white/10"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {image ? (
                <div className="space-y-4">
                  <img
                    src={image}
                    alt="Uploaded"
                    className="max-h-[300px] mx-auto rounded-lg"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={handleExtractText}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-yellow-500 text-black rounded-lg text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing ({progress}%)
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Extract Text
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-400 mb-2">
                    Drag and drop an image here, or{" "}
                    <label className="text-yellow-500 hover:text-yellow-400 cursor-pointer">
                      browse
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports PNG, JPG, or JPEG
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted Text Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Extracted Text</h2>
              {extractedText && (
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              )}
            </div>
            <div className="bg-black/20 rounded-xl border border-white/10 p-4 min-h-[300px]">
              {isProcessing ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Extracting text...</p>
                    <p className="text-xs text-gray-500">This may take a moment</p>
                  </div>
                </div>
              ) : extractedText ? (
                <p className="text-sm whitespace-pre-wrap">{extractedText}</p>
              ) : (
                <p className="text-gray-500 text-sm text-center">
                  Extracted text will appear here
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
