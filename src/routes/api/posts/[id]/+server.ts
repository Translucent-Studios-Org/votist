import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
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

// GET /api/posts/[id] - Get a specific post with all details
export const GET: RequestHandler = async ({ params }) => {
	try {
		const post = await prisma.post.findUnique({
			where: { id: params.id },
			include: {
				author: { select: authorSelect },
				poll: {
					include: {
						options: {
							include: {
								_count: {
									select: {
										userVotes: true
									}
								}
							}
						}
					}
				},
				quizGateQuiz: {
					select: {
						id: true,
						title: true,
						difficulty: true
					}
				},
				comments: {
					include: {
						author: { select: authorSelect },
						replies: {
							include: {
								author: { select: authorSelect }
							}
						}
					},
					orderBy: {
						createdAt: 'desc'
					}
				},
				_count: {
					select: {
						comments: true,
						likes: true
					}
				}
			}
		});

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		const author = transformAuthor(post.author);

		const transformedComments = post.comments.map((comment) => {
			const commentAuthor = transformAuthor(comment.author);
			const transformedReplies = (comment.replies || []).map((reply) => ({
				...reply,
				author: transformAuthor(reply.author)
			}));

			return {
				...comment,
				author: commentAuthor,
				replies: transformedReplies
			};
		});

		const transformedPost = {
			...post,
			author,
			comments: transformedComments
		};

		return json({ post: transformedPost });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};

// PUT /api/posts/[id] - Update a post
export const PUT: RequestHandler = async (event) => {
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

		// Check if user owns the post or is admin
		const existingPost = await prisma.post.findUnique({
			where: { id: event.params.id },
			select: { authorId: true }
		});

		if (!existingPost) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (existingPost.authorId !== dbUser.id && user.publicMetadata?.role !== 'admin') {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		const post = await prisma.post.update({
			where: { id: event.params.id },
			data: {
				title: data.title,
				content: data.content,
				imageUrl: data.imageUrl || null,
				category: data.category,
				tags: data.tags || [],
				showTitle: data.showTitle ?? true,
				showContent: data.showContent ?? true,
				quizGateType: data.quizGateType || 'NONE',
				quizGateDifficulty: data.quizGateDifficulty || null,
				quizGateQuizId: data.quizGateQuizId || null
			},
			include: {
				author: { select: authorSelect },
				poll: {
					include: {
						options: true
					}
				}
			}
		});

		const transformedPost = {
			...post,
			author: transformAuthor(post.author)
		};

		return json({ post: transformedPost });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};

// DELETE /api/posts/[id] - Delete a post
export const DELETE: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Look up internal DB user by Clerk ID
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id }
		});

		if (!dbUser) {
			return json({ error: 'User not found in database' }, { status: 404 });
		}

		// Check if user owns the post or is admin
		const existingPost = await prisma.post.findUnique({
			where: { id: event.params.id },
			select: { authorId: true }
		});

		if (!existingPost) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (existingPost.authorId !== dbUser.id && user.publicMetadata?.role !== 'admin') {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		await prisma.post.delete({
			where: { id: event.params.id }
		});

		return json({ message: 'Post deleted successfully' });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};

// POST /api/posts/[id]/like - Toggle like on a post
export const POST: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

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

		// Verify the post exists
		const post = await prisma.post.findUnique({
			where: { id: event.params.id },
			select: { id: true }
		});

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		// Use transaction to handle like toggle atomically
		const result = await prisma.$transaction(async (tx) => {
			// Check if user already liked
			const existingLike = await tx.postLike.findUnique({
				where: {
					userId_postId: {
						userId: dbUser.id,
						postId: event.params.id
					}
				}
			});

			let newIsLiked: boolean;
			let newLikes: number;

			if (existingLike) {
				// Remove like
				await tx.postLike.delete({
					where: { id: existingLike.id }
				});
				newIsLiked = false;
				newLikes = await tx.post
					.update({
						where: { id: event.params.id },
						data: { likes: { decrement: 1 } },
						select: { likes: true }
					})
					.then((c) => c.likes);
			} else {
				// Add like
				await tx.postLike.create({
					data: {
						userId: dbUser.id,
						postId: event.params.id
					}
				});
				newIsLiked = true;
				newLikes = await tx.post
					.update({
						where: { id: event.params.id },
						data: { likes: { increment: 1 } },
						select: { likes: true }
					})
					.then((c) => c.likes);
			}

			return { likes: newLikes, isLiked: newIsLiked };
		});

		return json({ ...result });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};
