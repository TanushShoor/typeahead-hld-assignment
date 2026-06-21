# Backend Performance Benchmark

We load-tested the Typeahead Search API with [`autocannon`](https://github.com/mcollina/autocannon) under heavy concurrency to measure the impact of the distributed Redis cache and the write-behind batching layer.

## Methodology

| Parameter    | Value          |
| ------------ | -------------- |
| Connections  | 100 concurrent |
| Pipelining   | 10             |
| Duration     | 15 seconds     |

Three scenarios were tested: write ingestion, uncached reads (PostgreSQL only), and cached reads (through the 3-node Redis hash ring).

---

## 1. Ingestion — `POST /api/v1/search`

Exercises the write-behind path: requests land in an in-memory queue and return immediately, while a background worker periodically flushes them to PostgreSQL in bulk transactions.

| Metric           | Result        |
| ---------------- | ------------- |
| Total requests   | 104,532       |
| Throughput       | **6,969 req/sec** |
| Average latency  | 237.47 ms     |

The API sustained over 104,000 writes in 15 seconds at roughly **7,000 RPS**. The in-memory buffer absorbed the incoming load so the background worker could commit bulk `$transaction` writes without ever exhausting the database connection pool.

---

## 2. Uncached reads — `GET /api/v1/suggest`

Measures raw PostgreSQL `startsWith` prefix lookups with **no caching layer** in front.

| Metric           | Result        |
| ---------------- | ------------- |
| Total requests   | 9,280         |
| Throughput       | **619 req/sec** |
| Average latency  | 6,095.74 ms   |

Under 100 concurrent connections PostgreSQL became the bottleneck, throughput collapsed to ~619 RPS, and average latency climbed past 6 seconds. This is exactly the pressure the distributed cache is designed to relieve.

---

## 3. Cached reads — `GET /api/v2/suggest`

The same read path, served through the 3-node distributed Redis hash ring using a cache-aside strategy.

| Metric           | Result        |
| ---------------- | ------------- |
| Total requests   | 102,848       |
| Throughput       | **6,857 req/sec** |
| Average latency  | 613.56 ms     |

---

## Summary

| Scenario       | Throughput | Avg latency |
| -------------- | ---------- | ----------- |
| Ingestion      | 6,969 RPS  | 237 ms      |
| Uncached read  | 619 RPS    | 6,096 ms    |
| Cached read    | 6,857 RPS  | 614 ms      |

Routing reads through the consistent hash ring delivered roughly **11× higher throughput** (6,857 vs. 619 RPS) and **10× lower latency** (614 ms vs. 6,096 ms) than querying PostgreSQL directly — serving over 100,000 queries in 15 seconds. The results make a clear case for the distributed caching layer in any production deployment.
