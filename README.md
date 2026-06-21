# Typeahead Search

A production-grade, horizontally scalable **typeahead / autocomplete** service. Built with Node.js, React, PostgreSQL, and a distributed three-node Redis cluster, it serves real-time search suggestions and trending queries at thousands of requests per second.

> Benchmarked at **~6,900 RPS** on cached reads with **~11× higher throughput** and **~10× lower latency** than hitting PostgreSQL directly. See [`benchmark_report.md`](./benchmark_report.md).

---

## Architecture

### 1. Distributed cache via consistent hashing

Rather than depending on a single Redis instance, suggestions are spread across a 3-node cluster (`redis-1`, `redis-2`, `redis-3`) using a **consistent hashing ring**.

- An MD5-based hash ring maps each search prefix to a node, so the cluster can grow or shrink while keeping the vast majority of keys in place.
- **100 virtual nodes per server** keep the key distribution even and prevent any single node from becoming a hot spot.
- A thin client wrapper routes every `get` / `setEx` / `zAdd` call to the owning node, locating it with a binary search over the ring in **O(log n)** time.

You can inspect the routing decision for any prefix:

```bash
curl "http://localhost:8000/api/v2/cache/debug?prefix=apple"
```

### 2. Write-behind batching for ingestion

To absorb thousands of writes per second without overwhelming PostgreSQL, ingestion is decoupled from disk I/O.

- Incoming searches are appended to an **in-memory queue** and acknowledged immediately.
- A **background worker** drains the queue every 5 seconds — or sooner, once it exceeds 1,000 entries — aggregating duplicates along the way.
- Each flush collapses thousands of individual writes into a **single bulk `prisma.$transaction`**.

**Trade-off:** the in-memory queue favors throughput over durability. A crash can lose up to ~5 seconds of search logs. For analytics-style data such as trending searches — where exact counts are non-critical — this is a deliberate and reasonable trade.

### 3. Blended trending algorithm

Trending queries are ranked with a Hacker News / Reddit-style score that blends popularity with recency:

```
score = log10(historical_count) + (current_timestamp_seconds / 45000)
```

Pure popularity would freeze the rankings and never let new terms surface; pure recency would let obscure one-off queries dominate. The logarithmic popularity term plus a steadily rising recency term lets fresh queries climb while still respecting overall demand.

### 4. A defensible 100k-word dataset

The database is seeded from **Peter Norvig's n-grams corpus** — the top 100,000 English words ranked by real Google Web frequency. Because the most common words occur billions of times, the Prisma schema stores counts as `BigInt`.

---

## Tech stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | React 19, Vite                                          |
| Backend  | Node.js, Express 5, TypeScript                          |
| Database | PostgreSQL 15, Prisma 7                                  |
| Cache    | Redis (3-node cluster) with a custom consistent-hash ring |
| Infra    | Docker Compose                                          |

---

## API

| Method | Endpoint                          | Description                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| `GET`  | `/api/v1/suggest?q=<prefix>`      | Suggestions read straight from PostgreSQL (uncached) |
| `POST` | `/api/v1/search`                  | Log a search query (queued for write-behind batching) |
| `GET`  | `/api/v2/suggest?q=<prefix>`      | Suggestions served through the Redis cache (cache-aside) |
| `GET`  | `/api/v2/trending`                | Top trending queries by blended score              |
| `GET`  | `/api/v2/cache/debug?prefix=<p>`  | Which Redis node owns a given prefix               |

---

## Running locally

**Prerequisites:** Docker and Docker Compose.

1. Build and start the full stack (PostgreSQL, the 3-node Redis cluster, backend, and frontend):

   ```bash
   docker compose up --build -d
   ```

   On first run, a one-off `setup` service generates the Prisma client and seeds the 100k-word dataset before the API starts. Each service writes its own `.env` at startup from the Compose environment, so there's nothing to configure by hand.

2. Open the app:

   - **Frontend:** http://localhost:5173
   - **API:** http://localhost:8000

3. Verify cache distribution:

   ```bash
   curl "http://localhost:8000/api/v2/cache/debug?prefix=apple"
   ```

### Common commands

```bash
docker compose logs -f backend      # follow backend logs
docker compose down                 # stop and remove containers (keeps the DB volume)
docker compose down -v              # also wipe the database (forces a re-seed next time)
docker compose up --build -d backend  # rebuild just the backend after code changes
```

---

## Performance

A summary of the load tests (full methodology and analysis in [`benchmark_report.md`](./benchmark_report.md)):

| Scenario                          | RPS    | Avg latency |
| --------------------------------- | ------ | ----------- |
| Ingestion (`POST /api/v1/search`) | ~6,969 | 237 ms      |
| Uncached read (`GET /api/v1/suggest`) | ~619   | 6,096 ms    |
| Cached read (`GET /api/v2/suggest`)   | ~6,857 | 614 ms      |
