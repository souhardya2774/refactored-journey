import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

const MONTHLY_QUOTA = 10
const PROVIDER_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function getMonthDateRange(date: Date): { start: Date; end: Date } {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0))
  return { start, end }
}

export async function GET() {
  const db = await connectToDatabase()
  const now = new Date()
  const month = getMonthKey(now)
  const { start: monthStart, end: monthEnd } = getMonthDateRange(now)

  const stateCol = db.collection('provider_monthly_states')
  const leadCol = db.collection('leads')

  const providers = await Promise.all(
    PROVIDER_IDS.map(async (id) => {
      const state = await stateCol.findOne({ providerId: id, month })
      const monthlyAssigned = state?.monthlyAssigned ?? 0
      const remainingQuota = Math.max(0, MONTHLY_QUOTA - monthlyAssigned)

      const realAssignedLeads = await leadCol.countDocuments({ assignedProviders: { $in: [id] }, createdAt: { $gte: monthStart, $lt: monthEnd } })

      const assignedLeads = await leadCol
        .find({ assignedProviders: { $in: [id] } })
        .sort({ createdAt: -1 })
        .toArray()

      const mappedLeads = assignedLeads.map((l: any) => ({
        id: l._id.toString(),
        name: l.name,
        phone: l.phone,
        createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString(),
      }))

      return {
        id,
        name: `Provider ${id}`,
        remainingQuota,
        monthlyAssigned: realAssignedLeads,
        leadsReceived: assignedLeads.length,
        assignedLeads: mappedLeads,
      }
    }),
  )

  return NextResponse.json({ providers })
}
