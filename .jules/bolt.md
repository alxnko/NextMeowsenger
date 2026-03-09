## 2024-05-18 - Parallelizing Prisma Queries
**Learning:** Independent Prisma database lookups in API routes (e.g., `findMany`, `findUnique`) executed sequentially introduce unnecessary latency. They can be safely and effectively parallelized using `Promise.all` since they don't depend on each other's results.
**Action:** Always look for sequential database queries in API routes that can be executed concurrently using `Promise.all` to minimize request latency and avoid sequential I/O blocking.
