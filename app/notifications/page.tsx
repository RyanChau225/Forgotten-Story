"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import CenteredLayout from "@/components/CenteredLayout"

export default function NotificationsPage() {
  const [subscription, setSubscription] = useState<{
    id: string | null
    frequency: "1" | "3" | "7" | "30" | null
    is_active: boolean
    last_sent: string | null
  }>({
    id: null,
    frequency: null,
    is_active: false,
    last_sent: null
  })
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)
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

        if (error && error.code !== "PGRST116") throw error

        if (data) {
          setSubscription({
            id: data.id,
            frequency: data.frequency,
            is_active: data.is_active,
            last_sent: data.last_sent
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

  const handleFrequencyChange = async (value: "1" | "3" | "7" | "30") => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase.from("email_subscriptions")

      if (subscription.id) {
        // Update existing subscription
        const { error } = await query
          .update({ frequency: value })
          .eq("id", subscription.id)
        if (error) throw error
      } else {
        // Create new subscription
        const { error } = await query
          .insert({
            user_id: user.id,
            frequency: value,
            is_active: true
          })
        if (error) throw error
      }

      setSubscription(prev => ({ ...prev, frequency: value }))
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

      let query = supabase.from("email_subscriptions")

      if (subscription.id) {
        // Update existing subscription
        const { error } = await query
          .update({ is_active: checked })
          .eq("id", subscription.id)
        if (error) throw error
      } else {
        // Create new subscription
        const { error } = await query
          .insert({
            user_id: user.id,
            frequency: "7",
            is_active: checked
          })
        if (error) throw error
      }

      setSubscription(prev => ({ ...prev, is_active: checked }))
      toast({
        title: "Success",
        description: `Email notifications ${checked ? "enabled" : "disabled"}`
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

  const handleTestEmail = async () => {
    try {
      setSendingTest(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) throw new Error("Failed to send test email")

      toast({
        title: "Success",
        description: "Test email sent successfully"
      })
    } catch (error) {
      console.error("Error sending test email:", error)
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      })
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <CenteredLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-10 bg-white/10 rounded"></div>
            <div className="h-10 bg-white/10 rounded"></div>
          </div>
        </div>
      </CenteredLayout>
    )
  }

  return (
    <CenteredLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Email Notifications</h1>
          <p className="text-gray-400">
            Receive random journal entries from your past via email
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Email Subscription</h2>
              <p className="text-sm text-gray-400">
                Get reminders of your past entries
              </p>
            </div>
            <Switch
              checked={subscription.is_active}
              onCheckedChange={handleToggleSubscription}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Frequency</label>
              <Select
                value={subscription.frequency || "7"}
                onValueChange={handleFrequencyChange}
              >
                <SelectTrigger className="w-full bg-black/20 border-white/10">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every day</SelectItem>
                  <SelectItem value="3">Every 3 days</SelectItem>
                  <SelectItem value="7">Every week</SelectItem>
                  <SelectItem value="30">Every month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-white/10">
              <Button
                onClick={handleTestEmail}
                disabled={sendingTest || !subscription.is_active}
                className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Test Email"
                )}
              </Button>
              {subscription.last_sent && (
                <p className="text-sm text-gray-400 mt-2">
                  Last sent: {new Date(subscription.last_sent).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 p-4 text-sm text-gray-400">
          <p>
            We'll send you a random journal entry from your past based on your chosen frequency.
            This helps you rediscover memories and reflect on your journey.
          </p>
        </div>
      </div>
    </CenteredLayout>
  )
}

