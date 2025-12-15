import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper function to get user's profile
export async function getProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user')

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error
    return profile
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}

// Helper function to update profile
export async function updateProfile({
  name,
  theme,
  emailNotifications,
  reminderFrequency,
  timezone,
}: {
  name?: string
  theme?: string
  emailNotifications?: boolean
  reminderFrequency?: string
  timezone?: string
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No user')

    const updates: Database['public']['Tables']['profiles']['Insert'] = {
      id: user.id,
      ...(name && { name }),
      ...(theme && { theme }),
      ...(emailNotifications !== undefined && { email_notifications: emailNotifications }),
      ...(reminderFrequency && { reminder_frequency: reminderFrequency }),
      ...(timezone && { timezone }),
      updated_at: new Date().toISOString(),
    }

const { error } = await supabase
  .from('profiles')
  .upsert(updates as any)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error:', error)
    return false
  }
}