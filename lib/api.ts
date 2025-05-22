// Types
export type AffirmationObject = {
  text: string;
  based_on: string;
};

export type Entry = {
  id: string
  title: string
  content: string
  mood: number
  date: string
  is_private: boolean
  weather?: string
  location?: string
  hashtags: string[]
  image_urls: string[]
  ai_summary?: string // Added AI summary field
  // Can be an array of objects, a string (for old format/error), or undefined
  positive_affirmation?: AffirmationObject[] | string // Added positive affirmation field
  created_at: string
  updated_at: string
}

// API Functions
export async function getEntries(page = 1, limit = 10) {
  const response = await fetch(
    `/api/entries?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
  if (!response.ok) throw new Error('Failed to fetch entries')
  return response.json()
}

export async function searchEntries(query: string, filters?: {
  startDate?: string
  endDate?: string
  minMood?: number
  maxMood?: number
  hashtags?: string[]
}) {
  const params = new URLSearchParams({
    query,
    ...(filters?.startDate && { startDate: filters.startDate }),
    ...(filters?.endDate && { endDate: filters.endDate }),
    ...(filters?.minMood !== undefined && { minMood: filters.minMood.toString() }),
    ...(filters?.maxMood !== undefined && { maxMood: filters.maxMood.toString() }),
    ...(filters?.hashtags && { hashtags: JSON.stringify(filters.hashtags) })
  })

  const response = await fetch(`/api/entries/search?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error('Failed to search entries')
  return response.json()
}

export async function createEntry(entry: Omit<Entry, 'id' | 'created_at' | 'updated_at'>) {
  const response = await fetch('/api/entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error('Failed to create entry')
  return response.json()
}

export async function updateEntry(entry: Partial<Entry> & { id: string }) {
  const response = await fetch('/api/entries', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(entry),
  })
  if (!response.ok) throw new Error('Failed to update entry')
  return response.json()
}

export async function deleteEntry(id: string) {
  const response = await fetch(`/api/entries?id=${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error('Failed to delete entry')
  return response.json()
} 