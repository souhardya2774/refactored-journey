# Mini Lead Distribution System

## **Setup**

- Node: use Node 18+ (recommended). Install dependencies:

```bash
npm install
```

- Create a `.env.local` in the project root with at least the MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/?replicaSet=rs0
MONGODB_DB=mini_lead_distribution_system
```

- IMPORTANT: MongoDB transactions used by the app require a replica-set or a managed cluster (e.g., Atlas). A standalone mongod does not support multi-document transactions.

### Run

- Start the development server:

```bash
npm run dev
```

- Build for production:

```bash
npm run build
npm start
```

### Notes on concurrency & idempotency

- The app relies on MongoDB transactions and atomic update operations for concurrency control and provider assignment. See [lib/provider-distribution.ts](lib/provider-distribution.ts) for details.
- Webhook idempotency is enforced by a unique index on `webhookId` and duplicate-key handling (see `processSubscriptionWebhook` in [lib/provider-distribution.ts](lib/provider-distribution.ts)).


## **Allocation algorithm**

- The allocation runs inside a MongoDB transaction so provider state updates and lead insertion are atomic.
- State rows for each provider/month are upserted before allocation (`ensureMonthlyStateRecords`).
- Mandatory providers are assigned first using atomic `findOneAndUpdate` with `{ monthlyAssigned: { $lt: MONTHLY_QUOTA } }` and `$inc` to prevent over-assigning.
- Optional slots are filled one-by-one using `findOneAndUpdate` sorted by `lastAssignedAt`, then `monthlyAssigned`, then `providerId` to choose the least-recently-used and least-loaded provider.
- Each assigned provider's `monthlyAssigned` is incremented and `lastAssignedAt` updated to maintain fair rotation under concurrent requests.
- See [lib/provider-distribution.ts](lib/provider-distribution.ts) for the implementation details and error handling.

## **Concurrency handling**

- The system relies on MongoDB transactions and atomic update operations. Allocation runs inside `session.withTransaction`, and assignment steps use atomic `findOneAndUpdate` and `bulkWrite` with filters like `{ monthlyAssigned: { $lt: MONTHLY_QUOTA } }` and `$inc` to avoid over-assigning.
- Provider state rows are upserted before allocation (`ensureMonthlyStateRecords`) to ensure consistent state under concurrent requests.
- Optional provider selection is deterministic and fair: selection sorts by `lastAssignedAt`, then `monthlyAssigned`, then `providerId` to choose the least-recently-used, least-loaded provider.

## **Webhook idempotency**

- A unique index on `webhookId` prevents duplicate webhook events. The webhook handler inserts the event inside the same transaction that applies the reset, and duplicate-key errors (Mongo error code `11000`) are caught to indicate the webhook was already processed.
- See `processSubscriptionWebhook` and `ensureIndexes` in [lib/provider-distribution.ts](lib/provider-distribution.ts).