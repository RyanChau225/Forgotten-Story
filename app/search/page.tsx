"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Search, Filter, SortAsc, SortDesc, ArrowUpDown, Trash2, FileText, X, Calendar as CalendarIcon } from "lucide-react"
import { Entry, searchEntries, deleteEntry } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type SortField = "date" | "mood" | "title"
type SortDirection = "asc" | "desc"

// Update scrollbar styles to be more subtle
const scrollbarStyles = `
  [&::-webkit-scrollbar] {
    width: 10px;
  }
  [&::-webkit-scrollbar-track] {
    background: transparent;
  }
  [&::-webkit-scrollbar-thumb] {
    background-color: rgba(255, 255, 255, 0.1);
    border: 3px solid rgba(0, 0, 0, 0);
    background-clip: padding-box;
    border-radius: 9999px;
    min-height: 50px;
  }
  [&::-webkit-scrollbar-thumb:hover] {
    background-color: rgba(255, 255, 255, 0.15);
  }
`

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    moodRange: [1, 6] as [number, number],
    hashtags: [] as string[]
  })
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [hashtagInput, setHashtagInput] = useState("")
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedEntryForSummary, setSelectedEntryForSummary] = useState<Entry | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [summaryGlow, setSummaryGlow] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)

  const convertMoodToScale = (mood: number) => {
    return Math.ceil(mood / 20) + 1
  }

  const convertScaleToMood = (scale: number) => {
    return (scale - 1) * 20
  }

  // Add debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [query])

  // Memoize the search function
  const performSearch = useCallback(async () => {
    setIsSearching(true)
    try {
      const { entries: results } = await searchEntries(debouncedQuery, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        minMood: convertScaleToMood(filters.moodRange[0]),
        maxMood: convertScaleToMood(filters.moodRange[1]),
        hashtags: filters.hashtags
      })

      const sorted = [...results].sort((a, b) => {
        if (sortField === "date") {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA
        }
        if (sortField === "mood") {
          return sortDirection === "asc" ? a.mood - b.mood : b.mood - a.mood
        }
        return sortDirection === "asc" 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      })
      setEntries(sorted)
    } catch (error) {
      console.error('Error fetching entries:', error)
      toast({
        title: "Error",
        description: "Failed to fetch entries. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }, [debouncedQuery, filters, sortField, sortDirection, toast])

  // Initial load effect
  useEffect(() => {
    performSearch()
  }, [])

  // Update search effect to use debounced query
  useEffect(() => {
    performSearch()
  }, [performSearch])

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sortedEntries = [...entries].sort((a, b) => {
      if (field === 'title') {
        // Extract numbers from titles (e.g., "Entry 1" -> 1)
        const numA = parseInt(a.title.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.title.match(/\d+/)?.[0] || '0');
        return newDirection === 'asc' ? numA - numB : numB - numA;
      }
      
      if (field === 'date') {
        return newDirection === 'asc'
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      const aValue = a[field];
      const bValue = b[field];
      
      if (aValue < bValue) return newDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return newDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setEntries(sortedEntries);
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + "..."
  }

  const getMoodEmoji = (mood: number) => {
    if (mood >= 80) return '🥳'
    if (mood >= 60) return '😊'
    if (mood >= 40) return '😐'
    if (mood >= 20) return '😔'
    return '😢'
  }

  // Update the search form handler
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // The search will be handled by the effect
  }

  const handleHashtagAdd = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && hashtagInput.trim()) {
      e.preventDefault()
      if (!filters.hashtags.includes(hashtagInput.trim())) {
        setFilters(prev => ({
          ...prev,
          hashtags: [...prev.hashtags, hashtagInput.trim()]
        }))
      }
      setHashtagInput("")
    }
  }

  const removeHashtag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }))
  }

  const handleDelete = (entry: Entry) => {
    setEntryToDelete(entry)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (entryToDelete) {
      try {
        await deleteEntry(entryToDelete.id)
        setEntries(entries.filter(e => e.id !== entryToDelete.id))
        toast({
          title: "Success",
          description: "Entry deleted successfully",
        })
        setShowDeleteDialog(false)
        setEntryToDelete(null)
        router.refresh()
      } catch (error) {
        console.error('Error deleting entry:', error)
        toast({
          title: "Error",
          description: "Failed to delete entry. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const scrollToEntry = () => {
    const entryElement = document.getElementById('entry-showcase')
    if (entryElement) {
      entryElement.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleEntryClick = (entry: Entry) => {
    setSelectedEntry(entry)
    setTimeout(scrollToEntry, 100) // Small delay to ensure DOM is updated
  }

  const handleSummaryClick = (entry: Entry) => {
    setSelectedEntryForSummary(entry)
    setSummaryGlow(true)
    setTimeout(() => setSummaryGlow(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 pt-24 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Mobile: Stack vertically, Desktop: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Search Input */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search entries..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
            </div>

            {/* Mobile Filters */}
            <div className="lg:hidden space-y-8">
              {/* Filters Box */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
                <div className="space-y-6">
                  {/* Date Range */}
                  <div className="pb-6 border-b border-white/5">
                    <h4 className="text-base font-medium text-white mb-4">Date Range</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Start Date
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase cursor-pointer"
                            placeholder="MM/DD/YYYY"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          End Date
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase cursor-pointer"
                            placeholder="MM/DD/YYYY"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mood Range */}
                  <div className="pb-6 border-b border-white/5">
                    <h4 className="text-base font-medium text-white mb-4">Mood Range</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">From</label>
                          <select
                            value={filters.moodRange[0]}
                            onChange={(e) => setFilters(prev => ({ ...prev, moodRange: [parseInt(e.target.value), prev.moodRange[1]] }))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                          >
                            <option value={1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>1 - Very Sad</option>
                            <option value={2} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>2 - Sad</option>
                            <option value={3} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>3 - Neutral</option>
                            <option value={4} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>4 - Happy</option>
                            <option value={5} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>5 - Very Happy</option>
                            <option value={6} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>6 - Too Happy!</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">To</label>
                          <select
                            value={filters.moodRange[1]}
                            onChange={(e) => setFilters(prev => ({ ...prev, moodRange: [prev.moodRange[0], parseInt(e.target.value)] }))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                          >
                            <option value={1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>1 - Very Sad</option>
                            <option value={2} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>2 - Sad</option>
                            <option value={3} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>3 - Neutral</option>
                            <option value={4} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>4 - Happy</option>
                            <option value={5} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>5 - Very Happy</option>
                            <option value={6} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>6 - Too Happy!</option>
                          </select>
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Mood Guide</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>1 - Very Sad 😢</div>
                          <div>4 - Happy 🙂</div>
                          <div>2 - Sad 😔</div>
                          <div>5 - Very Happy 😊</div>
                          <div>3 - Neutral 😐</div>
                          <div>6 - Too Happy! 🥳</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="pt-2">
                    <h4 className="text-base font-medium text-white mb-4">Hashtags</h4>
          <input
            type="text"
                      value={hashtagInput}
                      onChange={(e) => setHashtagInput(e.target.value)}
                      onKeyDown={handleHashtagAdd}
                      placeholder="Add hashtags (press Enter)"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    />
                    {filters.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {filters.hashtags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              {selectedEntryForSummary && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Entry Summary</h3>
                    <button
                      onClick={() => setSelectedEntryForSummary(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400">
                    Summary will appear here when generated...
                  </p>
                </div>
              )}
            </div>

            {/* Table Results */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 flex flex-col h-[600px]">
              {/* Fixed Header */}
              <div className="bg-black/40 backdrop-blur-sm rounded-t-xl border-b border-white/10">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[140px]" />
                    <col className="w-[100px]" />
                    <col className="w-[60px]" />
                    <col className="w-[200px]" />
                    <col className="w-[120px]" />
                    <col className="w-[70px]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="px-4 py-4 first:rounded-tl-xl">
                        <button 
                          onClick={() => handleSort("title")}
                          className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white"
                        >
                          <span>Title</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button 
                          onClick={() => handleSort("date")}
                          className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white"
                        >
                          <span>Date</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button 
                          onClick={() => handleSort("mood")}
                          className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white"
                        >
                          <span>Mood</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white/70">Entry Preview</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white/70">Tags</th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-white/70 last:rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                </table>
              </div>
              
              {/* Scrollable Content */}
              <div className={`flex-1 overflow-auto ${scrollbarStyles}`}>
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[140px]" />
                    <col className="w-[100px]" />
                    <col className="w-[60px]" />
                    <col className="w-[200px]" />
                    <col className="w-[120px]" />
                    <col className="w-[70px]" />
                  </colgroup>
                  <tbody className="divide-y divide-white/10">
                    {entries.length > 0 ? (
                      entries.map((entry) => (
                        <tr 
                          key={entry.id}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onClick={() => handleEntryClick(entry)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="font-medium">{truncateContent(entry.title, 20)}</span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                            {format(new Date(entry.date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <span className="text-xl">{getMoodEmoji(entry.mood)}</span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-300">
                            {truncateContent(entry.content)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {entry.hashtags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-white/10 px-2 py-0.5 rounded-full truncate"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSummaryClick(entry)
                                }}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                title="Generate Summary"
                              >
                                <FileText className="w-4 h-4 text-gray-400" />
                              </button>
          <button
                                onClick={() => handleDelete(entry)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                                title="Delete Entry"
          >
                                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
          </button>
        </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8">
                          <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
                              {isSearching ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/40" />
                              ) : (
                                <Search className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <h3 className="text-sm font-medium text-white mb-1">
                              {isSearching ? "Searching..." : "No entries found"}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {isSearching ? "Please wait while we find your entries" :
                                query || filters.hashtags.length > 0 || filters.startDate || filters.endDate ? 
                                "Try adjusting your search filters" : 
                                "Start by creating your first journal entry"
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Entry Preview */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              {selectedEntry ? (
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedEntry.title}</h2>
                      <p className="text-gray-400 mt-1">
                        {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <span className="text-3xl">{getMoodEmoji(selectedEntry.mood)}</span>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedEntry.content}</p>
                  </div>

                  {selectedEntry.hashtags && selectedEntry.hashtags.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEntry.hashtags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-sm bg-white/10 px-3 py-1 rounded-full text-gray-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEntry.image_urls && selectedEntry.image_urls.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Images</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {selectedEntry.image_urls.map((imageUrl: string, index: number) => (
                          <a
                            key={index}
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={imageUrl}
                              alt={`Entry image ${index + 1}`}
                              className="rounded-lg w-full h-32 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  Select an entry to view details
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Desktop Filters and Summary */}
          <div className={`hidden lg:block lg:space-y-8 ${scrollbarStyles}`}>
            {/* Filters Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
              <div className="space-y-6">
                {/* Date Range */}
                <div className="pb-6 border-b border-white/5">
                  <h4 className="text-base font-medium text-white mb-4">Date Range</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Start Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase cursor-pointer"
                          placeholder="MM/DD/YYYY"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        End Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase cursor-pointer"
                          placeholder="MM/DD/YYYY"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mood Range */}
                <div className="pb-6 border-b border-white/5">
                  <h4 className="text-base font-medium text-white mb-4">Mood Range</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">From</label>
                        <select
                          value={filters.moodRange[0]}
                          onChange={(e) => setFilters(prev => ({ ...prev, moodRange: [parseInt(e.target.value), prev.moodRange[1]] }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                        >
                          <option value={1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>1 - Very Sad</option>
                          <option value={2} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>2 - Sad</option>
                          <option value={3} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>3 - Neutral</option>
                          <option value={4} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>4 - Happy</option>
                          <option value={5} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>5 - Very Happy</option>
                          <option value={6} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>6 - Too Happy!</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">To</label>
                        <select
                          value={filters.moodRange[1]}
                          onChange={(e) => setFilters(prev => ({ ...prev, moodRange: [prev.moodRange[0], parseInt(e.target.value)] }))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                        >
                          <option value={1} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>1 - Very Sad</option>
                          <option value={2} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>2 - Sad</option>
                          <option value={3} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>3 - Neutral</option>
                          <option value={4} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>4 - Happy</option>
                          <option value={5} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>5 - Very Happy</option>
                          <option value={6} style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>6 - Too Happy!</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Mood Guide</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>1 - Very Sad 😢</div>
                        <div>4 - Happy 🙂</div>
                        <div>2 - Sad 😔</div>
                        <div>5 - Very Happy 😊</div>
                        <div>3 - Neutral 😐</div>
                        <div>6 - Too Happy! 🥳</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="pt-2">
                  <h4 className="text-base font-medium text-white mb-4">Hashtags</h4>
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleHashtagAdd}
                    placeholder="Add hashtags (press Enter)"
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm"
                  />
                  {filters.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {filters.hashtags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Summary Box */}
            <div className="sticky top-28">
              <div className={`bg-white/10 backdrop-blur-md rounded-xl border transition-all duration-500 ${
                summaryGlow ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'border-white/10'
              } p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">AI Entry Summary</h3>
                  <button
                    onClick={() => setSelectedEntryForSummary(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedEntryForSummary ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        Entry: {selectedEntryForSummary.title}
                      </span>
                      <span className="text-sm text-gray-400">
                        {format(new Date(selectedEntryForSummary.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">
                        {selectedEntryForSummary.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 space-y-4">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">AI-Powered Journal Insights</h4>
                      <p className="text-sm text-gray-400">
                        Our AI can analyze your journal entries to provide:
                      </p>
                      <ul className="text-sm text-gray-400 space-y-1">
                        <li>• Key themes and topics</li>
                        <li>• Emotional patterns</li>
                        <li>• Main events and highlights</li>
        </ul>
                      <p className="text-xs text-gray-500 mt-4">
                        Click the document icon <FileText className="w-3 h-3 inline" /> in the table actions to analyze an entry
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Entry</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this entry? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  )
}

