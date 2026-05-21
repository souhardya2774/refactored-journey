import { MongoServerError } from 'mongodb'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { processSubscriptionWebhook } from '@/lib/provider-distribution'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body.webhookId !== 'string' || !body.webhookId.trim()) {
    return NextResponse.json({ error: 'webhookId is required.' }, { status: 400 })
  }

  try {
    const db = await connectToDatabase()
    const result = await processSubscriptionWebhook(db, body.webhookId, body.payload ?? {})
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: 'Duplicate webhook event.', webhookId: body.webhookId }, { status: 409 })
    }

    const message = error instanceof Error ? error.message : 'Unknown server error.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
