import { NextResponse } from 'next/server'
import { PolarClient } from '@polar-sh/sdk'

const polar = new PolarClient({
  apiKey: process.env.POLAR_API_KEY!,
})

export async function POST(request: Request) {
  try {
    const { userId, planId } = await request.json()

    // Create or update subscription
    const subscription = await polar.subscriptions.create({
      user_id: userId,
      plan_id: planId,
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?subscription=canceled`,
    })

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get user's active subscription
    const subscriptions = await polar.subscriptions.list({
      user_id: userId,
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