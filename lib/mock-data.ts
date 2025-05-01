import { format, subDays } from 'date-fns'

export type Entry = {
  id: string
  title: string
  content: string
  mood: number
  date: string
  hashtags: string[]
  images: string[]
  userId: string
}

export type MoodTrend = {
  date: string
  mood: number
}

export type MemoryNotification = {
  id: string
  entryId: string
  title: string
  date: string
  yearsAgo: number
}

// Generate 20 mock entries
export const mockEntries: Entry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `entry-${i + 1}`,
  title: `Entry ${i + 1}`,
  content: `This is a mock entry content for entry ${i + 1}. It contains some sample text to demonstrate how entries would look like in the application.`,
  mood: Math.floor(Math.random() * 100),
  date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
  hashtags: [`mood${i % 5}`, `tag${i}`, 'daily'],
  images: i % 3 === 0 ? [`image${i}.jpg`] : [],
  userId: 'user-1'
}))

// Generate mock mood trends for the last 7 days
export const mockMoodTrends: MoodTrend[] = Array.from({ length: 7 }, (_, i) => ({
  date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
  mood: Math.floor(Math.random() * 100)
}))

// Generate mock memory notifications
export const mockMemoryNotifications: MemoryNotification[] = [
  {
    id: 'memory-1',
    entryId: 'entry-1',
    title: 'A year ago today...',
    date: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
    yearsAgo: 1
  },
  {
    id: 'memory-2',
    entryId: 'entry-2',
    title: '2 years ago today...',
    date: format(subDays(new Date(), 730), 'yyyy-MM-dd'),
    yearsAgo: 2
  }
]

// Mock data store functions
let entries = [...mockEntries]

export const getEntries = (page = 1, limit = 10) => {
  const start = (page - 1) * limit
  const end = start + limit
  return {
    entries: entries.slice(start, end),
    hasMore: end < entries.length
  }
}

export const searchEntries = (query: string, filters?: {
  startDate?: string
  endDate?: string
  minMood?: number
  maxMood?: number
  hashtags?: string[]
}) => {
  let filtered = [...entries]

  if (query) {
    filtered = filtered.filter(entry =>
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.content.toLowerCase().includes(query.toLowerCase()) ||
      entry.hashtags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    )
  }

  if (filters) {
    if (filters.startDate) {
      filtered = filtered.filter(entry => entry.date >= filters.startDate!)
    }
    if (filters.endDate) {
      filtered = filtered.filter(entry => entry.date <= filters.endDate!)
    }
    if (filters.minMood !== undefined) {
      filtered = filtered.filter(entry => entry.mood >= filters.minMood!)
    }
    if (filters.maxMood !== undefined) {
      filtered = filtered.filter(entry => entry.mood <= filters.maxMood!)
    }
    if (filters.hashtags?.length) {
      filtered = filtered.filter(entry =>
        filters.hashtags!.some(tag => entry.hashtags.includes(tag))
      )
    }
  }

  return filtered
}

export const addEntry = (entry: Omit<Entry, 'id'>) => {
  const newEntry = {
    ...entry,
    id: `entry-${entries.length + 1}`
  }
  entries = [newEntry, ...entries]
  return newEntry
}

export const updateEntry = (id: string, updates: Partial<Entry>) => {
  entries = entries.map(entry =>
    entry.id === id ? { ...entry, ...updates } : entry
  )
  return entries.find(entry => entry.id === id)
}

export const deleteEntry = (id: string) => {
  entries = entries.filter(entry => entry.id !== id)
}

export const getMoodTrends = () => mockMoodTrends

export const getMemoryNotifications = () => mockMemoryNotifications 