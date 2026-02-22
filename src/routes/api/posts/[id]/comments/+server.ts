import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
import { userMeetsPostQuizGate } from '$lib/server/quizPermissions';
import { checkUserBanStatus } from '$lib/server/moderation';
import { prisma } from '$lib/server/db/prisma';

const authorSelect = {
	firstName: true,
	lastName: true,
	displayName: true,
	useDisplayName: true,
	avatarUrl: true,
	email: true,
	isAdmin: true
} as const;

function transformAuthor(author: {
	firstName: string | null;
	lastName: string | null;
	displayName: string | null;
	useDisplayName: boolean;
	avatarUrl: string | null;
	email: string | null;
	isAdmin: boolean;
}) {
	const name =
		author.useDisplayName && author.displayName
			? author.displayName
			: author.firstName && author.lastName
				? `${author.firstName} ${author.lastName}`
				: author.firstName || author.lastName || 'Anonymous';
	return {
		name,
		avatar: author.avatarUrl || '',
		username: author.email?.split('@')[0] || 'user',
		isVerified: author.isAdmin
	};
}

// GET /api/posts/[id]/comments - Get comments for a post
export const GET: RequestHandler = async (event) => {
	const { params, url } = event;
	const { user, isAuthenticated } = await getUser(event);

	try {
		// Look up DB user for isLiked checks
		let commentLikeSet = new Set<string>();
		if (isAuthenticated && user) {
			const dbUser = await prisma.user.findUnique({
				where: { clerkId: user.id },
				select: { id: true }
			});
			if (dbUser) {
				const likes = await prisma.commentLike.findMany({
					where: { userId: dbUser.id },
					select: { commentId: true }
				});
				likes.forEach((l) => commentLikeSet.add(l.commentId));
			}
		}

		const comments = await prisma.comment.findMany({
			where: {
				postId: params.id,
				parentId: null
			},
			include: {
				author: { select: authorSelect },
				// Use threadReplies to get ALL descendants (not just direct children)
				threadReplies: {
					include: {
						author: { select: authorSelect }
					},
					orderBy: {
						createdAt: 'asc'
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		const transformedComments = comments.map((comment) => ({
			id: comment.id,
			authorId: comment.authorId,
			author: transformAuthor(comment.author),
			content: comment.content,
			timestamp: comment.createdAt.toISOString(),
			likes: comment.likes,
			isLiked: commentLikeSet.has(comment.id),
			replies: (comment.threadReplies || []).map((reply) => ({
				id: reply.id,
				authorId: reply.authorId,
				author: transformAuthor(reply.author),
				content: reply.content,
				timestamp: reply.createdAt.toISOString(),
				likes: reply.likes,
				isLiked: commentLikeSet.has(reply.id),
				rootCommentId: reply.rootCommentId || undefined,
				parentId: reply.parentId || undefined
			}))
		}));

		return json({ comments: transformedComments });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};

// POST /api/posts/[id]/comments - Create a new comment
export const POST: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await event.request.json();

	try {
		// Look up internal DB user by Clerk ID
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id }
		});

		if (!dbUser) {
			return json({ error: 'User not found in database' }, { status: 404 });
		}

		// Check if user is banned
		const banStatus = await checkUserBanStatus(dbUser.id);
		if (banStatus.isBanned) {
			return json({ error: 'Your account has been suspended', reason: banStatus.reason }, { status: 403 });
		}

		// Verify the post exists and check quiz gate in one query
		const post = await prisma.post.findUnique({
			where: { id: event.params.id },
			select: { id: true, quizGateType: true, quizGateDifficulty: true, quizGateQuizId: true }
		});

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		// Check if user meets post-level quiz gate
		const gateResult = await userMeetsPostQuizGate(dbUser.id, post);
		if (!gateResult.allowed) {
			return json(
				{
					error: 'Quiz gate requirement not met',
					message: gateResult.message
				},
				{ status: 403 }
			);
		}

		// Determine rootCommentId for 2-level threading
		let rootCommentId: string | null = null;
		if (data.parentId) {
			const parentComment = await prisma.comment.findUnique({
				where: { id: data.parentId },
				select: { id: true, rootCommentId: true }
			});
			if (!parentComment) {
				return json({ error: 'Parent comment not found' }, { status: 400 });
			}
			rootCommentId = parentComment.rootCommentId || parentComment.id;
		}

		const comment = await prisma.comment.create({
			data: {
				content: data.content,
				authorId: dbUser.id,
				postId: event.params.id!,
				parentId: data.parentId || null,
				rootCommentId
			},
			include: {
				author: { select: authorSelect }
			}
		});

		const transformedComment = {
			id: comment.id,
			authorId: comment.authorId,
			author: transformAuthor(comment.author),
			content: comment.content,
			timestamp: comment.createdAt.toISOString(),
			likes: 0,
			isLiked: false,
			replies: [],
			rootCommentId: comment.rootCommentId || undefined,
			parentId: comment.parentId || undefined
		};

		return json({ comment: transformedComment });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};
