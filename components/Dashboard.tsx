"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Entry, MoodTrend, MemoryNotification, getEntries, getMoodTrends, getMemoryNotifications } from "@/lib/mock-data"




export default function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([])
  const [memories, setMemories] = useState<MemoryNotification[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    // Load initial data
    const { entries: initialEntries, hasMore: moreEntries } = getEntries(1)
    setEntries(initialEntries)
    setHasMore(moreEntries)
    setMoodTrends(getMoodTrends())
    setMemories(getMemoryNotifications())
  }, [])

  const loadMore = () => {
    const nextPage = page + 1
    const { entries: newEntries, hasMore: moreEntries } = getEntries(nextPage)
    setEntries([...entries, ...newEntries])
    setHasMore(moreEntries)
    setPage(nextPage)
  }

  const chartData = {
    labels: moodTrends.map(trend => format(new Date(trend.date), 'MMM d')),
    datasets: [
      {
        label: 'Mood',
        data: moodTrends.map(trend => trend.mood),
        borderColor: '#EAB308',
        backgroundColor: 'rgba(234, 179, 8, 0.5)',
        tension: 0.4
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        padding: 12,
        borderRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Entries */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>
          <div className="space-y-4">
            {entries.map(entry => (
              <div key={entry.id} className="bg-black/20 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{entry.title}</h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {format(new Date(entry.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <span className="text-2xl">{entry.mood >= 80 ? '🥳' : entry.mood >= 60 ? '😊' : entry.mood >= 40 ? '😐' : entry.mood >= 20 ? '😔' : '😢'}</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">{entry.content}</p>
                {entry.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.hashtags.map(tag => (
                      <span key={tag} className="text-xs bg-white/10 px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full mt-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              Load More
            </button>
          )}
        </div>

        {/* Journal Insights */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Journal Insights</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <h3 className="text-sm text-gray-400 mb-1">Total Entries</h3>
              <p className="text-2xl font-semibold">{entries.length}</p>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <h3 className="text-sm text-gray-400 mb-1">Used Tags</h3>
              <p className="text-2xl font-semibold">
                {Array.from(new Set(entries.flatMap(entry => entry.hashtags))).length}
              </p>
            </div>
            <div className="bg-black/20 rounded-lg p-4 text-center">
              <h3 className="text-sm text-gray-400 mb-1">Average Mood</h3>
              <p className="text-2xl font-semibold">
                {entries.length > 0
                  ? Math.round(entries.reduce((acc, entry) => acc + entry.mood, 0) / entries.length)
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

