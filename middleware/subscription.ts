import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PLANS } from '@/lib/subscription-plans'
import { prisma } from '@/lib/prisma'

export async function checkSubscription(request: NextRequest) {
  try {
    // Get the user from the session
    const token = await getToken({ req: request })
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's subscription and usage
    const [subscription, usage] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId: token.sub,
          status: 'active'
        }
      }),
      prisma.userUsage.findFirst({
        where: {
          userId: token.sub,
          month: new Date().toISOString().slice(0, 7) // Current month (YYYY-MM)
        }
      })
    ])

    // Get plan details
    const plan = subscription 
      ? PLANS[subscription.planId as keyof typeof PLANS]
      : PLANS.FREE

    // Check rate limits based on the feature being accessed
    const path = request.nextUrl.pathname
    
    if (path.startsWith('/api/image-to-text')) {
      if (usage && plan.features.imageToTextLimit !== -1 && 
          usage.imageToTextCount >= plan.features.imageToTextLimit) {
        return NextResponse.json(
          { error: 'Image to text limit reached for your plan' },
          { status: 429 }
        )
      }
    }

    if (path.startsWith('/api/entries')) {
      if (usage && plan.features.entriesPerMonth !== -1 && 
          usage.entriesCount >= plan.features.entriesPerMonth) {
        return NextResponse.json(
          { error: 'Monthly entries limit reached for your plan' },
          { status: 429 }
        )
      }
    }

    // Attach plan info to the request
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-subscription-plan', plan.name)

    // Continue with the request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.next()
  }
} 