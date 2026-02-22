import { prisma } from '$lib/server/db/prisma';
import { error } from '@sveltejs/kit';
import QRCode from 'qrcode';
import type { PageServerLoad } from './$types';
import type { PostData, CommentData, Poll } from '$lib/types';

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

const authorSelect = {
	firstName: true,
	lastName: true,
	displayName: true,
	useDisplayName: true,
	avatarUrl: true,
	email: true,
	isAdmin: true
} as const;

export const load: PageServerLoad = async ({ params, url }) => {
	const post = await prisma.post.findUnique({
		where: { id: params.id },
		include: {
			author: { select: authorSelect },
			poll: {
				include: {
					options: {
						select: { id: true, text: true, votes: true }
					}
				}
			},
			_count: { select: { comments: true } }
		}
	});

	if (!post) {
		throw error(404, 'Post not found');
	}

	// Fetch comments with thread replies
	const comments = await prisma.comment.findMany({
		where: { postId: params.id, parentId: null },
		include: {
			author: { select: authorSelect },
			threadReplies: {
				include: { author: { select: authorSelect } },
				orderBy: { createdAt: 'asc' }
			}
		},
		orderBy: { createdAt: 'desc' }
	});

	const transformedComments: CommentData[] = comments.map((comment) => ({
		id: comment.id,
		author: transformAuthor(comment.author),
		content: comment.content,
		timestamp: comment.createdAt.toISOString(),
		likes: comment.likes,
		isLiked: false,
		replies: (comment.threadReplies || []).map((reply) => ({
			id: reply.id,
			author: transformAuthor(reply.author),
			content: reply.content,
			timestamp: reply.createdAt.toISOString(),
			likes: reply.likes,
			isLiked: false,
			rootCommentId: reply.rootCommentId || undefined,
			parentId: reply.parentId || undefined
		}))
	}));

	const pollData: Poll | undefined = post.poll
		? {
				question: post.poll.question,
				totalVotes: post.poll.totalVotes,
				options: post.poll.options,
				endsAt: post.poll.endsAt?.toISOString()
			}
		: undefined;

	const transformedPost: PostData = {
		id: post.id,
		title: post.title,
		content: post.content,
		author: transformAuthor(post.author),
		timestamp: post.createdAt.toISOString(),
		category: post.category,
		likes: post.likes,
		comments: post._count.comments,
		isLiked: false,
		isBookmarked: false,
		tags: post.tags || [],
		poll: pollData
	};

	const shareUrl = `${url.origin}/post/${params.id}`;
	const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
		width: 200,
		margin: 2,
		color: { dark: '#167b9b', light: '#ffffff' }
	});

	return {
		post: transformedPost,
		comments: transformedComments,
		shareUrl,
		qrCodeDataUrl
	};
};
