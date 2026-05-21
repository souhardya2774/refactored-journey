import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB ?? 'mini_lead_distribution_system'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function createClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('Missing required environment variable: MONGODB_URI')
  }

  const client = new MongoClient(uri)
  return client.connect()
}

let clientPromise: Promise<MongoClient> | undefined = globalThis._mongoClientPromise

export async function connectToDatabase(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = createClient()
    if (process.env.NODE_ENV !== 'production') {
      globalThis._mongoClientPromise = clientPromise
    }
  }

  const client = await clientPromise
  return client.db(dbName)
}
