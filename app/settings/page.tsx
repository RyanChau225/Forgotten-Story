"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<{
    frequency: "daily" | "weekly" | "monthly" | null
    is_active: boolean
  }>({
    frequency: null,
    is_active: false
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from("email_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (error) throw error

        if (data) {
          setSubscription({
            frequency: data.frequency,
            is_active: data.is_active
          })
        }
      } catch (error) {
        console.error("Error fetching subscription:", error)
        toast({
          title: "Error",
          description: "Failed to load subscription settings",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [supabase, toast])

  const handleFrequencyChange = async (value: "daily" | "weekly" | "monthly") => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("email_subscriptions")
        .upsert({
          user_id: user.id,
          frequency: value,
          is_active: true
        })

      if (error) throw error

      setSubscription(prev => ({ ...prev, frequency: value, is_active: true }))
      toast({
        title: "Success",
        description: "Email frequency updated successfully"
      })
    } catch (error) {
      console.error("Error updating frequency:", error)
      toast({
        title: "Error",
        description: "Failed to update email frequency",
        variant: "destructive"
      })
    }
  }

  const handleToggleSubscription = async (checked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("email_subscriptions")
        .upsert({
          user_id: user.id,
          frequency: subscription.frequency || "weekly",
          is_active: checked
        })

      if (error) throw error

      setSubscription(prev => ({ ...prev, is_active: checked }))
      toast({
        title: "Success",
        description: `Email subscription ${checked ? "enabled" : "disabled"}`
      })
    } catch (error) {
      console.error("Error toggling subscription:", error)
      toast({
        title: "Error",
        description: "Failed to update subscription status",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-10 bg-white/10 rounded w-full"></div>
            <div className="h-10 bg-white/10 rounded w-full"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Email Settings</h1>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Email Subscription</h2>
            <p className="text-sm text-gray-400">
              Receive random journal entries via email
            </p>
          </div>
          <Switch
            checked={subscription.is_active}
            onCheckedChange={handleToggleSubscription}
          />
        </div>

        {subscription.is_active && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select
              value={subscription.frequency || "weekly"}
              onValueChange={handleFrequencyChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
} 