import { ChatGroq } from "@langchain/groq";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { createAgent } from "langchain";
import { z } from "zod";
import { getIssues } from "./issue";
import { getLeaderboard } from "./leaderboard";
import issueModel from "@/models/issue";
import conversationModel from "@/models/conversation";
import { GROQ_API_KEY } from "@/config/env";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

// Initialize the LLM
const llm = new ChatGroq({
    model: "moonshotai/kimi-k2-instruct",
    temperature: 0.1, // Lower temperature for more consistent tool calling
    apiKey: GROQ_API_KEY,
});

// Tool 1: Get user's own issues (auto-uses current userId)
const getUserIssuesToolSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional().describe("Filter by issue status"),
});

const createGetUserIssuesTool = (userId: string) => new DynamicStructuredTool({
    name: "get_user_issues",
    description: "Retrieve all issues reported by the current user. Useful when user asks about 'my issues', 'my complaints', or 'my reports'. Can filter by status (open, in_progress, resolved, closed).",
    schema: getUserIssuesToolSchema,
    func: async ({ status }) => {
        try {
            const result = await getIssues({
                userId,
                status,
                limit: 30,
            });
            if (result.data.length === 0) {
                return "You haven't reported any issues yet.";
            }

            const summary = {
                total: result.total,
                issues: result.data.map(issue => ({
                    id: issue._id,
                    title: issue.title,
                    category: issue.category,
                    status: issue.status,
                    upvotes: issue.upvotes || 0,
                    createdAt: new Date(issue.createdAt).toLocaleDateString(),
                    location: issue.location.address,
                }))
            };

            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error fetching your issues: ${error.message}`;
        }
    },
});

// Tool 2: Get all issues with filters
const getAllIssuesToolSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional().describe("Filter by issue status"),
    category: z.string().optional().describe("Filter by issue category"),
    page: z.number().optional().default(1).describe("Page number for pagination"),
    limit: z.number().optional().default(20).describe("Number of issues per page"),
    sortBy: z.enum(['createdAt', 'upvotes']).optional().default('createdAt').describe("Field to sort by"),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe("Sort order"),
});

const getAllIssuesTool = new DynamicStructuredTool({
    name: "get_all_issues",
    description: "Retrieve issues with filters, pagination, and sorting (createdAt, upvotes). Useful for dashboard-like views.",
    schema: getAllIssuesToolSchema,
    func: async ({ status, category, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' }) => {
        try {
            const result = await getIssues({
                status,
                category,
                page,
                limit,
                sortBy,
                sortOrder,
            });

            if (result.data.length === 0) {
                return "No issues found matching the criteria.";
            }

            const summary = {
                total: result.total,
                totalPages: result.totalPages,
                issues: result.data.map(issue => ({
                    id: issue._id,
                    title: issue.title,
                    category: issue.category,
                    status: issue.status,
                    upvotes: issue.upvotes || 0,
                    reportedBy: issue.reportedByName,
                    createdAt: new Date(issue.createdAt).toLocaleDateString(),
                    location: issue.location.address,
                }))
            };

            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error fetching all issues: ${error.message}`;
        }
    },
});

// Tool 3: Search issues near a location
const getNearbyIssuesToolSchema = z.object({
    latitude: z.number().describe("Latitude coordinate of the location"),
    longitude: z.number().describe("Longitude coordinate of the location"),
    radiusKm: z.number().optional().default(5).describe("Search radius in kilometers (default: 5km)"),
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional().describe("Filter by issue status"),
    limit: z.number().optional().default(20).describe("Number of issues to return"),
});

const getNearbyIssuesTool = new DynamicStructuredTool({
    name: "search_nearby_issues",
    description: "Search for issues near a specific location. Useful when user asks about 'issues near me', 'nearby problems', or 'local issues'. Requires latitude and longitude coordinates.",
    schema: getNearbyIssuesToolSchema,
    func: async ({ latitude, longitude, radiusKm = 5, status, limit = 20 }) => {
        try {
            const result = await getIssues({
                latitude,
                longitude,
                radiusKm,
                status,
                limit,
            });

            if (result.data.length === 0) {
                return `No issues found within ${radiusKm}km of the specified location.`;
            }

            const summary = {
                searchRadius: `${radiusKm}km`,
                total: result.total,
                issues: result.data.map(issue => ({
                    id: issue._id,
                    title: issue.title,
                    category: issue.category,
                    status: issue.status,
                    distance: issue.distance ? `${issue.distance.toFixed(2)}km` : 'N/A',
                    upvotes: issue.upvotes || 0,
                    reportedBy: issue.reportedByName,
                    location: issue.location.address,
                    createdAt: new Date(issue.createdAt).toLocaleDateString(),
                }))
            };

            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error searching nearby issues: ${error.message}`;
        }
    },
});

// Tool 4: Get popular issues (most upvoted)
const getPopularIssuesToolSchema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional().describe("Filter by issue status"),
});

const getPopularIssuesTool = new DynamicStructuredTool({
    name: "get_popular_issues",
    description: "Get the most popular (most upvoted) issues. Useful when user asks about 'popular issues', 'trending issues', 'most upvoted', or 'top issues'.",
    schema: getPopularIssuesToolSchema,
    func: async ({ status }) => {
        try {
            const query: any = {};
            if (status) {
                query.status = status;
            }

            const issues = await issueModel.find(query)
                .sort({ upvotes: -1 })
                .limit(10)
                .lean();

            if (issues.length === 0) {
                return "No popular issues found.";
            }

            const summary = {
                total: issues.length,
                issues: issues.map(issue => ({
                    id: issue._id,
                    title: issue.title,
                    category: issue.category,
                    status: issue.status,
                    upvotes: issue.upvotes || 0,
                    location: issue.location.address,
                    createdAt: new Date(issue.createdAt).toLocaleDateString(),
                }))
            };
            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error fetching popular issues: ${error.message}`;
        }
    },
});

// Tool 5: Get issue statistics (platform/community level)
const getPlatformStatsToolSchema = z.object({});

const getPlatformStatsTool = new DynamicStructuredTool({
    name: "get_platform_statistics",
    description: "Get platform-wide statistics about issues including counts by status, category breakdown, and resolution rate.",
    schema: getPlatformStatsToolSchema,
    func: async () => {
        try {
            const query: any = {};

            const [
                totalCount,
                openCount,
                inProgressCount,
                resolvedCount,
                closedCount,
                allIssues
            ] = await Promise.all([
                issueModel.countDocuments(query),
                issueModel.countDocuments({ status: 'open' }),
                issueModel.countDocuments({ status: 'in_progress' }),
                issueModel.countDocuments({ status: 'resolved' }),
                issueModel.countDocuments({ status: 'closed' }),
                issueModel.find(query).select('category').lean()
            ]);

            // Category breakdown
            const categoryMap: Record<string, number> = {};
            allIssues.forEach(issue => {
                categoryMap[issue.category] = (categoryMap[issue.category] || 0) + 1;
            });

            const stats = {
                scope: "community",
                total: totalCount,
                byStatus: {
                    open: openCount,
                    in_progress: inProgressCount,
                    resolved: resolvedCount,
                    closed: closedCount,
                },
                byCategory: categoryMap,
                resolutionRate: totalCount > 0 ? `${((resolvedCount / totalCount) * 100).toFixed(1)}%` : "0%",
            };

            return JSON.stringify(stats, null, 2);
        } catch (error: any) {
            return `Error fetching platform statistics: ${error.message}`;
        }
    },
});

// Tool 5b: Get issue statistics for the current user
const getUserStatsToolSchema = z.object({});

const createGetUserStatsTool = (userId: string) => new DynamicStructuredTool({
    name: "get_my_issue_statistics",
    description: "Get statistics for the current user's issues only (counts by status, category breakdown, resolution rate).",
    schema: getUserStatsToolSchema,
    func: async () => {
        try {
            const query: any = { userId };

            const [
                totalCount,
                openCount,
                inProgressCount,
                resolvedCount,
                closedCount,
                allIssues
            ] = await Promise.all([
                issueModel.countDocuments(query),
                issueModel.countDocuments({ ...query, status: 'open' }),
                issueModel.countDocuments({ ...query, status: 'in_progress' }),
                issueModel.countDocuments({ ...query, status: 'resolved' }),
                issueModel.countDocuments({ ...query, status: 'closed' }),
                issueModel.find(query).select('category').lean()
            ]);

            const categoryMap: Record<string, number> = {};
            allIssues.forEach(issue => {
                categoryMap[issue.category] = (categoryMap[issue.category] || 0) + 1;
            });

            const stats = {
                scope: "user",
                total: totalCount,
                byStatus: {
                    open: openCount,
                    in_progress: inProgressCount,
                    resolved: resolvedCount,
                    closed: closedCount,
                },
                byCategory: categoryMap,
                resolutionRate: totalCount > 0 ? `${((resolvedCount / totalCount) * 100).toFixed(1)}%` : "0%",
            };

            return JSON.stringify(stats, null, 2);
        } catch (error: any) {
            return `Error fetching your issue statistics: ${error.message}`;
        }
    },
});

// Tool 6: Get issue details by ID
const getIssueDetailToolSchema = z.object({
    issueId: z.string().describe("The ID of the issue to retrieve details for"),
});

const getIssueDetailTool = new DynamicStructuredTool({
    name: "get_issue_details",
    description: "Get detailed information about a specific issue by ID. Useful when user asks about a specific issue or wants more details.",
    schema: getIssueDetailToolSchema,
    func: async ({ issueId }) => {
        try {
            const issue = await issueModel.findById(issueId).lean();

            if (!issue) {
                return "Issue not found.";
            }

            const details = {
                id: issue._id,
                title: issue.title,
                description: issue.description,
                category: issue.category,
                status: issue.status,
                upvotes: issue.upvotes || 0,
                location: issue.location,
                uploadUrls: issue.uploadUrls,
                createdAt: new Date(issue.createdAt).toLocaleString(),
                updatedAt: new Date(issue.updatedAt).toLocaleString(),
                resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString() : null,
                resolutionMessage: issue.resolutionMessage,
            };

            return JSON.stringify(details, null, 2);
        } catch (error: any) {
            return `Error fetching issue details: ${error.message}`;
        }
    },
});

// Tool 7: Get leaderboard
const getLeaderboardToolSchema = z.object({});

const getLeaderboardTool = new DynamicStructuredTool({
    name: "get_leaderboard",
    description: "Get the community leaderboard showing top contributors ranked by their activity and impact. Shows users with most resolved issues, total reports, upvotes, scores, and badges. Use this when user asks about 'leaderboard', 'top contributors', 'rankings', 'who is leading', 'best users', or 'community leaders'.",
    schema: getLeaderboardToolSchema,
    func: async () => {
        try {
            const leaderboard = await getLeaderboard();

            if (leaderboard.length === 0) {
                return "No leaderboard data available yet.";
            }

            const topUsers = leaderboard.slice(0, 10);

            const summary = {
                totalUsers: leaderboard.length,
                topContributors: topUsers.map(user => ({
                    rank: user.rank,
                    name: user.name,
                    score: user.score,
                    totalIssues: user.totalIssues,
                    resolvedIssues: user.resolvedIssues,
                    totalUpvotes: user.totalUpvotes,
                    badges: user.badges,
                }))
            };

            return JSON.stringify(summary, null, 2);
        } catch (error: any) {
            return `Error fetching leaderboard: ${error.message}`;
        }
    },
});

// Tool 8: Trigger issue creation flow
const triggerIssueCreationSchema = z.object({});

// We'll create a factory function for this tool that accepts the conversation
const createTriggerIssueCreationTool = (conversation: any) => {
    return new DynamicStructuredTool({
        name: "trigger_issue_creation_form",
        description: "Use this ONLY when user explicitly wants to report, create, or submit a new civic issue (e.g., 'report a pothole', 'create an issue', 'submit a complaint', 'I want to report', etc.). This opens the issue creation form.",
        schema: triggerIssueCreationSchema,
        func: async () => {
            // Set the context when this tool is invoked
            conversation.context.set('creatingIssue', true);

            return "FORM_TRIGGER_MARKER";
        },
    });
};

// Create the agent with all tools
const createToolsArray = (conversation: any, userId: string) => [
    createGetUserIssuesTool(userId),
    getAllIssuesTool,
    getNearbyIssuesTool,
    getPopularIssuesTool,
    getPlatformStatsTool,
    createGetUserStatsTool(userId),
    getIssueDetailTool,
    getLeaderboardTool,
    createTriggerIssueCreationTool(conversation),
];

const systemPrompt = `You are Civica, the City Assistant for the "Improve My City" platform, a civic engagement tool for reporting and tracking community issues.

YOUR MISSION: Help users find information about issues using the available tools. ALWAYS use tools to retrieve accurate, real-time data.

=== AVAILABLE TOOLS ===
You have access to these tools - USE THEM frequently:

1. **get_user_issues** - Get issues reported by the current user
   - Use when: "my issues", "my reports", "what did I report", "my complaints"
   - Can filter by status (open, in_progress, resolved, closed)

2. **get_all_issues** - Get all community issues with filters & pagination
   - Use when: "all issues", "show issues", "what's happening", "community problems"
   - Supports: status filter, category filter, sorting (createdAt, upvotes), pagination

3. **search_nearby_issues** - Find issues near a location
   - Use when: "nearby issues", "issues near me", "problems in my area", "local issues"
   - Requires: latitude, longitude (ask user if not provided)
   - Optional: radius in km, status filter

4. **get_popular_issues** - Get most upvoted issues
   - Use when: "popular issues", "trending", "most upvoted", "top issues", "what's hot"
   - Can filter by status

5. **get_platform_statistics** - Get platform-wide stats
   - Use when: "statistics", "how many issues", "platform stats", "overall numbers"
   - Returns: total issues, breakdown by status/category, resolution rate

6. **get_my_issue_statistics** - Get current user's statistics
   - Use when: "my stats", "my statistics", "how am I doing", "my activity"
   - Returns: user's issues by status/category, personal resolution rate

7. **get_issue_details** - Get detailed info about a specific issue
   - Use when: user mentions issue ID or asks for details about a specific issue
   - Requires: issueId

8. **get_leaderboard** - Get top contributors rankings
   - Use when: "leaderboard", "top contributors", "rankings", "who is leading", "best users"
   - Shows: ranks, scores, badges, resolved issues, upvotes

9. **trigger_issue_creation_form** - Open the issue reporting form
   - Use ONLY when: "report issue", "create issue", "submit complaint", "I want to report"
   - Opens the form - just call it, don't describe it

=== CRITICAL INSTRUCTIONS ===
1. **ALWAYS USE TOOLS** - Don't guess or make up information. If user asks about issues, stats, or leaderboard, USE THE RELEVANT TOOL.

2. **Tool Selection Logic**:
   - Questions about EXISTING issues → use query tools (get_user_issues, get_all_issues, etc.)
   - Want to CREATE NEW issue → use trigger_issue_creation_form
   - Questions about rankings/contributors → use get_leaderboard
   - Questions about numbers/stats → use get_platform_statistics or get_my_issue_statistics

3. **Response Format**:
   - Be brief and direct
   - Present tool results clearly
   - Use bullet points for lists
   - Include relevant numbers (upvotes, counts, ranks)

4. **What NOT to do**:
   - Don't invent data without calling tools
   - Don't claim to open UI elements in your responses
   - Don't describe what you're doing with tools - just call them
   - Tools handle user identity automatically - don't ask for user IDs

5. **When to ask questions**:
   - Nearby search needs coordinates (ask user for location)
   - Ambiguous requests (clarify before calling tools)
   - No tool matches the query (politely say you can't help)

Navigation hints (when asked):
- Dashboard (Home): see all issues with filters
- /report: create new report
- /my-issues: your reports
- /resolved: finished issues
- /leaderboard: community rankings
- /admin: admin panel (admins only)

Remember: Your value is in retrieving REAL data via tools. Use them generously!
`;

// Helper function to get or create conversation
async function getOrCreateConversation(userId: string) {
    let conversation = await conversationModel.findOne({
        userId,
        isActive: true,
    }).sort({ updatedAt: -1 });

    if (!conversation) {
        conversation = await conversationModel.create({
            userId,
            messages: [],
            context: {},
        });
    }

    return conversation;
}

// Helper function to summarize old messages to save tokens
function summarizeMessages(messages: any[]): BaseMessage[] {
    // Keep only last 10 messages for context
    const recentMessages = messages.slice(-10);

    return recentMessages.map(msg => {
        if (msg.role === 'user') {
            return new HumanMessage(msg.content);
        } else {
            return new AIMessage(msg.content);
        }
    });
}



export const processChatMessage = async (message: string, userId: string, userName?: string): Promise<string> => {
    try {
        if (!GROQ_API_KEY) {
            return "I'm currently offline. Please check your issues in the dashboard or contact support.";
        }

        const conversation = await getOrCreateConversation(userId);

        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date(),
        });

        const messageHistory = summarizeMessages(conversation.messages);

        const namePrefix = userName ? `User: ${userName}\n` : '';
        const contextualMessage = `${namePrefix}User Question: ${message}`;
        const tools = createToolsArray(conversation, userId);

        const agent = createAgent({
            model: llm,
            tools,
            systemPrompt,
        });

        // Create messages array with history
        const allMessages: BaseMessage[] = [
            ...messageHistory.slice(0, -1), // All previous messages except the last user message
            new HumanMessage(contextualMessage), // Current message with full context
        ];

        const result = await agent.invoke({ messages: allMessages });

        // Extract the last message from the agent response
        const messages = result.messages;
        const lastMessage = messages[messages.length - 1];

        let responseText = "I'm not sure how to help with that. Could you please rephrase your question?";
        let shouldTriggerForm = false;

        // Check if the trigger_issue_creation_form tool was called
        for (const msg of messages) {
            if ('tool_calls' in msg && Array.isArray(msg.tool_calls)) {
                for (const toolCall of msg.tool_calls) {
                    if (toolCall.name === 'trigger_issue_creation_form') {
                        shouldTriggerForm = true;
                        break;
                    }
                }
            }
            if (shouldTriggerForm) break;
        }

        // If form trigger detected, check for the marker in tool responses
        if (shouldTriggerForm) {
            for (const msg of messages) {
                if ('content' in msg && typeof msg.content === 'string') {
                    if (msg.content.includes('FORM_TRIGGER_MARKER')) {
                        // Return special response that frontend will detect
                        responseText = "__OPEN_ISSUE_FORM__";
                        break;
                    }
                }
            }
            // Fallback if marker not found but tool was called
            if (responseText !== "__OPEN_ISSUE_FORM__") {
                responseText = "__OPEN_ISSUE_FORM__";
            }
        } else if (lastMessage && 'content' in lastMessage && typeof lastMessage.content === 'string') {
            responseText = lastMessage.content;
        }

        conversation.messages.push({
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
        });

        // Save conversation (limit message history to last 50 to save DB space)
        if (conversation.messages.length > 50) {
            while (conversation.messages.length > 50) {
                conversation.messages.shift();
            }
        }

        await conversation.save();

        return responseText;
    } catch (error: any) {
        console.error("Chatbot error:", error);
        return "I encountered an error processing your request. Please try again or contact support if the issue persists.";
    }
};
