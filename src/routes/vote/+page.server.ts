import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { PollFeedData, PostData, Poll } from '$lib/types';
import { userMeetsPostQuizGate } from '$lib/server/quizPermissions';

// Transform DB user fields into frontend display format (no external API calls)
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

	if (!isAuthenticated || !user) {
		throw redirect(302, '/sign-in');
	}

	// Look up internal DB user for the authenticated user
	let dbUserId: string | null = null;
	const dbUser = await prisma.user.findUnique({
		where: { clerkId: user.id },
		select: { id: true }
	});
	dbUserId = dbUser?.id ?? null;

	// Fetch posts and user interaction data in parallel (no comments — loaded lazily on client)
	const [posts, ...userMaps] = await Promise.all([
		prisma.post.findMany({
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
			orderBy: { createdAt: 'desc' },
			take: 10
		}),
		...(dbUserId
			? [
					prisma.vote.findMany({
						where: { userId: dbUserId },
						select: { postId: true, optionId: true }
					}),
					prisma.postLike.findMany({
						where: { userId: dbUserId },
						select: { postId: true }
					})
				]
			: [])
	]);

	let voteMap = new Map<string, string>();
	let postLikeMap = new Map<string, boolean>();

	if (dbUserId && userMaps.length === 2) {
		const [userVotes, userPostLikes] = userMaps as [
			{ postId: string; optionId: string }[],
			{ postId: string }[]
		];
		userVotes.forEach((vote) => voteMap.set(vote.postId, vote.optionId));
		userPostLikes.forEach((like) => postLikeMap.set(like.postId, true));
	}

	const polls: PollFeedData[] = await Promise.all(
		posts.map(async (post) => {
			const postAuthor = transformAuthor(post.author);

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
						userVote: voteMap.get(post.id),
						endsAt: post.poll.endsAt?.toISOString()
					}
				: undefined;

			const transformedPost: PostData = {
				id: post.id,
				title: post.title,
				content: post.content,
				author: postAuthor,
				timestamp: post.createdAt.toISOString(),
				category: post.category,
				likes: post.likes,
				comments: post._count.comments,
				isLiked: postLikeMap.get(post.id) || false,
				isBookmarked: false,
				tags: post.tags || [],
				poll: pollData
			};

			return {
				post: transformedPost,
				comments: [],
				quizGateBlocked,
				quizGateMessage
			};
		})
	);

	return {
		polls,
		isAuthenticated,
		user: isAuthenticated ? user : null
	};
};
