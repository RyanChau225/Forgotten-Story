"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { Search, Filter, SortAsc, SortDesc, ArrowUpDown, Trash2, FileText, X, Calendar as CalendarIcon, Sparkles, Loader2, Edit3, CalendarDays, SmilePlus, Hash, Image as ImageIcon } from "lucide-react"
import { Entry, searchEntries, deleteEntry, getEntryById } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { moodLabels } from "@/lib/moods"

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

  // Initial filter state - ensure they are non-restrictive by default
  const initialFiltersState = {
    startDate: "",
    endDate: "",
    moodRange: [1, 10] as [number, number], // Default to full range, assuming moods are 1-10
    hashtags: [] as string[]
  };
  const [filters, setFilters] = useState(initialFiltersState)

  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [hashtagInput, setHashtagInput] = useState("")
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [summaryGlow, setSummaryGlow] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [isSearching, setIsSearching] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const searchParams = useSearchParams();
  const [initialUrlSearchTriggered, setInitialUrlSearchTriggered] = useState(false);

  // Add debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [query])

  // Initial load effect for URL parameters
  useEffect(() => {
    const entryIdFromUrl = searchParams.get("entryId");
    const dateFromUrl = searchParams.get("date");

    const loadInitialData = async () => {
      if (entryIdFromUrl && !initialUrlSearchTriggered) {
        console.log("(Mount) EntryID from URL found:", entryIdFromUrl, "Fetching specific entry.");
        setIsSearching(true);
        try {
          const fetchedEntry = await getEntryById(entryIdFromUrl);
          if (fetchedEntry) {
            setSelectedEntry(fetchedEntry);
            setEntries([fetchedEntry]); // Display only this entry in the main list
            // Optionally, set filters to match this entry's date if desired for consistency
            setFilters(prevFilters => ({
              ...prevFilters,
              startDate: fetchedEntry.date.split('T')[0], // Assuming date is ISO string
              endDate: fetchedEntry.date.split('T')[0],
            }));
            // Scroll to the entry preview section
            setTimeout(() => {
              const previewSection = document.getElementById('entry-preview-section');
              if (previewSection) {
                previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100); // Timeout to allow DOM to update
          } else {
            toast({
              title: "Entry not found",
              description: `Could not find an entry with ID: ${entryIdFromUrl}`,
              variant: "destructive",
            });
            setEntries([]); // Clear entries if specific entry not found
          }
        } catch (error) {
          console.error("Error fetching entry by ID:", error);
          toast({
            title: "Error",
            description: "Failed to fetch the specified entry.",
            variant: "destructive",
          });
          setEntries([]);
        } finally {
          setIsSearching(false);
          setInitialUrlSearchTriggered(true);
        }
      } else if (dateFromUrl && !initialUrlSearchTriggered) {
        console.log("(Mount) Date from URL found (no EntryID):", dateFromUrl, "Setting filters.");
        setFilters(prevFilters => ({
          ...prevFilters,
          startDate: dateFromUrl,
          endDate: dateFromUrl,
        }));
        // The main search effect will pick this up
        // setInitialUrlSearchTriggered(true); // This will be set by the main search effect for dateFromUrl scenario
      } else if (!initialUrlSearchTriggered) {
        // This will be hit if no entryId and no dateFromUrl on initial load.
        // The main search effect will handle the initial general search.
        console.log("(Mount) No EntryID or Date from URL. Initial search will be triggered by main effect.");
      }
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once on mount

  // Memoize the search function
  const performSearch = useCallback(async () => {
    setIsSearching(true)
    try {
      const { entries: results } = await searchEntries(debouncedQuery, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        minMood: filters.moodRange[0],
        maxMood: filters.moodRange[1],
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
        // Fallback for title sort, or if you add other sortable text fields
        const titleA = a.title || "";
        const titleB = b.title || "";
        return sortDirection === "asc" 
          ? titleA.localeCompare(titleB)
          : titleB.localeCompare(titleA)
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

  // Main search effect - reacts to debouncedQuery and filter changes
  useEffect(() => {
    const dateFromUrl = searchParams.get("date");

    // Scenario 1: Date from URL is present, filters are set, and initial URL search hasn't been triggered yet.
    if (dateFromUrl && filters.startDate === dateFromUrl && filters.endDate === dateFromUrl && !initialUrlSearchTriggered) {
      console.log("PerformSearch Effect: Triggering search for initial URL date.", "Query:", debouncedQuery, "Filters:", filters);
      performSearch();
      setInitialUrlSearchTriggered(true); // Mark that the initial URL-based search has been done
    }
    // Scenario 2: No date from URL, and it's not the very first render with default filters (avoid initial empty search if URL date was expected)
    else if (!dateFromUrl && !initialUrlSearchTriggered) { 
      // This handles the case where the page loads without a date in the URL.
      // It also ensures that if a date WAS in the URL, we don't run this until initialUrlSearchTriggered is true.
      console.log("PerformSearch Effect: Triggering initial search (no URL date or after URL date processed).", "Query:", debouncedQuery, "Filters:", filters);
      performSearch();
      setInitialUrlSearchTriggered(true); // Mark that an initial search has occurred
    }
    // Scenario 3: Subsequent searches after initial load (e.g., user changes query or filters)
    else if (initialUrlSearchTriggered) {
      console.log("PerformSearch Effect: Triggering subsequent search.", "Query:", debouncedQuery, "Filters:", filters);
      performSearch();
    }
  }, [debouncedQuery, filters, performSearch, searchParams, initialUrlSearchTriggered]); // Added searchParams and initialUrlSearchTriggered

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
    const moodLabel = moodLabels.find(m => m.value === mood);
    return moodLabel ? moodLabel.label : '😐';
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
    setSummaryGlow(true)
    setTimeout(() => setSummaryGlow(false), 1500)
    setTimeout(scrollToEntry, 100)
  }

  const handleSummaryClick = (entry: Entry) => {
    setSelectedEntry(entry)
    setSummaryGlow(true)
    setTimeout(() => setSummaryGlow(false), 1500)
  }

  const handleGenerateAISummary = async () => {
    if (!selectedEntry) return;

    setIsGeneratingSummary(true);
    try {
      const response = await fetch('/api/entries/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: selectedEntry.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate A.I. summary');
      }

      const { summary, affirmations } = await response.json();

      setEntries(prevEntries =>
        prevEntries.map(e =>
          e.id === selectedEntry.id
            ? { ...e, ai_summary: summary, positive_affirmation: affirmations }
            : e
        )
      );

      setSelectedEntry(prev => prev ? { ...prev, ai_summary: summary, positive_affirmation: affirmations } : null);
      
      toast({
        title: "A.I. Insight Generated",
        description: "Summary and affirmations are ready.",
      });

    } catch (error: any) {
      console.error('Error generating A.I. summary:', error);
      setSelectedEntry(prev => prev ? { 
        ...prev, 
        ai_summary: "Could not generate summary.", 
        positive_affirmation: "Could not generate affirmations." 
      } : null);
      setEntries(prevEntries =>
        prevEntries.map(e =>
          e.id === selectedEntry.id
            ? { ...e, ai_summary: "Could not generate summary.", positive_affirmation: "Could not generate affirmations." }
            : e
        )
      );
      toast({
        title: "Error Generating A.I. Insight",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleClearFilters = () => {
    setQuery(""); // Clear search query as well
    setDebouncedQuery("");
    setFilters(initialFiltersState);
    // performSearch will be triggered by the useEffect watching `filters` and `debouncedQuery`
  };

  return (
    <div className="w-full px-4 pt-24 pb-8">
      <div className="w-full max-w-7xl mx-auto">
        {/* Mobile: Stack vertically, Desktop: Two columns */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr,400px] gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Search Input */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search entries..."
                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 sm:py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <Button 
                  type="button" 
                  onClick={handleClearFilters}
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-white/10 text-gray-300 border-white/20"
                >
                  Clear All Filters & Search
                </Button>
              </form>
            </div>

            {/* Mobile Filters */}
            <div className="lg:hidden space-y-6">
              {/* Filters Box */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
                <div className="space-y-6">
                  {/* Date Range */}
                  <div className="pb-6 border-b border-white/5">
                    <h4 className="text-base font-medium text-white mb-4 flex items-center">
                      <CalendarDays className="w-4 h-4 mr-2 text-gray-400" /> Date Range
                    </h4>
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
                    <h4 className="text-base font-medium text-white mb-4 flex items-center">
                      <SmilePlus className="w-4 h-4 mr-2 text-gray-400" /> Mood Range
                    </h4>
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
                            {moodLabels.map(mood => (
                              <option key={mood.value} value={mood.value} style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                                {`${mood.value} - ${mood.description}`}
                              </option>
                            ))}
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
                            {moodLabels.map(mood => (
                              <option key={mood.value} value={mood.value} style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                                {`${mood.value} - ${mood.description}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3">
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Mood Guide</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                          {moodLabels.slice(0, 5).map(mood => (
                            <div key={`guide-${mood.value}`}>{`${mood.value} - ${mood.description} ${mood.label}`}</div>
                          ))}
                          {moodLabels.slice(5, 10).map(mood => (
                            <div key={`guide-${mood.value}`}>{`${mood.value} - ${mood.description} ${mood.label}`}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hashtags */}
                  <div className="pt-2">
                    <h4 className="text-base font-medium text-white mb-4 flex items-center">
                      <Hash className="w-4 h-4 mr-2 text-gray-400" /> Hashtags
                    </h4>
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
                            className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs"
                          >
                            #{tag}
                            <button
                              onClick={() => removeHashtag(tag)}
                              className="ml-1.5 p-0.5 hover:bg-yellow-500/30 rounded-full"
                              aria-label={`Remove ${tag} filter`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              {selectedEntry && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium">Entry Summary</h3>
                    <button
                      onClick={() => setSelectedEntry(null)}
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
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 flex flex-col h-[600px] overflow-hidden">
              {/* Fixed Header */}
              <div className="bg-black/40 backdrop-blur-sm rounded-t-xl border-b border-white/10 overflow-x-auto">
                <table className="w-full table-auto min-w-[600px]">
                  <colgroup>
                    <col className="w-auto min-w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[60px]" />
                    <col className="w-auto min-w-[150px] md:min-w-[200px]" />
                    <col className="w-[100px] md:w-[120px] hidden sm:table-column" />
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
                      <th className="px-4 py-4 text-left text-sm font-medium text-white/70 hidden sm:table-cell">Tags</th>
                      <th className="px-4 py-4 text-center text-sm font-medium text-white/70 last:rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                </table>
              </div>
              
              {/* Scrollable Content */}
              <div className={`flex-1 overflow-auto ${scrollbarStyles}`}>
                <table className="w-full table-auto min-w-[600px]">
                  <colgroup>
                    <col className="w-auto min-w-[100px]" />
                    <col className="w-[100px]" />
                    <col className="w-[60px]" />
                    <col className="w-auto min-w-[150px] md:min-w-[200px]" />
                    <col className="w-[100px] md:w-[120px] hidden sm:table-column" />
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
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <span className="font-medium text-sm sm:text-base">{truncateContent(entry.title, 15)}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-400">
                            {format(new Date(entry.date), 'MMM d, yyyy')}
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-center">
                            <span className="text-lg sm:text-xl">{getMoodEmoji(entry.mood)}</span>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm text-gray-300">
                            <span className="line-clamp-2">{truncateContent(entry.content, 40)}</span>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
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
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/new-entry?id=${entry.id}`);
                                }}
                                className="p-1 sm:p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                title="Edit Entry"
                              >
                                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                              </button>
          <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(entry);
                                }}
                                className="p-1 sm:p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                                title="Delete Entry"
          >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 group-hover:text-red-500" />
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
            <div id="entry-preview-section" className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              {selectedEntry ? (
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedEntry.title}</h2>
                      <p className="text-gray-400 mt-1">
                        {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/new-entry?id=${selectedEntry.id}`);
                        }}
                        className="bg-white/10 hover:bg-white/20 border-white/20 flex items-center gap-1.5 px-3 py-1.5"
                        aria-label="Edit Entry"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </Button>
                      <span className="text-3xl">{getMoodEmoji(selectedEntry.mood)}</span>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-400" /> Content Log
                    </h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedEntry.content}</p>
                  </div>

                  {selectedEntry.hashtags && selectedEntry.hashtags.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                        <Hash className="w-4 h-4 mr-2 text-gray-400" /> Tags
                      </h4>
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
                      <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2 text-gray-400" /> Images
                      </h4>
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

            {/* Mobile AI Summary - Only shown on mobile when an entry is selected */}
            {selectedEntry && (
              <div className="lg:hidden bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">A.I. Entry Summary</h3>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 truncate pr-2">
                      Entry: {selectedEntry.title}
                    </span>
                    <span className="text-sm text-gray-400 flex-shrink-0">
                      {format(new Date(selectedEntry.date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {/* AI Content Display Logic */}
                  {isGeneratingSummary && selectedEntry.id === (selectedEntry ? selectedEntry.id : null) ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                      <p className="text-sm text-gray-400 mt-2">Generating insight...</p>
                    </div>
                  ) : selectedEntry.ai_summary && selectedEntry.ai_summary !== "Could not generate summary." ? (
                    <>
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Summary</h4>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">
                          {selectedEntry.ai_summary}
                        </p>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Positive Affirmations</h4>
                        {(() => {
                          let affirmationsToDisplay: { text: string; based_on?: string }[] = [];
                          if (selectedEntry && selectedEntry.positive_affirmation) {
                            if (typeof selectedEntry.positive_affirmation === 'string') {
                              try {
                                const parsed = JSON.parse(selectedEntry.positive_affirmation);
                                if (Array.isArray(parsed)) {
                                  affirmationsToDisplay = parsed.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                                } else if (selectedEntry.positive_affirmation !== "Could not generate affirmations.") {
                                  // This case might be redundant if the API always sends an array or stringified array
                                }
                              } catch (e) {
                                // If JSON.parse fails, and it's not the error string, treat as single old affirmation
                                if (selectedEntry.positive_affirmation !== "Could not generate affirmations.") {
                                  // This branch might not be hit if API always sends array/stringified array
                                }
                              }
                            } else if (Array.isArray(selectedEntry.positive_affirmation)) {
                              affirmationsToDisplay = selectedEntry.positive_affirmation.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                            }
                          }

                          // New logic: Check if affirmationsToDisplay is empty AFTER attempting to parse/assign
                          if (affirmationsToDisplay.length === 0) {
                              // Check if a summary exists and is not the error message
                              if (selectedEntry.ai_summary && selectedEntry.ai_summary !== "Could not generate summary.") {
                                  return <p className="text-sm text-gray-300 whitespace-pre-wrap">The A.I. analyzed this entry but couldn't find enough information to generate affirmations. Try adding more detail to your entry for better insights.</p>;
                              }
                              // Fallback if summary also failed or is missing
                              return <p className="text-sm text-gray-300 whitespace-pre-wrap">Could not generate affirmations.</p>;
                          }

                          return affirmationsToDisplay.map((aff, index) => (
                            <div key={index} className="mb-3 last:mb-0 p-2 bg-black/10 rounded-md">
                              <p className="text-sm text-gray-200 whitespace-pre-wrap font-medium">
                                {aff.text}
                              </p>
                              {aff.based_on && aff.based_on !== "N/A" && (
                                <p className="text-xs text-gray-400 italic mt-1">
                                  Based on: "{aff.based_on}"
                                </p>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                      <Button
                        onClick={handleGenerateAISummary}
                        disabled={isGeneratingSummary}
                        size="sm"
                        variant="outline"
                        className="w-full mt-4 bg-white/5 hover:bg-white/10 text-gray-300 border-white/20"
                      >
                        {isGeneratingSummary ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Regenerate Insight
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400 py-2">
                        {selectedEntry.ai_summary === "Could not generate summary." 
                          ? "Previously failed to generate A.I. insight. Try again?"
                          // New Message for initial state or when summary is present but no affirmations could be generated
                          : selectedEntry.ai_summary && (!selectedEntry.positive_affirmation || (Array.isArray(selectedEntry.positive_affirmation) && selectedEntry.positive_affirmation.length === 0))
                          ? "A.I. summary generated. Click to generate affirmations or add more detail to your entry for better results."
                          : "No A.I. insight generated yet for this entry."}
                      </p>
                      <Button
                        onClick={handleGenerateAISummary}
                        disabled={isGeneratingSummary}
                        size="sm"
                        className="w-full mt-3 bg-yellow-500/80 hover:bg-yellow-500 text-black"
                      >
                        {isGeneratingSummary ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate A.I. Insight
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Filters and Summary */}
          <div className={`hidden lg:block lg:space-y-8 ${scrollbarStyles}`}>
            {/* Filters Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <Button 
                  type="button" 
                  onClick={handleClearFilters}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Clear Filters
                </Button>
              </div>
              <div className="space-y-6">
                {/* Date Range */}
                <div className="pb-6 border-b border-white/5">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-white flex items-center">
                      <CalendarDays className="w-4 h-4 mr-2 text-gray-400" /> Date Range
                    </h4>
                  </div>
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
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-white flex items-center">
                      <SmilePlus className="w-4 h-4 mr-2 text-gray-400" /> Mood Range
                    </h4>
                  </div>
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
                          {moodLabels.map(mood => (
                            <option key={mood.value} value={mood.value} style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                              {`${mood.value} - ${mood.description}`}
                            </option>
                          ))}
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
                          {moodLabels.map(mood => (
                            <option key={mood.value} value={mood.value} style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                              {`${mood.value} - ${mood.description}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3">
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Mood Guide</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        {moodLabels.slice(0, 5).map(mood => (
                          <div key={`guide-desktop-${mood.value}`}>{`${mood.value} - ${mood.description} ${mood.label}`}</div>
                        ))}
                        {moodLabels.slice(5, 10).map(mood => (
                          <div key={`guide-desktop-${mood.value}`}>{`${mood.value} - ${mood.description} ${mood.label}`}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base font-medium text-white flex items-center">
                      <Hash className="w-4 h-4 mr-2 text-gray-400" /> Hashtags
                    </h4>
                  </div>
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
                          className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs"
                        >
                          #{tag}
                          <button
                            onClick={() => removeHashtag(tag)}
                            className="ml-1.5 p-0.5 hover:bg-yellow-500/30 rounded-full"
                            aria-label={`Remove ${tag} filter`}
                          >
                            <X className="w-3 h-3" />
                          </button>
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
                  <h3 className="text-sm font-medium">A.I. Entry Summary</h3>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedEntry ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 truncate pr-2">
                        Entry: {selectedEntry.title}
                      </span>
                      <span className="text-sm text-gray-400 flex-shrink-0">
                        {format(new Date(selectedEntry.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {/* AI Content Display Logic */}
                    {isGeneratingSummary && selectedEntry.id === (selectedEntry ? selectedEntry.id : null) ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                        <p className="text-sm text-gray-400 mt-2">Generating insight...</p>
                      </div>
                    ) : selectedEntry.ai_summary && selectedEntry.ai_summary !== "Could not generate summary." ? (
                      <>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Summary</h4>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">
                            {selectedEntry.ai_summary}
                          </p>
                        </div>
                        <div className="mt-3">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Positive Affirmations</h4>
                          {(() => {
                            let affirmationsToDisplay: { text: string; based_on?: string }[] = [];
                            if (selectedEntry && selectedEntry.positive_affirmation) {
                              if (typeof selectedEntry.positive_affirmation === 'string') {
                                try {
                                  const parsed = JSON.parse(selectedEntry.positive_affirmation);
                                  if (Array.isArray(parsed)) {
                                    affirmationsToDisplay = parsed.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                                  } else if (selectedEntry.positive_affirmation !== "Could not generate affirmations.") {
                                    // This case might be redundant if the API always sends an array or stringified array
                                  }
                                } catch (e) {
                                  // If JSON.parse fails, and it's not the error string, treat as single old affirmation
                                  if (selectedEntry.positive_affirmation !== "Could not generate affirmations.") {
                                    // This branch might not be hit if API always sends array/stringified array
                                  }
                                }
                              } else if (Array.isArray(selectedEntry.positive_affirmation)) {
                                affirmationsToDisplay = selectedEntry.positive_affirmation.filter(item => typeof item === 'object' && item !== null && 'text' in item);
                              }
                            }

                            // New logic: Check if affirmationsToDisplay is empty AFTER attempting to parse/assign
                            if (affirmationsToDisplay.length === 0) {
                                // Check if a summary exists and is not the error message
                                if (selectedEntry.ai_summary && selectedEntry.ai_summary !== "Could not generate summary.") {
                                    return <p className="text-sm text-gray-300 whitespace-pre-wrap">The A.I. analyzed this entry but couldn't find enough information to generate affirmations. Try adding more detail to your entry for better insights.</p>;
                                }
                                // Fallback if summary also failed or is missing
                                return <p className="text-sm text-gray-300 whitespace-pre-wrap">Could not generate affirmations.</p>;
                            }

                            return affirmationsToDisplay.map((aff, index) => (
                              <div key={index} className="mb-3 last:mb-0 p-2 bg-black/10 rounded-md">
                                <p className="text-sm text-gray-200 whitespace-pre-wrap font-medium">
                                  {aff.text}
                                </p>
                                {aff.based_on && aff.based_on !== "N/A" && (
                                  <p className="text-xs text-gray-400 italic mt-1">
                                    Based on: "{aff.based_on}"
                                  </p>
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                        <Button
                          onClick={handleGenerateAISummary}
                          disabled={isGeneratingSummary}
                          size="sm"
                          variant="outline"
                          className="w-full mt-4 bg-white/5 hover:bg-white/10 text-gray-300 border-white/20"
                        >
                          {isGeneratingSummary ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Regenerate Insight
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-400 py-2">
                          {selectedEntry.ai_summary === "Could not generate summary." 
                            ? "Previously failed to generate A.I. insight. Try again?"
                            // New Message for initial state or when summary is present but no affirmations could be generated
                            : selectedEntry.ai_summary && (!selectedEntry.positive_affirmation || (Array.isArray(selectedEntry.positive_affirmation) && selectedEntry.positive_affirmation.length === 0))
                            ? "A.I. summary generated. Click to generate affirmations or add more detail to your entry for better results."
                            : "No A.I. insight generated yet for this entry."}
                        </p>
                        <Button
                          onClick={handleGenerateAISummary}
                          disabled={isGeneratingSummary}
                          size="sm"
                          className="w-full mt-3 bg-yellow-500/80 hover:bg-yellow-500 text-black"
                        >
                          {isGeneratingSummary ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Generate A.I. Insight
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 space-y-4">
                    <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-white">A.I.-Powered Journal Insights</h4>
                      <p className="text-sm text-gray-400">
                        Our A.I. can analyze your journal entries to provide:
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

