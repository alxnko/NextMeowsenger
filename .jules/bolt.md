## 2024-05-18 - Parallelizing Prisma Queries
**Learning:** Independent Prisma database lookups in API routes (e.g., `findMany`, `findUnique`) executed sequentially introduce unnecessary latency. They can be safely and effectively parallelized using `Promise.all` since they don't depend on each other's results.
**Action:** Always look for sequential database queries in API routes that can be executed concurrently using `Promise.all` to minimize request latency and avoid sequential I/O blocking.

## 2024-05-18 - Replacing Sequential N+1 Queries with Relation Filters
**Learning:** Fetching an array of IDs from one query and passing it to a second query using the 'in' operator creates an N+1 lookup pattern that transfers unnecessary data and adds latency.
**Action:** Use Prisma's relational filters (e.g., 'some' on nested relations) to combine these into a single optimized database query, allowing the database engine to perform the join efficiently.
