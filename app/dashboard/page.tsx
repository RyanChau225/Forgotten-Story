"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Book, Calendar, Hash, Smile, BarChart3, Clock, TrendingUp } from "lucide-react"
import CenteredLayout from "@/components/CenteredLayout"
import { Entry, getEntries } from "@/lib/api"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

const timeFrames = ["Week", "Month", "Year"]

// Mock mood data for visualization
const moodBars = [
  { value: 65, label: "Jun" },
  { value: 80, label: "Jul" },
  { value: 75, label: "Aug" },
  { value: 90, label: "Sep" },
  { value: 85, label: "Oct" },
  { value: 95, label: "Nov" },
  { value: 88, label: "Dec" },
]

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("Month")
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (!session?.user) {
        router.push('/sign-in')
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        router.push('/sign-in')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  // Fetch entries
  useEffect(() => {
    async function fetchEntries() {
      try {
        const { entries: newEntries, hasMore: more } = await getEntries(1)
        setEntries(newEntries)
        setHasMore(more)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching entries:', error)
        toast({
          title: "Error",
          description: "Failed to load entries. Please try again.",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    if (user) {
      fetchEntries()
    }
  }, [user, toast])

  // Load more entries
  const loadMore = async () => {
    try {
      const nextPage = page + 1
      const { entries: newEntries, hasMore: more } = await getEntries(nextPage)
      setEntries([...entries, ...newEntries])
      setHasMore(more)
      setPage(nextPage)
    } catch (error) {
      console.error('Error loading more entries:', error)
      toast({
        title: "Error",
        description: "Failed to load more entries. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate stats
  const stats = {
    totalEntries: entries.length,
    uniqueTags: [...new Set(entries.flatMap(entry => entry.hashtags))].length,
    averageMood: entries.length > 0
      ? Math.round(entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length)
      : 0
  }

  return (
    <div className="min-h-screen w-full bg-[url('/mountains.jpg')] bg-cover bg-center">
      <div className="min-h-screen w-full">
    <CenteredLayout>
          <div className="w-full max-w-6xl space-y-6 pt-24 px-4">
            {/* Main Container Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-lg overflow-hidden">
              {/* Header Section */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-white">Journal Insights</h1>
                    <p className="text-gray-300 mt-1">Track and analyze your journaling journey</p>
                  </div>
                  <div className="flex gap-2 bg-white/10 rounded-full p-1 backdrop-blur-md">
                    {timeFrames.map((timeFrame) => (
                      <button
                        key={timeFrame}
                        onClick={() => setSelectedTimeFrame(timeFrame)}
                        className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                          selectedTimeFrame === timeFrame
                            ? "bg-white/10 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {timeFrame}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Book className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-300 font-medium">Total Entries</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.totalEntries}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Hash className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-300 font-medium">Used Tags</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.uniqueTags}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <Smile className="w-6 h-6 text-gray-300" />
                      </div>
                      <div>
                        <p className="text-lg text-gray-300 font-medium">Average Mood</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.averageMood}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mood Trends and Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Mood Trends */}
                  <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-white">Mood Trends</h2>
                        <p className="text-gray-300 mt-1">Your emotional journey over time</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-full">
                        <TrendingUp className="w-4 h-4 text-gray-300" />
                        <span className="text-gray-300">Average Mood</span>
                      </div>
                    </div>
                    <div className="h-[300px] flex items-end justify-between gap-2">
                      {moodBars.map((bar, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                            className="w-full bg-white/10 rounded-lg transition-all duration-500 relative group hover:bg-white/20"
                            style={{ height: `${bar.value}%` }}
                          >
                            <div 
                              className="w-full bg-white/20 rounded-t-lg transition-all duration-500 absolute top-0"
                              style={{ height: '2px' }}
                            />
                          </div>
                          <span className="text-sm text-gray-300 font-medium">{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                    <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <Clock className="w-5 h-5 text-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-white">New entry added</p>
                          <p className="text-xs text-gray-400 mt-0.5">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <Hash className="w-5 h-5 text-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-white">New tag created: "reflection"</p>
                          <p className="text-xs text-gray-400 mt-0.5">Yesterday</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <BarChart3 className="w-5 h-5 text-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-white">Mood trend improving</p>
                          <p className="text-xs text-gray-400 mt-0.5">This week</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                        <Calendar className="w-5 h-5 text-gray-300" />
                        <div>
                          <p className="text-sm font-medium text-white">Consistent journaling streak</p>
                          <p className="text-xs text-gray-400 mt-0.5">5 days in a row</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Entries */}
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
                  <h2 className="text-xl font-bold text-white mb-6">Recent Entries</h2>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    </div>
                  ) : entries.length > 0 ? (
                    <div className="space-y-4">
                      {entries.map((entry) => (
                        <div key={entry.id} className="bg-black/20 rounded-lg p-4 hover:bg-black/30 transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium text-white">{entry.title}</h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {format(new Date(entry.created_at), 'MMMM d, yyyy')}
                              </p>
                            </div>
                            <span className="text-2xl">
                              {entry.mood >= 80 ? '🥳' : 
                               entry.mood >= 60 ? '😊' : 
                               entry.mood >= 40 ? '😐' : 
                               entry.mood >= 20 ? '😔' : '😢'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 mt-2 line-clamp-2">{entry.content}</p>
                          {entry.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {entry.hashtags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
        </div>
                      ))}
                      {hasMore && (
                        <button
                          onClick={loadMore}
                          className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                        >
                          Load More
                        </button>
          )}
        </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No entries yet. Start your journaling journey today!
                    </div>
                  )}
        </div>
          </div>
        </div>
      </div>
    </CenteredLayout>
      </div>
    </div>
  )
}

