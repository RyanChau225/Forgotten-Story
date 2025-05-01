"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Slider } from "@/components/ui/slider"
import { X, Copy, Camera, Upload, Clipboard, Calendar as CalendarIcon, Image as ImageIcon, Loader2, GripVertical } from "lucide-react"
import Image from "next/image"
import { validateImage, compressImage } from "@/lib/utils"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

const moodLabels = [
  { value: 1, label: "😢", description: "Very Sad" },
  { value: 2, label: "😔", description: "Sad" },
  { value: 3, label: "😐", description: "Neutral" },
  { value: 4, label: "🙂", description: "Happy" },
  { value: 5, label: "😊", description: "Very Happy" },
  { value: 6, label: "🥳", description: "Too Happy!" }
]

export default function NewEntryPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mood, setMood] = useState(3)
  const [date, setDate] = useState(new Date())
  const [hashtags, setHashtags] = useState("")
  const [tagsList, setTagsList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [extractedText, setExtractedText] = useState("")
  const [imageProcessing, setImageProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [draggedImage, setDraggedImage] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push("/sign-in")
      }
    }
    checkUser()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error("Not authenticated")
      }

      // Convert mood from 1-6 scale to 0-100 scale
      const normalizedMood = ((mood - 1) / 5) * 100

      const { error } = await supabase.from("entries").insert({
        title,
        content,
        mood: normalizedMood,
        created_at: date.toISOString(),
        user_id: session.user.id,
        hashtags: tagsList,
        image_urls: images
      })

      if (error) throw error

      toast.success("Entry created successfully!")
      router.push("/search")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create entry")
    } finally {
      setLoading(false)
    }
  }

  const handleMoodChange = (value: number[]) => {
    setMood(Math.round(value[0]))
  }

  const handleImageUpload = async (file: File) => {
    setImageProcessing(true)
    try {
      // Convert the file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      // Extract the base64 data (remove data:image/...;base64, prefix)
      const base64Data = base64.split(',')[1]

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setExtractedText(data.text)
      toast.success("Text extracted successfully!")
    } catch (error) {
      console.error('Error:', error)
      toast.error("Failed to extract text from image")
    } finally {
      setImageProcessing(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleCopyText = () => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText)
      toast.success("Text copied to clipboard!")
    }
  }

  const handlePasteToEntry = () => {
    if (extractedText && contentRef.current) {
      const currentContent = content
      const newContent = currentContent 
        ? currentContent + '\n' + extractedText 
        : extractedText
      setContent(newContent)
      toast.success("Text added to entry!")
    }
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hashtags.trim()) {
      e.preventDefault()
      // Remove # if it exists, and don't add it
      const newTag = hashtags.trim().startsWith('#') ? hashtags.trim().slice(1) : hashtags.trim()
      if (!tagsList.includes(newTag)) {
        setTagsList([...tagsList, newTag])
        setHashtags('')
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTagsList(tagsList.filter(tag => tag !== tagToRemove))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : new Date()
    setDate(newDate)
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      for (const file of files) {
        try {
          // Validate file
          validateImage(file)

          // Compress image
          const compressedFile = await compressImage(file)

          // Create a unique file path: userId/timestamp-filename
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          // Upload file directly without converting to buffer
          const { error: uploadError, data } = await supabase.storage
            .from('entry_images')
            .upload(fileName, compressedFile, {
              contentType: `image/${fileExt}`,
              cacheControl: '3600',
              upsert: true
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            throw uploadError
          }

          // Create signed URL that will work even with private bucket
          const { data: { signedUrl }, error: signedUrlError } = await supabase.storage
            .from('entry_images')
            .createSignedUrl(fileName, 60 * 60 * 24 * 365) // 1 year expiry

          if (signedUrlError) throw signedUrlError

          uploadedUrls.push(signedUrl)
          toast.success(`Image ${uploadedUrls.length} uploaded successfully!`)
        } catch (error: any) {
          console.error('Error uploading image:', error)
          toast.error(error.message || "Failed to upload image")
        }
      }

      if (uploadedUrls.length > 0) {
        setImages(prev => [...prev, ...uploadedUrls])
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error("Failed to upload images")
    } finally {
      setUploadingImages(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(images)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setImages(items)
  }

  const removeImage = async (urlToRemove: string) => {
    try {
      // Extract the file path from the signed URL
      const url = new URL(urlToRemove)
      const pathMatch = url.pathname.match(/\/entry_images\/([^?]+)/)
      if (!pathMatch) throw new Error("Invalid image URL")
      
      const path = pathMatch[1]
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('entry_images')
        .remove([path])

      if (error) throw error

      // Remove from state
      setImages(prev => prev.filter(url => url !== urlToRemove))
      toast.success("Image removed successfully!")
    } catch (error) {
      console.error('Error removing image:', error)
      toast.error("Failed to remove image")
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Title Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">Title</h2>
              <input
                type="text"
                placeholder="Enter a title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                required
              />
            </div>

            {/* Content Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">Content</h2>
              <textarea
                ref={contentRef}
                placeholder="Write your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none"
                required
              />
            </div>

            {/* Tags Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">Tags</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Type a tag and press Enter (e.g., coding)"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  onKeyDown={handleTagInput}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
                {tagsList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tagsList.map((tag, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full"
                      >
                        <span className="text-sm">#{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Images Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Images</h2>
                <div className="flex gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    capture="environment"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageInputRef.current) {
                        imageInputRef.current.capture = 'environment'
                        imageInputRef.current.click()
                      }
                    }}
                    disabled={uploadingImages}
                    className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {uploadingImages ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span>Add Images</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {images.length > 0 && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="images" direction="horizontal">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                      >
                        {images.map((url, index) => (
                          <Draggable key={url} draggableId={url} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`relative group aspect-square ${
                                  snapshot.isDragging ? 'z-50' : ''
                                }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab z-10"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <div className="relative w-full h-full">
                                  <Image
                                    src={url}
                                    alt={`Entry image ${index + 1}`}
                                    fill
                                    className="object-cover rounded-lg"
                                    onError={(e) => {
                                      const img = e.target as HTMLImageElement
                                      img.src = '/placeholder-image.jpg'
                                      toast.error(`Failed to load image ${index + 1}`)
                                    }}
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                                    loading={index < 2 ? "eager" : "lazy"}
                                    quality={75}
                                  />
                                </div>
                                <button
                                  onClick={() => removeImage(url)}
                                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/75 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Date Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">Date</h2>
              <div className="relative">
                <input
                  type="date"
                  value={format(date, 'yyyy-MM-dd')}
                  onChange={handleDateChange}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Mood Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Mood</h2>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{moodLabels[mood - 1].label}</span>
                  <span className="text-sm text-gray-400">{moodLabels[mood - 1].description}</span>
                </div>
              </div>
              <Slider
                value={[mood]}
                min={1}
                max={6}
                step={1}
                onValueChange={handleMoodChange}
                className="mb-6"
              />
              <div className="flex justify-between px-1">
                {moodLabels.map((label) => (
                  <div key={label.value} className="flex flex-col items-center">
                    <span className="text-xs text-gray-400">{label.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image to Text Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4">Extract Text from Image</h2>
              <div className="space-y-4">
                {/* Image Upload Buttons */}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.capture = 'environment'
                        fileInputRef.current.click()
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>

                {/* Extracted Text Display */}
                {(extractedText || imageProcessing) && (
                  <div className="bg-black/20 rounded-lg p-4 space-y-4">
                    {imageProcessing ? (
                      <div className="text-center text-sm text-gray-400">
                        Processing image...
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-white/90 whitespace-pre-wrap h-[200px] overflow-y-auto custom-scrollbar">
                          {extractedText}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCopyText}
                            className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Text
                          </button>
                          <button
                            type="button"
                            onClick={handlePasteToEntry}
                            className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            <Clipboard className="w-4 h-4" />
                            Add to Entry
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 