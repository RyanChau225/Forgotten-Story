"use client"

import { useState, useCallback, ChangeEvent, DragEvent } from "react"
import { UploadCloud, Loader2, RefreshCw, X } from "lucide-react"
import { toast } from "sonner" // Using sonner for notifications

interface OcrResult {
  text?: string;
  error?: string;
}

export default function OcrComparisonPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null) // Base64 data without prefix
  const [mimeType, setMimeType] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [textractResult, setTextractResult] = useState<OcrResult | null>(null)
  const [geminiResult, setGeminiResult] = useState<OcrResult | null>(null)

  const handleFileChange = (file: File | null) => {
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast.error("Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF).")
        return
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File is too large. Maximum size is 5MB.")
        return
      }

      setMimeType(file.type)
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setImagePreview(result)
        setImageData(result.split(",")[1]) // Store base64 data without prefix
        setTextractResult(null) // Clear previous results
        setGeminiResult(null)   // Clear previous results
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files ? e.target.files[0] : null)
    e.target.value = "" // Reset input to allow re-uploading the same file
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    handleFileChange(e.dataTransfer.files ? e.dataTransfer.files[0] : null)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageData(null)
    setMimeType(null)
    setTextractResult(null)
    setGeminiResult(null)
  }

  const handleCompareOcr = useCallback(async () => {
    if (!imageData || !mimeType) {
      toast.error("Please upload an image first.")
      return
    }

    setIsProcessing(true)
    setTextractResult(null)
    setGeminiResult(null)
    toast.info("Starting OCR comparison...")

    try {
      const response = await fetch("/api/ocr-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, mimeType }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Comparison request failed" }))
        throw new Error(errorData.error || `Comparison request failed with status ${response.status}`)
      }

      const results = await response.json()
      setTextractResult(results.textract || { error: "No result from Textract" })
      setGeminiResult(results.gemini || { error: "No result from Gemini" })

      if (results.textract?.text || results.gemini?.text) {
        toast.success("OCR comparison complete!")
      } else {
        toast.warning("OCR comparison complete, but no text was extracted by either service.")
      }
      if(results.textract?.error) toast.error(`Textract Error: ${results.textract.error}`);
      if(results.gemini?.error) toast.error(`Gemini Error: ${results.gemini.error}`);


    } catch (error: any) {
      console.error("OCR Comparison Error:", error)
      toast.error(error.message || "An unexpected error occurred during comparison.")
      setTextractResult({ error: error.message || "Comparison failed" })
      setGeminiResult({ error: error.message || "Comparison failed" })
    } finally {
      setIsProcessing(false)
    }
  }, [imageData, mimeType])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600">
            OCR Comparison Tool
          </h1>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">
            Upload an image of handwritten or printed text and compare the extraction results from AWS Textract and Google Gemini.
          </p>
        </header>

        <div className="bg-slate-800/50 backdrop-blur-lg shadow-2xl rounded-xl border border-slate-700 p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Image Upload and Preview Section */}
            <div className="space-y-6">
              <div
                className={`relative group aspect-video w-full border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out
                  ${imagePreview ? "border-yellow-500/70 hover:border-yellow-400" : "border-slate-600 hover:border-slate-500"}
                  flex flex-col justify-center items-center text-center p-6 cursor-pointer`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !imagePreview && document.getElementById("fileUpload")?.click()}
              >
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleInputChange}
                />
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Uploaded preview"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-red-600/80 rounded-full text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove image"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 text-slate-400 group-hover:text-slate-300 transition-colors">
                    <UploadCloud className="w-16 h-16 mx-auto" />
                    <p className="text-xl font-semibold">
                      Drag & drop an image here
                    </p>
                    <p className="text-sm">or click to browse (Max 5MB)</p>
                    <p className="text-xs text-slate-500 group-hover:text-slate-400">
                      Supports: JPG, PNG, WEBP, GIF
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCompareOcr}
                disabled={!imagePreview || isProcessing}
                className="w-full bg-gradient-to-r from-yellow-500 via-amber-600 to-orange-700 hover:from-yellow-400 hover:via-amber-500 hover:to-orange-600 text-slate-900 font-semibold py-3 px-6 rounded-lg shadow-md
                           transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Compare OCR Results
                  </span>
                )}
              </button>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-slate-200">AWS Textract Result</h3>
                <textarea
                  value={textractResult?.text || textractResult?.error || ""}
                  readOnly
                  placeholder={isProcessing ? "Extracting with Textract..." : "Textract's output will appear here."}
                  className="w-full h-64 p-3 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none custom-scrollbar"
                />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-slate-200">Gemini Result</h3>
                <textarea
                  value={geminiResult?.text || geminiResult?.error || ""}
                  readOnly
                  placeholder={isProcessing ? "Extracting with Gemini..." : "Gemini's output will appear here."}
                  className="w-full h-64 p-3 bg-slate-900/70 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none custom-scrollbar"
                />
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center mt-12 text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Forgotten Story. OCR Comparison Tool.</p>
        </footer>
      </div>
    </div>
  )
} 