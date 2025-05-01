export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          avatar_url: string | null
          theme: string
          email_notifications: boolean
          reminder_frequency: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          avatar_url?: string | null
          theme?: string
          email_notifications?: boolean
          reminder_frequency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          avatar_url?: string | null
          theme?: string
          email_notifications?: boolean
          reminder_frequency?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
      }
      entries: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          mood: number
          date: string
          is_private: boolean
          weather: string | null
          location: string | null
          hashtags: string[]
          image_urls: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          mood: number
          date?: string
          is_private?: boolean
          weather?: string | null
          location?: string | null
          hashtags?: string[]
          image_urls?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          mood?: number
          date?: string
          is_private?: boolean
          weather?: string | null
          location?: string | null
          hashtags?: string[]
          image_urls?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string | null
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string | null
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string | null
          usage_count?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 