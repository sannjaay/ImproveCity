import issueModel from "@/models/issue";
import commentModel from "@/models/comment";
import userModel from "@/models/user";
import { Issue } from "@/types/issue";
import { Comment } from "@/types/comment";
import { NotFoundError, UnauthorizedError } from "@/utils/errors";
import { transporter } from "@/services/mailer";

const generateIssueCreationEmail = (issue: Issue, userName: string): string => {
    const statusColor = '#3b82f6';
    // Format created time in IST and explicitly mention IST
    const date = new Date(issue.createdAt).toLocaleString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    }) + ' IST';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Issue Created</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                    Improve My City
                                </h1>
                                <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                                    Issue Confirmation
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 8px; margin-bottom: 30px;">
                                    <p style="margin: 0; color: #166534; font-size: 16px; font-weight: 600;">
                                        Your issue has been successfully created and submitted for review.
                                    </p>
                                </div>

                                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                    ${issue.title}
                                </h2>

                                <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">STATUS:</td>
                                            <td style="padding: 8px 0; text-align: right;">
                                                <span style="display: inline-block; background-color: ${statusColor}; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: uppercase;">
                                                    ${issue.status}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">CATEGORY:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${issue.category}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">LOCATION:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${issue.location.address}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">REPORTED BY:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${userName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">CREATED:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${date}
                                            </td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="margin-bottom: 25px;">
                                    <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Description:</h3>
                                    <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                                        ${issue.description}
                                    </p>
                                </div>

                                ${issue.uploadUrls && issue.uploadUrls.length > 0 ? `
                                <div style="margin-bottom: 25px;">
                                    <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">Attachments:</h3>
                                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                        ${issue.uploadUrls.length} file(s) attached
                                    </p>
                                </div>
                                ` : ''}

                                <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-top: 30px;">
                                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                                        <strong>What's next?</strong><br>
                                        Our team will review your submission and you'll receive email notifications as the status of your issue changes.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                    Thank you for helping improve our city.
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                    © 2025 Improve My City. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

const generateStatusUpdateEmail = (
    issue: Issue, 
    userName: string, 
    oldStatus: string, 
    newStatus: string,
    resolutionMessage?: string
): string => {
    const statusColors: Record<string, string> = {
        'open': '#3b82f6',
        'in_progress': '#f59e0b',
        'resolved': '#22c55e',
        'closed': '#6b7280'
    };

    const date = new Date(issue.updatedAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Issue Status Updated</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                    Improve My City
                                </h1>
                                <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">
                                    Status Update Notification
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 8px; margin-bottom: 30px;">
                                    <p style="margin: 0; color: #1e40af; font-size: 16px; font-weight: 600;">
                                        The status of your issue has been updated.
                                    </p>
                                </div>

                                <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                                    ${issue.title}
                                </h2>

                                <!-- Status Change Visual -->
                                <div style="background-color: #f9fafb; padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
                                    <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Status Changed
                                    </p>
                                    <div style="display: flex; align-items: center; justify-content: center;">
                                        <table role="presentation" style="border-collapse: collapse;">
                                            <tr>
                                                <td style="text-align: center; padding: 0 15px;">
                                                    <span style="display: inline-block; background-color: ${statusColors[oldStatus]}; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                                                        ${oldStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style="text-align: center; padding: 0 10px;">
                                                    <span style="font-size: 24px; color: #9ca3af;">→</span>
                                                </td>
                                                <td style="text-align: center; padding: 0 15px;">
                                                    <span style="display: inline-block; background-color: ${statusColors[newStatus]}; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: uppercase;">
                                                        ${newStatus.replace('_', ' ')}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>

                                <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">CATEGORY:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${issue.category}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">LOCATION:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${issue.location.address}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">UPDATED BY:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${userName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">UPDATED:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${date}
                                            </td>
                                        </tr>
                                        ${issue.upvotes ? `
                                        <tr>
                                            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600;">UPVOTES:</td>
                                            <td style="padding: 8px 0; text-align: right; color: #1f2937; font-size: 14px; font-weight: 500;">
                                                ${issue.upvotes}
                                            </td>
                                        </tr>
                                        ` : ''}
                                    </table>
                                </div>

                                ${resolutionMessage ? `
                                <div style="background-color: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                                    <h3 style="margin: 0 0 12px 0; color: #166534; font-size: 16px; font-weight: 600;">
                                        Resolution Details:
                                    </h3>
                                    <p style="margin: 0; color: #166534; font-size: 15px; line-height: 1.6;">
                                        ${resolutionMessage}
                                    </p>
                                </div>
                                ` : ''}

                                ${newStatus === 'resolved' ? `
                                <div style="background-color: #f0fdf4; border-radius: 12px; padding: 25px; text-align: center; margin-top: 30px;">
                                    <h3 style="margin: 0 0 10px 0; color: #166534; font-size: 20px; font-weight: 700;">
                                        Issue Resolved
                                    </h3>
                                    <p style="margin: 0; color: #16a34a; font-size: 15px;">
                                        Thank you for your patience. This issue has been successfully resolved.
                                    </p>
                                </div>
                                ` : `
                                <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-top: 30px;">
                                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                                        You will continue to receive email notifications as the status of your issue progresses.
                                    </p>
                                </div>
                                `}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                                    Thank you for helping improve our city.
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                                    © 2025 Improve My City. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

export const createIssue = async (issueData: Omit<Issue, '_id' | 'createdAt' | 'updatedAt'>): Promise<Issue> => {
    const now = Date.now();
    const issue = await issueModel.create({
        ...issueData,
        createdAt: now,
        updatedAt: now
    });

    const issueObject = issue.toObject();

    try {
        const user = await userModel.findById(issueData.userId).lean();
        if (user?.email) {
            const htmlContent = generateIssueCreationEmail(issueObject, user.name);
            
            await transporter.sendMail({
                from: '"Improve My City" <improvmycity26@gmail.com>',
                to: user.email,
                subject: `Issue Created: ${issueObject.title}`,
                html: htmlContent
            });
        }
    } catch (error) {
        console.error('Failed to send issue creation email:', error);
    }

    return issueObject;
};

export const getIssue = async (issueId: string): Promise<Issue> => {
    const issue = await issueModel.findById(issueId).lean();

    if (!issue) {
        throw new NotFoundError("Issue not found");
    }

    return issue;
};

export const addComment = async (commentData: Omit<Comment, '_id' | 'createdAt'>): Promise<Comment> => {
    await getIssue(commentData.issueId);

    const comment = await commentModel.create({
        ...commentData,
        createdAt: Date.now()
    });

    return comment.toObject();
};

export const getCommentsByIssueId = async (issueId: string): Promise<(Comment & { userName?: string })[]> => {
    const comments = await commentModel.find({ issueId }).sort({ createdAt: -1 }).lean();
    
    // Get user information for each comment
    const commentsWithUserNames = await Promise.all(
        comments.map(async (comment) => {
            const user = await userModel.findById(comment.userId).lean();
            return {
                ...comment,
                userName: user?.name || 'User'
            };
        })
    );
    
    return commentsWithUserNames;
};

interface GetIssuesFilters {
    status?: Issue["status"];
    category?: string;
    userId?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'upvotes';
    sortOrder?: 'asc' | 'desc';
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export const getIssues = async (filters: GetIssuesFilters): Promise<{
    data: (Issue & { distance?: number; reportedByName?: string })[];
    total: number;
    page: number;
    totalPages: number;
}> => {
    const query: any = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.userId) {
        query.userId = filters.userId;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const total = await issueModel.countDocuments(query);
    
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
console.log(filters, skip, limit)
    let issues = await issueModel.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean();

    // Get user names for all issues
    const issuesWithUserNames = await Promise.all(
        issues.map(async (issue) => {
            const user = await userModel.findById(issue.userId).lean();
            return {
                ...issue,
                reportedByName: user?.name || 'User'
            };
        })
    );

    if (filters.latitude !== undefined && filters.longitude !== undefined) {
        const radiusKm = filters.radiusKm || 100;

        const issuesWithDistance = issuesWithUserNames
            .map(issue => {
                const distance = calculateDistance(
                    filters.latitude!,
                    filters.longitude!,
                    issue.location.latitude,
                    issue.location.longitude
                );
                return { ...issue, distance };
            })
            .filter(issue => issue.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);
        
        return {
            data: issuesWithDistance,
            total: issuesWithDistance.length,
            page,
            totalPages: Math.ceil(issuesWithDistance.length / limit)
        };
    }

    return {
        data: issuesWithUserNames,
        total,
        page,
        totalPages
    };
};

export const updateIssueStatus = async (
    issueId: string, 
    status: Issue['status'], 
    userId: string, 
    isAdmin: boolean,
    resolutionMessage?: string,
    resolutionUploadUrls?: string[]
): Promise<Issue> => {
    const issue = await issueModel.findById(issueId);

    if (!issue) {
        throw new NotFoundError("Issue not found");
    }

    if (!isAdmin && issue.userId !== userId) {
        throw new UnauthorizedError("You don't have permission to update this issue");
    }

    const oldStatus = issue.status;
    issue.status = status;
    issue.updatedAt = Date.now();
    
    if (status === 'resolved') {
        issue.resolvedAt = Date.now();
        if (resolutionMessage) {
            issue.resolutionMessage = resolutionMessage;
        }
        if (resolutionUploadUrls) {
            issue.resolutionUploadUrls = resolutionUploadUrls;
        }
        
        if (resolutionMessage) {
            await commentModel.create({
                issueId,
                userId,
                comment: resolutionMessage,
                uploadUrls: resolutionUploadUrls || [],
                isAdmin: isAdmin,
                createdAt: Date.now()
            });
        }
    }
    
    await issue.save();

    const issueObject = issue.toObject();

    try {
        const issueCreator = await userModel.findById(issue.userId).lean();
        const updater = await userModel.findById(userId).lean();
        
        if (issueCreator?.email) {
            const htmlContent = generateStatusUpdateEmail(
                issueObject,
                updater?.name || 'Admin',
                oldStatus,
                status,
                resolutionMessage
            );
            
            await transporter.sendMail({
                from: '"Improve My City" <improvmycity26@gmail.com>',
                to: issueCreator.email,
                subject: `Issue Status Updated: ${issueObject.title}`,
                html: htmlContent
            });
        }
    } catch (error) {
        console.error('Failed to send status update email:', error);
        // Don't throw error, just log it - email failure shouldn't prevent status update
    }

    return issueObject;
};

export const deleteIssue = async (issueId: string, userId: string, isAdmin: boolean): Promise<void> => {
    const issue = await issueModel.findById(issueId);

    if (!issue) {
        throw new NotFoundError("Issue not found");
    }

    if (!isAdmin && issue.userId !== userId) {
        throw new UnauthorizedError("You don't have permission to delete this issue");
    }

    await issueModel.findByIdAndDelete(issueId);
    await commentModel.deleteMany({ issueId });
};

export const upvoteIssue = async (issueId: string, userId: string): Promise<Issue> => {
    const issue = await issueModel.findById(issueId);

    if (!issue) {
        throw new NotFoundError("Issue not found");
    }

    const upvotedBy = issue.upvotedBy || [];
    const hasUpvoted = upvotedBy.includes(userId);

    if (hasUpvoted) {
        // Remove upvote
        issue.upvotedBy = upvotedBy.filter(id => id !== userId);
        issue.upvotes = Math.max(0, (issue.upvotes || 0) - 1);
    } else {
        // Add upvote
        issue.upvotedBy = [...upvotedBy, userId];
        issue.upvotes = (issue.upvotes || 0) + 1;
    }

    issue.updatedAt = Date.now();
    await issue.save();

    return issue.toObject();
};

