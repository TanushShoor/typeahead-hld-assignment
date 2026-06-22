import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/server.js";

// NOTE: These API tests require the Postgres + Redis stack to be running
// (e.g. via `docker compose up`). They exercise the real v1/v2 routes.
describe("Typeahead API", () => {

  it("GET /api/v1/suggest - returns prefix suggestions from the DB", async () => {
    const response = await request(app).get("/api/v1/suggest?q=app");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("search suggestions (v1)");
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it("GET /api/v1/suggest - returns [] for missing query", async () => {
    const response = await request(app).get("/api/v1/suggest");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("POST /api/v1/search - records the query and returns 'Searched'", async () => {
    const response = await request(app)
      .post("/api/v1/search")
      .send({ query: "apple" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Searched");
    expect(response.body.data.queued).toBe(true);
  });

  it("POST /api/v1/search - 400 when query is missing", async () => {
    const response = await request(app).post("/api/v1/search").send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("GET /api/v2/cache/debug - reports the owning node and hit/miss status", async () => {
    const response = await request(app).get("/api/v2/cache/debug?prefix=apple");

    expect(response.status).toBe(200);
    expect(response.body.target_node).toBeDefined();
    expect(["HIT", "MISS"]).toContain(response.body.cache_status);
  });

});
