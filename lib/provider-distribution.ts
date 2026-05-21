import { MongoServerError } from 'mongodb'
import type { Collection, ClientSession, Db } from 'mongodb'

export type ServiceType = 'service1' | 'service2' | 'service3'

export interface LeadRequestPayload {
  name: string
  phone: string
  city: string
  service: ServiceType
  description: string
}

export interface AssignedLeadResult {
  id: string
  name: string
  phone: string
  city: string
  service: ServiceType
  description: string
  assignedProviders: number[]
  createdAt: string
  month: string
}

const MONTHLY_QUOTA = 10
const PROVIDER_IDS = [1, 2, 3, 4, 5, 6, 7, 8]

const SERVICE_RULES: Record<ServiceType, {
  mandatory: number[]
  pool: number[]
  totalRequired: number
}> = {
  service1: {
    mandatory: [1],
    pool: [2, 3, 4],
    totalRequired: 3,
  },
  service2: {
    mandatory: [5],
    pool: [6, 7, 8],
    totalRequired: 3,
  },
  service3: {
    mandatory: [1, 4],
    pool: [2, 3, 5, 6, 7, 8],
    totalRequired: 3,
  },
}

interface ProviderMonthlyState {
  providerId: number
  month: string
  monthlyAssigned: number
  lastAssignedAt: Date
}

const STATE_COLLECTION = 'provider_monthly_states'
const LEAD_COLLECTION = 'leads'
const WEBHOOK_COLLECTION = 'webhook_events'

interface WebhookEvent {
  webhookId: string
  eventType: 'subscription_confirmed'
  processedAt: Date
  payload?: Record<string, unknown>
}

function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function ensureMonthlyStateRecords(
  collection: Collection<ProviderMonthlyState>,
  month: string,
  session?: ClientSession,
) {
  const bulkOps = PROVIDER_IDS.map((providerId) => ({
    updateOne: {
      filter: { providerId, month },
      update: {
        $setOnInsert: {
          providerId,
          month,
          monthlyAssigned: 0,
          lastAssignedAt: new Date(0),
        },
      },
      upsert: true,
    },
  }))

  await collection.bulkWrite(bulkOps, { session })
}

async function ensureIndexes(db: Db) {
  await db.collection(LEAD_COLLECTION).createIndex(
    { phone: 1, service: 1 },
    { unique: true, name: 'phone_service_unique' },
  )

  await db.collection<ProviderMonthlyState>(STATE_COLLECTION).createIndex(
    { providerId: 1, month: 1 },
    { unique: true, name: 'provider_month_unique' },
  )

  await db.collection<WebhookEvent>(WEBHOOK_COLLECTION).createIndex(
    { webhookId: 1 },
    { unique: true, name: 'webhook_id_unique' },
  )
}

export async function resetProviderMonthlyQuotas(
  db: Db,
  month: string,
  session?: ClientSession,
) {
  const stateCollection = db.collection<ProviderMonthlyState>(STATE_COLLECTION)
  await ensureMonthlyStateRecords(stateCollection, month, session)
  await stateCollection.updateMany(
    { providerId: { $in: PROVIDER_IDS }, month },
    { $set: { monthlyAssigned: 0 } },
    { session },
  )
}

export async function processSubscriptionWebhook(
  db: Db,
  webhookId: string,
  payload?: Record<string, unknown>,
): Promise<{ webhookId: string; resetApplied: boolean }> {
  await ensureIndexes(db)

  const webhookCollection = db.collection<WebhookEvent>(WEBHOOK_COLLECTION)
  const month = getMonthKey(new Date())
  const session = db.client.startSession()

  try {
    let resetApplied = false

    await session.withTransaction(async () => {
      await resetProviderMonthlyQuotas(db, month, session)
      await webhookCollection.insertOne(
        {
          webhookId,
          eventType: 'subscription_confirmed',
          processedAt: new Date(),
          payload,
        },
        { session },
      )
      resetApplied = true
    })

    return { webhookId, resetApplied }
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { webhookId, resetApplied: false }
    }

    throw error
  } finally {
    await session.endSession()
  }
}

async function assignMandatoryProviders(
  collection: Collection<ProviderMonthlyState>,
  month: string,
  mandatory: number[],
  now: Date,
  session?: ClientSession,
): Promise<number[]> {
  const assigned: number[] = []

  for (const providerId of mandatory) {
    const result = await collection.findOneAndUpdate(
      { providerId, month, monthlyAssigned: { $lt: MONTHLY_QUOTA } },
      {
        $inc: { monthlyAssigned: 1 },
        $set: { lastAssignedAt: now },
      },
      { returnDocument: 'after', session },
    )

    if (!result) {
      throw new Error(`Mandatory provider ${providerId} has reached their monthly quota.`)
    }

    assigned.push(providerId)
  }

  return assigned
}

async function assignOptionalProviders(
  collection: Collection<ProviderMonthlyState>,
  month: string,
  pool: number[],
  count: number,
  now: Date,
  session?: ClientSession,
): Promise<number[]> {
  const assigned: number[] = []

  for (let i = 0; i < count; i += 1) {
    const candidate = await collection.findOneAndUpdate(
      {
        providerId: { $in: pool.filter((id) => !assigned.includes(id)) },
        month,
        monthlyAssigned: { $lt: MONTHLY_QUOTA },
      },
      {
        $inc: { monthlyAssigned: 1 },
        $set: { lastAssignedAt: new Date(now.getTime() + i) },
      },
      {
        sort: { lastAssignedAt: 1, monthlyAssigned: 1, providerId: 1 },
        returnDocument: 'after',
        session,
      },
    )

    if (!candidate) {
      throw new Error('Unable to allocate the remaining provider slots fairly. Please try again later.')
    }

    assigned.push(candidate.providerId)
  }

  return assigned
}

export async function assignLead(db: Db, payload: LeadRequestPayload): Promise<AssignedLeadResult> {
  const month = getMonthKey(new Date())
  const stateCollection = db.collection<ProviderMonthlyState>(STATE_COLLECTION)
  const leadCollection = db.collection(LEAD_COLLECTION)

  await ensureIndexes(db)

  const serviceRule = SERVICE_RULES[payload.service]
  if (!serviceRule) {
    throw new Error('Unsupported service selected.')
  }

  const now = new Date()
  let assignedProviders: number[] = []
  let insertedId: string | undefined

  const session = db.client.startSession()
  try {
    await session.withTransaction(async () => {
      await ensureMonthlyStateRecords(stateCollection, month, session)

      const mandatoryAssigned = await assignMandatoryProviders(
        stateCollection,
        month,
        serviceRule.mandatory,
        now,
        session,
      )

      assignedProviders.push(...mandatoryAssigned)

      const optionalNeeded = serviceRule.totalRequired - assignedProviders.length
      if (optionalNeeded > 0) {
        const optionalAssigned = await assignOptionalProviders(
          stateCollection,
          month,
          serviceRule.pool,
          optionalNeeded,
          now,
          session,
        )
        assignedProviders.push(...optionalAssigned)
      }

      const inserted = await leadCollection.insertOne(
        {
          name: payload.name,
          phone: payload.phone,
          city: payload.city,
          service: payload.service,
          description: payload.description,
          assignedProviders,
          createdAt: now,
          month,
        },
        { session },
      )

      insertedId = inserted.insertedId.toString()
    })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error('A lead with this phone number and service already exists.')
    }

    throw error
  } finally {
    await session.endSession()
  }

  if (!insertedId) {
    throw new Error('Failed to save the lead.')
  }

  return {
    id: insertedId,
    name: payload.name,
    phone: payload.phone,
    city: payload.city,
    service: payload.service,
    description: payload.description,
    assignedProviders,
    createdAt: now.toISOString(),
    month,
  }
}
