import { Router } from "express";
import distributedRedisClient from "../../config/redis.js";

const router = Router();

router.get("/debug", async (req, res) => {
    const prefix = req.query.prefix as string;

    if (!prefix) {
        return res.status(400).json({ error: "?prefix= query parameter is required" });
    }

    const key = prefix.toLowerCase();

    // 1. Ask the ConsistentHash ring which Redis node owns this prefix.
    const targetNode = distributedRedisClient.getNodeUrlFor(key);

    // 2. Look the prefix up on that node to report whether it's a cache HIT or MISS.
    const cached = await distributedRedisClient.get(key);
    const cacheStatus = cached ? "HIT" : "MISS";

    return res.json({
        prefix: prefix,
        target_node: targetNode,
        cache_status: cacheStatus,
        cached_results: cached ? JSON.parse(cached).length : 0,
        message: `Prefix '${prefix}' is owned by ${targetNode} — cache ${cacheStatus}`
    });
});

export default router;
