import { Router } from "express";
import { getSuggestions } from "../../services/suggestion.service.js";
import redisClient from "../../config/redis.js";

const router = Router();

router.get("/", async (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.json([]);

    try {
        const cachedData = await redisClient.get(q.toLowerCase());
        if (cachedData) {
            return res.status(200).json({ message: "cache hit (v2)", data: JSON.parse(cachedData) });
        }

        const suggestion = await getSuggestions(q);
        
        await redisClient.setEx(q.toLowerCase(), 60, JSON.stringify(suggestion));

        return res.status(200).json({ message: "search suggestions (v2)", data: suggestion });
    } catch (error) {
        return res.status(500).json({ error: "failed to fetch suggestion" });
    }
});

export default router;
