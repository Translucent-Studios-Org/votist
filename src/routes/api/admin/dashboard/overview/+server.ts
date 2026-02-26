import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import { getCached, setCache } from '$lib/server/analyticsCache';
import type { RequestHandler } from '@sveltejs/kit';

interface OverviewResult {
	totalUsers: number;
	activeUsers7d: number;
	activeUsers30d: number;
	totalVotes: number;
	totalComments: number;
	totalQuizCompletions: number;
	totalBannedUsers: number;
	residentCount: number;
	nonResidentCount: number;
	newUsersThisWeek: number;
	newUsersThisMonth: number;
}

const CACHE_KEY = 'dashboard:overview';
const TTL_MS = 5 * 60 * 1000;

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const cached = getCached<OverviewResult>(CACHE_KEY);
	if (cached) {
		return json(cached);
	}

	try {
		const now = Date.now();
		const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
		const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

		// Parallel fetch for active user computation and counts
		const [
			totalUsers,
			totalVotes,
			totalComments,
			totalQuizCompletions,
			totalBannedUsers,
			residentCount,
			nonResidentCount,
			newUsersThisWeek,
			newUsersThisMonth,
			// Active users 7d
			recentVoters7d,
			recentCommenters7d,
			recentQuizTakers7d,
			// Active users 30d
			recentVoters30d,
			recentCommenters30d,
			recentQuizTakers30d
		] = await Promise.all([
			prisma.user.count(),
			prisma.vote.count(),
			prisma.comment.count(),
			prisma.userProgress.count({ where: { isCompleted: true } }),
			prisma.user.count({ where: { isBanned: true } }),
			prisma.user.count({ where: { isResident: true } }),
			prisma.user.count({ where: { isResident: false } }),
			prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
			prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
			// 7d active
			prisma.vote.findMany({
				where: { createdAt: { gte: sevenDaysAgo } },
				select: { userId: true },
				distinct: ['userId']
			}),
			prisma.comment.findMany({
				where: { createdAt: { gte: sevenDaysAgo } },
				select: { authorId: true },
				distinct: ['authorId']
			}),
			prisma.userProgress.findMany({
				where: { createdAt: { gte: sevenDaysAgo } },
				select: { userId: true },
				distinct: ['userId']
			}),
			// 30d active
			prisma.vote.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { userId: true },
				distinct: ['userId']
			}),
			prisma.comment.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { authorId: true },
				distinct: ['authorId']
			}),
			prisma.userProgress.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { userId: true },
				distinct: ['userId']
			})
		]);

		const activeUserIds7d = new Set([
			...recentVoters7d.map((v) => v.userId),
			...recentCommenters7d.map((c) => c.authorId),
			...recentQuizTakers7d.map((q) => q.userId)
		]);

		const activeUserIds30d = new Set([
			...recentVoters30d.map((v) => v.userId),
			...recentCommenters30d.map((c) => c.authorId),
			...recentQuizTakers30d.map((q) => q.userId)
		]);

		const result = {
			totalUsers,
			activeUsers7d: activeUserIds7d.size,
			activeUsers30d: activeUserIds30d.size,
			totalVotes,
			totalComments,
			totalQuizCompletions,
			totalBannedUsers,
			residentCount,
			nonResidentCount,
			newUsersThisWeek,
			newUsersThisMonth
		};

		setCache(CACHE_KEY, result, TTL_MS);
		return json(result);
	} catch (err) {
		console.error('Error fetching dashboard overview:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
