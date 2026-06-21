import prisma from "../config/db.js";

export const getSuggestions = async (q: string) => {
    return await prisma.searchQuery.findMany({
        where: { query: { startsWith: q.toLowerCase() } },
        orderBy: { count: 'desc' },
        take: 10 
    });
};
