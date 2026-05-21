import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { assignLead, type LeadRequestPayload } from '@/lib/provider-distribution'

export async function POST(request: Request) {
  let payload: LeadRequestPayload

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!payload?.name || !payload?.phone || !payload?.city || !payload?.service || !payload?.description) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  try {
    const db = await connectToDatabase()
    const assignedLead = await assignLead(db, payload)
    return NextResponse.json(assignedLead)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.'
    const status = message.includes('already exists') ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
