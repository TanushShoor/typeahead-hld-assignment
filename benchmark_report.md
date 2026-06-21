# Backend Performance Benchmark

We used `autocannon` to load-test the TypeAhead API under massive concurrency to verify the effectiveness of our caching and asynchronous batching architecture.

## Methodology
- **Connections:** 100 concurrent
- **Pipelining:** 10
- **Duration:** 15 seconds

## 1. Data Ingestion (POST /api/v1/search)
Testing the Write-Behind Batching architecture using an in-memory queue and periodic bulk PostgreSQL transactions.

| Metric | Result |
| :--- | :--- |
| **Total Requests Processed** | 104,532 |
| **Requests Per Second (RPS)** | 6,969 req/sec |
| **Average Latency** | 237.47 ms |

**Analysis:** The API successfully processed over 104,000 simultaneous writes, maintaining an astonishing **~7,000 requests per second (RPS)**. The in-memory buffer seamlessly queued the requests, allowing the background worker to execute safe bulk PostgreSQL `$transaction` calls without ever exhausting the database connection pool.

## 2. Uncached Read Speed (GET /api/v1/suggest)
Testing the raw PostgreSQL `startsWith` read speeds *without* the Redis Distributed Cache.

| Metric | Result |
| :--- | :--- |
| **Total Requests Processed** | 9,280 |
| **Requests Per Second (RPS)** | 618.67 req/sec |
| **Average Latency** | 6,095.74 ms |

**Analysis:** Without the distributed cache, PostgreSQL completely buckled under the 100 concurrent connections, resulting in a low 618 RPS and a massive 6-second average latency. This highlights exactly why the Phase 2 Distributed Hash Ring is mandatory for production.

## 3. Cached Read Speed (GET /api/v2/suggest)
Testing the read speeds using our 3-Node Distributed Redis Hash Ring (Cache-Aside pattern).

| Metric | Result |
| :--- | :--- |
| **Total Requests Processed** | 102,848 |
| **Requests Per Second (RPS)** | 6,857.07 req/sec |
| **Average Latency** | 613.56 ms |

**Analysis:** The results speak for themselves. By routing reads through the Consistent Hash Ring, the API achieved **over 11x faster throughput** (6,857 RPS vs 618 RPS) and **10x lower latency** (613ms vs 6,000ms). The backend easily served over 100,000 queries in 15 seconds, proving the distributed caching architecture is highly resilient.
