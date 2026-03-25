import { Request } from "@/types/helpers";
import { getLeaderboard } from "@/services/leaderboard";

export const fetchLeaderboard = async (_req: Request) => {
    const leaderboardData = await getLeaderboard();
    
    return {
        leaderboard: leaderboardData,
        totalUsers: leaderboardData.length
    };
};
