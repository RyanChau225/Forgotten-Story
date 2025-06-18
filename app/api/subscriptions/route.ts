import { NextResponse } from 'next/server'
import { PolarClient } from '@polar-sh/sdk'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Zod schema for POST request body
const CreateSubscriptionSchema = z.object({
  planId: z.string().min(1, "planId is required"), // Add more specific validation if planId has a known format
})

const polar = new PolarClient({
  apiKey: process.env.POLAR_API_KEY!,
})

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const validationResult = CreateSubscriptionSchema.safeParse(payload)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() }, 
        { status: 400 }
      )
    }
    
    const { planId } = validationResult.data

    // Create or update subscription using authenticated user's ID
    const subscription = await polar.subscriptions.create({
      user_id: authUser.id,
      plan_id: planId,
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
    })

    return NextResponse.json(subscription)
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json( { error: 'Invalid input', details: error.flatten() }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get authenticated user's active subscription
    const subscriptions = await polar.subscriptions.list({
      user_id: authUser.id,
      status: 'active',
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
} 