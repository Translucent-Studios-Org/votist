import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
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

// GET /api/posts - Get all posts with polls and comments
export const GET: RequestHandler = async ({ url }) => {
	try {
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '10');
		const category = url.searchParams.get('category');
		const admin = url.searchParams.get('admin') === 'true';
		const skip = (page - 1) * limit;

		const where = category ? { category } : {};

		// For admin requests, include all posts with author names
		if (admin) {
			const posts = await prisma.post.findMany({
				where,
				include: {
					author: { select: authorSelect },
					poll: {
						include: {
							options: true
						}
					},
					comments: {
						include: {
							author: { select: authorSelect }
						}
					},
					votes: true,
					_count: {
						select: {
							comments: true
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				},
				skip,
				take: limit
			});

			const transformedPosts = posts.map((post) => ({
				...post,
				authorName: transformAuthor(post.author).name
			}));

			const total = await prisma.post.count({ where });

			return json({
				posts: transformedPosts,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit)
				}
			});
		}

		// Original user-facing logic
		const posts = await prisma.post.findMany({
			where,
			include: {
				author: { select: authorSelect },
				poll: {
					include: {
						options: true
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
					where: {
						parentId: null
					},
					orderBy: {
						createdAt: 'desc'
					},
					take: 5
				},
				_count: {
					select: {
						comments: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			skip,
			take: limit
		});

		const transformedPosts = posts.map((post) => {
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

			return {
				...post,
				author,
				comments: transformedComments
			};
		});

		const total = await prisma.post.count({ where });

		return json({
			posts: transformedPosts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit)
			}
		});
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};

// POST /api/posts - Create a new post
export const POST: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check if user is admin for admin post creation
	if (user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
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

		const post = await prisma.post.create({
			data: {
				title: data.title,
				content: data.content,
				authorId: dbUser.id,
				category: data.category,
				tags: data.tags || [],
				quizGateType: data.quizGateType || 'NONE',
				quizGateDifficulty: data.quizGateDifficulty || null,
				quizGateQuizId: data.quizGateQuizId || null,
				poll: data.poll
					? {
							create: {
								question: data.poll.question,
								endsAt: data.poll.endsAt ? new Date(data.poll.endsAt) : null,
								requiredDifficulty: data.poll.requiredDifficulty || null,
								options: {
									create: data.poll.options.map((option: any) => ({
										text: option.text
									}))
								}
							}
						}
					: undefined
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
		console.error('Error creating post:', error);
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};
