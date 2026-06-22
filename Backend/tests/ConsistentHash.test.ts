import { describe, it, expect } from "vitest";
import { ConsistentHash } from "../src/utils/ConsistentHash.js";

// Pure unit tests — no database or Redis required.
describe("ConsistentHash ring", () => {
  const nodes = ["redis://node-1", "redis://node-2", "redis://node-3"];

  it("maps every key to one of the configured nodes", () => {
    const ring = new ConsistentHash(nodes);
    for (const key of ["apple", "banana", "cherry", "xyz", "a"]) {
      expect(nodes).toContain(ring.getNode(key));
    }
  });

  it("is deterministic — the same key always lands on the same node", () => {
    const ring = new ConsistentHash(nodes);
    const first = ring.getNode("apple");
    for (let i = 0; i < 50; i++) {
      expect(ring.getNode("apple")).toBe(first);
    }
  });

  it("returns null when the ring is empty", () => {
    const ring = new ConsistentHash([]);
    expect(ring.getNode("apple")).toBeNull();
  });

  it("distributes keys reasonably evenly across nodes", () => {
    const ring = new ConsistentHash(nodes);
    const counts: Record<string, number> = {};

    const TOTAL = 9000;
    for (let i = 0; i < TOTAL; i++) {
      const node = ring.getNode(`key-${i}`)!;
      counts[node] = (counts[node] || 0) + 1;
    }

    // With 100 virtual replicas per node, each node should get a meaningful
    // share — no node should be starved or hog the whole ring.
    for (const node of nodes) {
      const share = (counts[node] || 0) / TOTAL;
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.55);
    }
  });

  it("keeps most keys on the same node when a node is added (minimal remapping)", () => {
    const before = new ConsistentHash(nodes);
    const after = new ConsistentHash([...nodes, "redis://node-4"]);

    let stable = 0;
    const TOTAL = 3000;
    for (let i = 0; i < TOTAL; i++) {
      const key = `key-${i}`;
      if (before.getNode(key) === after.getNode(key)) stable++;
    }

    // Adding a 4th node should remap only a fraction of keys, not all of them.
    expect(stable / TOTAL).toBeGreaterThan(0.5);
  });
});
