import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { id } = event.params;
	if (!id) return json({ error: 'Missing user id' }, { status: 400 });

	try {
		const [
			user,
			votesCount,
			commentsCount,
			postLikesCount,
			commentLikesCount,
			quizzesCompleted,
			quizzesTaken,
			moderationHistory
		] = await Promise.all([
			prisma.user.findUnique({
				where: { id },
				select: {
					id: true,
					clerkId: true,
					email: true,
					firstName: true,
					lastName: true,
					displayName: true,
					useDisplayName: true,
					avatarUrl: true,
					role: true,
					isAdmin: true,
					isResident: true,
					isBanned: true,
					banType: true,
					banReason: true,
					bannedAt: true,
					banExpiresAt: true,
					bannedById: true,
					createdAt: true,
					updatedAt: true
				}
			}),
			prisma.vote.count({ where: { userId: id } }),
			prisma.comment.count({ where: { authorId: id } }),
			prisma.postLike.count({ where: { userId: id } }),
			prisma.commentLike.count({ where: { userId: id } }),
			prisma.userProgress.count({ where: { userId: id, isCompleted: true } }),
			prisma.userProgress.count({ where: { userId: id } }),
			prisma.moderationLog.findMany({
				where: { targetId: id },
				orderBy: { createdAt: 'desc' },
				take: 50,
				include: {
					admin: {
						select: { firstName: true, lastName: true }
					}
				}
			})
		]);

		if (!user) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		return json({
			user,
			stats: {
				votes: votesCount,
				comments: commentsCount,
				postLikes: postLikesCount,
				commentLikes: commentLikesCount,
				quizzesCompleted,
				quizzesTaken
			},
			moderationHistory
		});
	} catch (err) {
		console.error('Error fetching user detail:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
