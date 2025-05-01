"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import CenteredLayout from "@/components/CenteredLayout"
import { mockApi } from "@/lib/mock-data"

export default function CreateEntry() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mood, setMood] = useState("3")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await mockApi.createEntry({
        title,
        content,
        mood: parseInt(mood),
      })
      
      // Redirect to dashboard after successful creation
      router.push("/dashboard")
    } catch (error) {
      console.error("Error creating entry:", error)
      setError("Failed to create entry. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <CenteredLayout>
      <h1 className="text-3xl font-bold mb-8">Create New Entry</h1>
      <form onSubmit={handleSubmit} className="bg-white/10 p-8 rounded-lg backdrop-blur-md">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}
        <div className="mb-6">
          <label htmlFor="title" className="block mb-2 text-lg">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 rounded text-white"
            required
            disabled={loading}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="content" className="block mb-2 text-lg">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 rounded text-white h-40"
            required
            disabled={loading}
          ></textarea>
        </div>
        <div className="mb-6">
          <label htmlFor="mood" className="block mb-2 text-lg">
            Mood (1-5)
          </label>
          <select
            id="mood"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            className="w-full px-3 py-2 bg-white/20 rounded text-white"
            disabled={loading}
          >
            <option value="1">1 - Very Bad</option>
            <option value="2">2 - Bad</option>
            <option value="3">3 - Neutral</option>
            <option value="4">4 - Good</option>
            <option value="5">5 - Very Good</option>
          </select>
        </div>
        <button
          type="submit"
          className="bg-yellow-500 text-black px-6 py-3 rounded-full hover:bg-yellow-400 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Entry"}
        </button>
      </form>
    </CenteredLayout>
  )
}

