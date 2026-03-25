import issueModel from "@/models/issue";
import userModel from "@/models/user";

export interface LeaderboardEntry {
    userId: string;
    name: string;
    email: string;
    totalIssues: number;
    resolvedIssues: number;
    openIssues: number;
    inProgressIssues: number;
    totalUpvotes: number;
    score: number;
    rank?: number;
    badges: string[];
    avatar: string;
}

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    // Get all issues grouped by user
    const issueStats = await issueModel.aggregate([
        {
            $group: {
                _id: "$userId",
                totalIssues: { $sum: 1 },
                resolvedIssues: {
                    $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] }
                },
                openIssues: {
                    $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] }
                },
                inProgressIssues: {
                    $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] }
                },
                totalUpvotes: { $sum: "$upvotes" }
            }
        }
    ]);

    // Get all users
    const users = await userModel.find({});
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    // Combine data and calculate scores
    const leaderboardData: LeaderboardEntry[] = issueStats.map(stat => {
        const user = userMap.get(stat._id);
        
        // Calculate score: resolved issues worth 10 points, upvotes worth 2 points, reported issues worth 1 point
        const score = (stat.resolvedIssues * 10) + (stat.totalUpvotes * 2) + stat.totalIssues;

        // Determine badges
        const badges: string[] = [];
        if (stat.resolvedIssues >= 50) badges.push("Legend");
        else if (stat.resolvedIssues >= 25) badges.push("Hero");
        else if (stat.resolvedIssues >= 10) badges.push("Champion");
        else if (stat.resolvedIssues >= 5) badges.push("Rising Star");
        
        if (stat.totalIssues >= 100) badges.push("Reporter Pro");
        else if (stat.totalIssues >= 50) badges.push("Active Reporter");
        
        if (stat.totalUpvotes >= 100) badges.push("Community Favorite");
        else if (stat.totalUpvotes >= 50) badges.push("Popular");

        return {
            userId: stat._id,
            name: user?.name || "Unknown User",
            email: user?.email || "",
            totalIssues: stat.totalIssues,
            resolvedIssues: stat.resolvedIssues,
            openIssues: stat.openIssues,
            inProgressIssues: stat.inProgressIssues,
            totalUpvotes: stat.totalUpvotes,
            score,
            badges,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'user')}&mouth[]=smile&eyes[0]=happy`
        };
    });

    // Sort by score (descending) and assign ranks
    leaderboardData.sort((a, b) => b.score - a.score);
    leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    return leaderboardData;
};
