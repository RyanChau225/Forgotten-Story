"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { format, parse, isValid, parseISO } from "date-fns"
import { Slider } from "@/components/ui/slider"
import { X, Copy, Camera, Upload, Clipboard, Calendar as CalendarIcon, Image as ImageIcon, Loader2, GripVertical, Type, FileText, Hash, ImageUp, ScanText, SmilePlus, CalendarDays } from "lucide-react"
import Image from "next/image"
import { validateImage, compressImage } from "@/lib/utils"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { getEntryById, createEntry, updateEntry } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const moodLabels = [
  { value: 1, label: "😭", description: "Overwhelmed" },
  { value: 2, label: "😢", description: "Very Sad" },
  { value: 3, label: "😔", description: "Sad" },
  { value: 4, label: "🙁", description: "Slightly Down" },
  { value: 5, label: "😐", description: "Neutral" },
  { value: 6, label: "🙂", description: "Okay" },
  { value: 7, label: "😊", description: "Happy" },
  { value: 8, label: "😄", description: "Very Happy" },
  { value: 9, label: "🥳", description: "Ecstatic" },
  { value: 10, label: "🤩", description: "Blissful" }
]

export default function NewEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [entryId, setEntryId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mood, setMood] = useState(5)
  const [date, setDate] = useState(new Date())
  const [manualDateInput, setManualDateInput] = useState<string>(format(new Date(), "yyyy-MM-dd"))
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false)
  const [hashtags, setHashtags] = useState("")
  const [tagsList, setTagsList] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [ocrImagePreviewUrl, setOcrImagePreviewUrl] = useState<string | null>(null)
  const [ocrFileForProcessing, setOcrFileForProcessing] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState("")
  const [isExtractingOcrText, setIsExtractingOcrText] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isLoadingEntry, setIsLoadingEntry] = useState(false)

  useEffect(() => {
    const checkUserAndLoadEntry = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/sign-in?redirectedFrom=/new-entry' + (searchParams.get('id') ? `?id=${searchParams.get('id')}`: ''))
        return
      }
      setUser(session.user)

      const idFromParams = searchParams.get('id')
      if (idFromParams) {
        setEntryId(idFromParams)
        setIsLoadingEntry(true)
        try {
          const fetchedEntry = await getEntryById(idFromParams)
          setTitle(fetchedEntry.title)
          setContent(fetchedEntry.content)
          setMood(fetchedEntry.mood)
          
          const entryDate = parseISO(fetchedEntry.date)
          if (isValid(entryDate)) {
            setDate(entryDate) 
            setManualDateInput(format(entryDate, "yyyy-MM-dd"))
          } else {
            setDate(new Date()) 
            setManualDateInput(format(new Date(), "yyyy-MM-dd"))
            toast({
              title: "Warning",
              description: "Loaded entry had an invalid date format. Defaulted to today.",
              variant: "default", 
            });
          }
          
          setHashtags(fetchedEntry.hashtags || [])
          setImages(fetchedEntry.image_urls || [])
        } catch (error: any) {
          console.error("Error fetching entry:", error)
          toast({
            title: "Error Loading Entry",
            description: error.message || "Could not load the entry for editing. Please try again.",
            variant: "destructive",
          })
          router.push("/new-entry")
        } finally {
          setIsLoadingEntry(false)
        }
      }
    }
    checkUserAndLoadEntry()
  }, [supabase, router, searchParams, toast])

  useEffect(() => {
    console.log("[useEffect date watcher] Main date state changed to:", date);
    setManualDateInput(format(date, "yyyy-MM-dd"));
  }, [date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an entry.",
        variant: "destructive",
      })
      return
    }
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    setLoading(true)

    const entryData = {
      user_id: user.id,
      title,
      content,
      mood,
      date: date.toISOString(),
      is_private: true,
      hashtags,
      image_urls: images,
    }

    try {
      let savedEntry;
      if (entryId) {
        savedEntry = await updateEntry({ ...entryData, id: entryId })
        toast({
          title: "Entry Updated",
          description: "Your journal entry has been successfully updated.",
        })
      } else {
        savedEntry = await createEntry(entryData)
        toast({
          title: "Entry Saved",
          description: "Your journal entry has been successfully saved.",
        })
      }
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving entry:", error)
      toast({
        title: "Error Saving Entry",
        description: "There was a problem saving your entry. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMoodChange = (value: number[]) => {
    setMood(Math.round(value[0]))
  }

  const handleOcrImageSelection = (selectedFile: File) => {
    if (selectedFile) {
      setOcrFileForProcessing(selectedFile);
      setExtractedText(""); // Clear previous OCR text
      const reader = new FileReader();
      reader.onloadend = () => {
        setOcrImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const triggerOcrProcessing = async () => {
    if (!ocrFileForProcessing) {
      toast.error("No image selected for text extraction.");
      return;
    }

    setIsExtractingOcrText(true);
    try {
      const fileToProcess = ocrFileForProcessing;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(fileToProcess);
      });

      const base64Data = base64.split(',')[1];
      const mimeType = fileToProcess.type;

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType }), // Pass mimeType
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setExtractedText(data.text);
      toast.success("Text extracted successfully!");
    } catch (error: any) {
      console.error('Error extracting OCR text:', error);
      toast.error(error.message || "Failed to extract text from image");
      setExtractedText("Error: Could not extract text."); // Provide feedback in text area
    } finally {
      setIsExtractingOcrText(false);
    }
  };

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

  const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Remove all non-digit characters
    let numericValue = rawValue.replace(/\D/g, "");

    // Limit to 8 digits (YYYYMMDD)
    if (numericValue.length > 8) {
      numericValue = numericValue.slice(0, 8);
    }

    let formattedValue = "";
    if (numericValue.length > 0) {
      formattedValue = numericValue.slice(0, 4); // Year
    }
    if (numericValue.length > 4) {
      formattedValue += "-" + numericValue.slice(4, 6); // Month
    }
    if (numericValue.length > 6) {
      formattedValue += "-" + numericValue.slice(6, 8); // Day
    }
    
    // Update the state with the formatted value, up to 10 characters
    setManualDateInput(formattedValue.slice(0, 10));
  };

  const validateAndSetDateFromManualInput = () => {
    console.log("[validateAndSetDateFromManualInput] manualDateInput:", manualDateInput);
    const parsedDate = parse(manualDateInput, "yyyy-MM-dd", new Date());
    console.log("[validateAndSetDateFromManualInput] parsedDate:", parsedDate);

    // Allow past, current, and future dates. Only restrict very old dates.
    if (isValid(parsedDate) && parsedDate >= new Date("1900-01-01")) {
      console.log("[validateAndSetDateFromManualInput] Parsed date is valid. Setting main date state.");
      setDate(parsedDate);
    } else {
      console.error("[validateAndSetDateFromManualInput] Invalid date entered. Reverting manual input.");
      toast.error("Invalid date. Please use YYYY-MM-DD format and a date after 1900.");
      setManualDateInput(format(date, "yyyy-MM-dd")); // Revert to last known good date from main state
    }
  };

  const handleDateSelectFromCalendar = (selectedDate: Date | undefined) => {
    console.log("[handleDateSelectFromCalendar] Selected from calendar:", selectedDate);
    if (selectedDate) {
      // Allow past, current, and future dates. Only restrict very old dates.
      if (selectedDate >= new Date("1900-01-01")) {
        console.log("[handleDateSelectFromCalendar] Calendar date is valid. Setting main date state.");
        setDate(selectedDate);
      } else {
        console.error("[handleDateSelectFromCalendar] Invalid calendar date selected.");
        toast.error("Cannot select a date before 1900.");
      }
    }
    setIsDatePopoverOpen(false);
  };

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

  if (isLoadingEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-yellow-500" />
        <p className="ml-4 text-lg">Loading entry for editing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-[2fr,1fr] lg:gap-8">
          {/* Desktop Left Column */}
          <div className="space-y-8">
            {/* Title Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center"><Type className="w-5 h-5 mr-2 text-gray-400" />Title</h2>
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
              <h2 className="text-lg font-semibold mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-400" />Content</h2>
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

            {/* Journal Images Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center"><ImageUp className="w-5 h-5 mr-2 text-gray-400" />Journal Images</h2>
                <div className="flex gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (imageInputRef.current) {
                        imageInputRef.current.setAttribute('capture', 'environment');
                        imageInputRef.current.click();
                      }
                    }}
                    disabled={uploadingImages}
                    className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture for Journal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      if (imageInputRef.current) {
                        imageInputRef.current.removeAttribute('capture');
                        imageInputRef.current.click();
                      }
                    }}
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
                        <span>Upload to Journal</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {images.length > 0 && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="images-desktop" direction="horizontal">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                      >
                        {images.map((url, index) => (
                          <Draggable key={url + "-desktop"} draggableId={url + "-desktop"} index={index}>
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
            
            {/* Tags Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center"><Hash className="w-5 h-5 mr-2 text-gray-400" />Tags</h2>
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

            {/* Submit Button for Desktop */}
            <button
              type="submit"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Entry"}
            </button>
          </div>

          {/* Desktop Right Column - Date and Mood moved here */}
          <div className="space-y-8">
            {/* Date Box - New Implementation */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h2 className="text-lg font-semibold mb-4 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-gray-400" />Date</h2>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={manualDateInput}
                  onChange={handleManualDateChange}
                  onBlur={validateAndSetDateFromManualInput}
                  className="flex-grow bg-black/20 border-white/10 focus:ring-yellow-500/50"
                />
                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="p-2 bg-black/20 border-white/10 hover:bg-black/30"
                      onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                      aria-label="Open date picker"
                    >
                      <CalendarIcon className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelectFromCalendar}
                      disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Mood Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center"><SmilePlus className="w-5 h-5 mr-2 text-gray-400" />Mood</h2>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{moodLabels[mood - 1].label}</span>
                  <span className="text-sm text-gray-400">{moodLabels[mood - 1].description}</span>
                </div>
              </div>
              <Slider
                value={[mood]}
                min={1}
                max={10}
                step={1}
                onValueChange={handleMoodChange}
                className="mb-6"
              />
              <div className="flex justify-between px-1 mb-2">
                {moodLabels.map((label) => (
                  <div key={label.value} className="flex flex-col items-center">
                    <span className="text-xs text-gray-400">{label.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extract Text from Image Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 space-y-4">
              <h2 className="text-lg font-semibold flex items-center"><ScanText className="w-5 h-5 mr-2 text-gray-400" />Extract Text from Image</h2>
              <p className="text-xs text-gray-400 -mt-2 mb-3">Upload an image here for text extraction. It won't be saved with your entry unless added separately via 'Journal Images'.</p>
              
              {ocrImagePreviewUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20">
                    <Image src={ocrImagePreviewUrl} alt="OCR Preview" layout="fill" objectFit="contain" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={triggerOcrProcessing}
                      disabled={isExtractingOcrText || !ocrFileForProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isExtractingOcrText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clipboard className="w-4 h-4" />}
                      {isExtractingOcrText ? "Extracting..." : "Extract Text"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOcrImagePreviewUrl(null);
                        setOcrFileForProcessing(null);
                        setExtractedText("");
                        if(fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" /> 
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && e.target.files[0] && handleOcrImageSelection(e.target.files[0])}
                    className="hidden"
                  />
                   <button
                    type="button"
                    onClick={() => { if(fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); }}}
                    className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Browse Files
                  </button>
                  <button
                    type="button"
                    onClick={() => { if(fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }}}
                    className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>
              )}

              {(extractedText || isExtractingOcrText) && (
                <div className="bg-black/20 rounded-lg p-4 space-y-4">
                  {isExtractingOcrText && !extractedText ? (
                    <div className="text-center text-sm text-gray-400 py-10">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Extracting text...
                    </div>
                  ) : (
                    <textarea
                      value={extractedText}
                      readOnly
                      placeholder="Extracted text will appear here..."
                      rows={6}
                      className="w-full bg-transparent text-sm text-white/90 whitespace-pre-wrap custom-scrollbar focus:outline-none resize-none"
                    />
                  )}
                  {extractedText && !isExtractingOcrText && (
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout - Apply similar Date Box changes here */}
        <div className="grid grid-cols-1 gap-8 lg:hidden">
          {/* Date Box - New Implementation for Mobile */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-gray-400" />Date</h2>
            <div className="flex items-center gap-2 mb-3">
              <Input
                type="text"
                placeholder="YYYY-MM-DD"
                value={manualDateInput}
                onChange={handleManualDateChange}
                onBlur={validateAndSetDateFromManualInput}
                className="flex-grow bg-black/20 border-white/10 focus:ring-yellow-500/50"
              />
              <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="p-2 bg-black/20 border-white/10 hover:bg-black/30"
                    onClick={() => setIsDatePopoverOpen(!isDatePopoverOpen)}
                    aria-label="Open date picker"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelectFromCalendar}
                    disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Mood Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center"><SmilePlus className="w-5 h-5 mr-2 text-gray-400" />Mood</h2>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{moodLabels[mood - 1].label}</span>
                <span className="text-sm text-gray-400">{moodLabels[mood - 1].description}</span>
              </div>
            </div>
            <Slider
              value={[mood]}
              min={1}
              max={10}
              step={1}
              onValueChange={handleMoodChange}
              className="mb-6"
            />
            <div className="flex justify-between px-1 mb-2">
              {moodLabels.map((label) => (
                <div key={label.value} className="flex flex-col items-center">
                  <span className="text-xs text-gray-400">{label.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Title Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center"><Type className="w-5 h-5 mr-2 text-gray-400" />Title</h2>
            <input
              type="text"
              placeholder="Enter a title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              required
            />
          </div>
          
          {/* Extract Text from Image Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 space-y-4">
            <h2 className="text-lg font-semibold flex items-center"><ScanText className="w-5 h-5 mr-2 text-gray-400" />Extract Text from Image</h2>
            <p className="text-xs text-gray-400 -mt-2 mb-3">Upload an image here for text extraction. It won't be saved with your entry unless added separately via 'Journal Images'.</p>
            
            {ocrImagePreviewUrl ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20">
                  <Image src={ocrImagePreviewUrl} alt="OCR Preview" layout="fill" objectFit="contain" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerOcrProcessing}
                    disabled={isExtractingOcrText || !ocrFileForProcessing}
                    className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isExtractingOcrText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clipboard className="w-4 h-4" />}
                    {isExtractingOcrText ? "Extracting..." : "Extract Text"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrImagePreviewUrl(null);
                      setOcrFileForProcessing(null);
                      setExtractedText("");
                      if(fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" /> 
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && e.target.files[0] && handleOcrImageSelection(e.target.files[0])}
                  className="hidden"
                />
                 <button
                  type="button"
                  onClick={() => { if(fileInputRef.current) { fileInputRef.current.removeAttribute('capture'); fileInputRef.current.click(); }}}
                  className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Browse Files
                </button>
                <button
                  type="button"
                  onClick={() => { if(fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); }}}
                  className="flex-1 flex items-center justify-center gap-2 bg-black/20 hover:bg-black/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            )}

            {(extractedText || isExtractingOcrText) && (
              <div className="bg-black/20 rounded-lg p-4 space-y-4">
                {isExtractingOcrText && !extractedText ? (
                  <div className="text-center text-sm text-gray-400 py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Extracting text...
                  </div>
                ) : (
                  <textarea
                    value={extractedText}
                    readOnly
                    placeholder="Extracted text will appear here..."
                    rows={6}
                    className="w-full bg-transparent text-sm text-white/90 whitespace-pre-wrap custom-scrollbar focus:outline-none resize-none"
                  />
                )}
                {extractedText && !isExtractingOcrText && (
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
                )}
              </div>
            )}
          </div>

          {/* Content Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center"><FileText className="w-5 h-5 mr-2 text-gray-400" />Content</h2>
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

          {/* Journal Images Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center"><ImageUp className="w-5 h-5 mr-2 text-gray-400" />Journal Images</h2>
              <div className="flex gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (imageInputRef.current) {
                      imageInputRef.current.setAttribute('capture', 'environment');
                      imageInputRef.current.click();
                    }
                  }}
                  disabled={uploadingImages}
                  className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture for Journal</span>
                </button>
                <button
                  type="button"
                  onClick={() => { 
                      if (imageInputRef.current) {
                        imageInputRef.current.removeAttribute('capture');
                        imageInputRef.current.click();
                      }
                    }}
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
                      <span>Upload to Journal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {images.length > 0 && (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="images-mobile" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-4"
                    >
                      {images.map((url, index) => (
                        <Draggable key={url + "-mobile"} draggableId={url + "-mobile"} index={index}>
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

          {/* Tags Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4 flex items-center"><Hash className="w-5 h-5 mr-2 text-gray-400" />Tags</h2>
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

          {/* Submit Button for Mobile */}
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-yellow-500 text-black font-medium py-3 rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  )
} 