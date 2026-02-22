import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import type { PageServerLoad } from './$types';
import type { PollFeedData, PostData, Poll } from '$lib/types';
import { userMeetsPostQuizGate } from '$lib/server/quizPermissions';

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

export const load: PageServerLoad = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	let dbUserId: string | null = null;
	if (isAuthenticated && user) {
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id },
			select: { id: true }
		});
		dbUserId = dbUser?.id ?? null;
	}

	const post = await prisma.post.findFirst({
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
		},
		orderBy: { createdAt: 'desc' }
	});

	if (!post) {
		return { firstPoll: null, isAuthenticated, user: isAuthenticated ? user : null };
	}

	// Fetch user vote + like for this post (if logged in)
	let userVoteOptionId: string | undefined;
	let isPostLiked = false;
	if (dbUserId) {
		const [vote, like] = await Promise.all([
			prisma.vote.findUnique({
				where: { userId_postId: { userId: dbUserId, postId: post.id } }
			}),
			prisma.postLike.findUnique({
				where: { userId_postId: { userId: dbUserId, postId: post.id } }
			})
		]);
		userVoteOptionId = vote?.optionId;
		isPostLiked = !!like;
	}

	// Quiz gate check
	let quizGateBlocked = false;
	let quizGateMessage = '';
	if (dbUserId && post.quizGateType !== 'NONE') {
		const gateResult = await userMeetsPostQuizGate(dbUserId, {
			quizGateType: post.quizGateType,
			quizGateDifficulty: post.quizGateDifficulty,
			quizGateQuizId: post.quizGateQuizId
		});
		quizGateBlocked = !gateResult.allowed;
		quizGateMessage = gateResult.message;
	}

	const pollData: Poll | undefined = post.poll
		? {
				question: post.poll.question,
				totalVotes: post.poll.totalVotes,
				options: post.poll.options,
				userVote: userVoteOptionId,
				endsAt: post.poll.endsAt?.toISOString()
			}
		: undefined;

	const postAuthor = transformAuthor(post.author);
	const transformedPost: PostData = {
		id: post.id,
		title: post.title,
		content: post.content,
		author: postAuthor,
		timestamp: post.createdAt.toISOString(),
		category: post.category,
		likes: post.likes,
		comments: post._count.comments,
		isLiked: isPostLiked,
		isBookmarked: false,
		showTitle: post.showTitle,
		showContent: post.showContent,
		tags: post.tags || [],
		poll: pollData
	};

	const firstPoll: PollFeedData = {
		post: transformedPost,
		comments: [],
		quizGateBlocked,
		quizGateMessage
	};

	return { firstPoll, isAuthenticated, user: isAuthenticated ? user : null };
};
