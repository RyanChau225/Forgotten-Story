"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { PLANS } from "@/lib/subscription-plans"
import { useToast } from "@/hooks/use-toast"

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState<string | null>(null)
  const { toast } = useToast()

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

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to subscribe to a plan.",
        variant: "destructive",
      })
      return
    }

    setLoading(planId)
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planId,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      // Redirect to Polar checkout
      window.location.href = data.checkout_url
    } catch (error) {
      console.error('Error subscribing:', error)
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select the perfect plan for your journaling needs. All plans include basic features
            with additional perks as you go up.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/10"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                <div className="text-4xl font-bold mb-4">
                  ${plan.price}
                  <span className="text-lg text-gray-400">/month</span>
                </div>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className="w-full py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : plan.price === 0 ? (
                    "Current Plan"
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    {plan.features.entriesPerMonth === -1
                      ? "Unlimited entries"
                      : `${plan.features.entriesPerMonth} entries per month`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    {plan.features.imageToTextLimit === -1
                      ? "Unlimited OCR conversions"
                      : `${plan.features.imageToTextLimit} OCR conversions per month`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span>
                    Up to {plan.features.maxImageSize}MB per image
                  </span>
                </div>
                {plan.features.aiSummaries && (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>AI-powered entry summaries</span>
                  </div>
                )}
                {plan.features.customThemes && (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Custom themes</span>
                  </div>
                )}
                {plan.features.exportOptions && (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Export options</span>
                  </div>
                )}
                {plan.features.prioritySupport && (
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Priority support</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 