## 2024-05-18 - Parallelizing Prisma Queries
**Learning:** Independent Prisma database lookups in API routes (e.g., `findMany`, `findUnique`) executed sequentially introduce unnecessary latency. They can be safely and effectively parallelized using `Promise.all` since they don't depend on each other's results.
**Action:** Always look for sequential database queries in API routes that can be executed concurrently using `Promise.all` to minimize request latency and avoid sequential I/O blocking.

## 2024-05-18 - Replacing Sequential N+1 Queries with Relation Filters
**Learning:** Fetching an array of IDs from one query and passing it to a second query using the 'in' operator creates an N+1 lookup pattern that transfers unnecessary data and adds latency.
**Action:** Use Prisma's relational filters (e.g., 'some' on nested relations) to combine these into a single optimized database query, allowing the database engine to perform the join efficiently.

## 2025-03-24 - Batching Socket.IO Emissions
**Learning:** For Socket.IO (v4+), broadcasting to an array of rooms using `io.to(rooms: string[]).emit()` is significantly more efficient than looping over individual rooms and calling `io.to(room).emit()`. This pattern leverages Socket.io's internal handling for multi-room broadcasting, reducing the number of broadcast packets sent to the adapter.
**Action:** Replace `forEach` loops that emit the same event to multiple individual rooms with a single `io.to(roomArray).emit()` call to improve socket performance and reduce CPU overhead.

## 2024-04-20 - [Base64 Conversion Overhead for Small Payloads]
**Learning:** Using asynchronous `FileReader` and `Blob` APIs for converting `ArrayBuffer` to Base64 introduces a massive performance overhead (up to ~100x slower) for small buffers like 256-byte AES keys compared to synchronous conversion using `window.btoa(String.fromCharCode.apply(null, bytes))`. While the async approach is necessary for very large files to avoid blocking the main thread and exceeding `Function.prototype.apply` argument limits (typically 65536), applying it uniformly to all buffer sizes severely impacts the performance of operations that encode multiple small keys, such as key wrapping for group chats.
**Action:** Always use a hybrid approach for `ArrayBuffer` to Base64 conversion: use `String.fromCharCode.apply` (or similar synchronous methods) for buffers under a safe threshold (e.g., < 32768 bytes), and fall back to the async `FileReader` approach only for larger payloads.
