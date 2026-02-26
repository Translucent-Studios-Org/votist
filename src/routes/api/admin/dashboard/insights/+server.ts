import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import { getCached, setCache } from '$lib/server/analyticsCache';
import type { RequestHandler } from '@sveltejs/kit';

const CACHE_KEY = 'dashboard:insights';
const TTL_MS = 5 * 60 * 1000;

interface TopContributor {
	id: string;
	firstName: string | null;
	lastName: string | null;
	avatarUrl: string | null;
	votes: number;
	comments: number;
	quizzes: number;
	total: number;
}

interface EngagementCohorts {
	highlyActive: number;
	occasional: number;
	dormant: number;
	neverEngaged: number;
}

interface ResidencyEngagement {
	avgVotes: number;
	avgComments: number;
}

interface EngagementByResidency {
	residents: ResidencyEngagement;
	nonResidents: ResidencyEngagement;
}

interface DropOffFunnel {
	registered: number;
	quizAttempted: number;
	quizPassed: number;
	voted: number;
}

interface InsightsResult {
	topContributors: TopContributor[];
	engagementCohorts: EngagementCohorts;
	engagementByResidency: EngagementByResidency;
	dropOffFunnel: DropOffFunnel;
}

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const cached = getCached<InsightsResult>(CACHE_KEY);
	if (cached) {
		return json(cached);
	}

	try {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

		// Fetch all users with their activity counts
		const [allUsers, recentActivity, dropOffData] = await Promise.all([
			prisma.user.findMany({
				select: {
					id: true,
					firstName: true,
					lastName: true,
					avatarUrl: true,
					isResident: true,
					_count: {
						select: {
							votes: true,
							comments: true,
							userProgress: { where: { isCompleted: true } }
						}
					}
				}
			}),
			// Recent activity for cohort analysis (last 30 days)
			Promise.all([
				prisma.vote.findMany({
					where: { createdAt: { gte: thirtyDaysAgo } },
					select: { userId: true }
				}),
				prisma.comment.findMany({
					where: { createdAt: { gte: thirtyDaysAgo } },
					select: { authorId: true }
				}),
				prisma.userProgress.findMany({
					where: { createdAt: { gte: thirtyDaysAgo } },
					select: { userId: true }
				}),
				// All-time activity for "ever engaged" check
				prisma.vote.findMany({ select: { userId: true }, distinct: ['userId'] }),
				prisma.comment.findMany({ select: { authorId: true }, distinct: ['authorId'] }),
				prisma.userProgress.findMany({ select: { userId: true }, distinct: ['userId'] })
			]),
			// Drop-off funnel
			Promise.all([
				prisma.user.count(),
				prisma.userProgress.groupBy({
					by: ['userId'],
					_count: { userId: true }
				}),
				prisma.userProgress.groupBy({
					by: ['userId'],
					where: { isCompleted: true },
					_count: { userId: true }
				}),
				prisma.vote.groupBy({
					by: ['userId'],
					_count: { userId: true }
				})
			])
		]);

		const [
			recentVotes,
			recentComments,
			recentQuizzes,
			allTimeVoters,
			allTimeCommenters,
			allTimeQuizTakers
		] = recentActivity;

		const [totalUsers, quizAttemptedGroups, quizPassedGroups, votedGroups] = dropOffData;

		// --- Top contributors ---
		const withTotals = allUsers.map((u) => ({
			id: u.id,
			firstName: u.firstName,
			lastName: u.lastName,
			avatarUrl: u.avatarUrl,
			votes: u._count.votes,
			comments: u._count.comments,
			quizzes: u._count.userProgress,
			total: u._count.votes + u._count.comments + u._count.userProgress
		}));
		withTotals.sort((a, b) => b.total - a.total);
		const topContributors: TopContributor[] = withTotals.slice(0, 10);

		// --- Engagement cohorts ---
		// Build per-user action counts in last 30d
		const recentActionCounts = new Map<string, number>();
		for (const v of recentVotes) {
			recentActionCounts.set(v.userId, (recentActionCounts.get(v.userId) || 0) + 1);
		}
		for (const c of recentComments) {
			recentActionCounts.set(c.authorId, (recentActionCounts.get(c.authorId) || 0) + 1);
		}
		for (const q of recentQuizzes) {
			recentActionCounts.set(q.userId, (recentActionCounts.get(q.userId) || 0) + 1);
		}

		// Build all-time engaged user set
		const everEngagedIds = new Set([
			...allTimeVoters.map((v) => v.userId),
			...allTimeCommenters.map((c) => c.authorId),
			...allTimeQuizTakers.map((q) => q.userId)
		]);

		let highlyActive = 0;
		let occasional = 0;
		let dormant = 0;
		let neverEngaged = 0;

		for (const user of allUsers) {
			const recentCount = recentActionCounts.get(user.id) || 0;
			if (recentCount >= 10) {
				highlyActive++;
			} else if (recentCount >= 1) {
				occasional++;
			} else if (everEngagedIds.has(user.id)) {
				dormant++;
			} else {
				neverEngaged++;
			}
		}

		const engagementCohorts: EngagementCohorts = { highlyActive, occasional, dormant, neverEngaged };

		// --- Engagement by residency ---
		const residents = allUsers.filter((u) => u.isResident);
		const nonResidents = allUsers.filter((u) => !u.isResident);

		function avgStat(users: typeof allUsers, key: 'votes' | 'comments'): number {
			if (users.length === 0) return 0;
			const sum = users.reduce((acc, u) => acc + u._count[key], 0);
			return Math.round((sum / users.length) * 10) / 10;
		}

		const engagementByResidency: EngagementByResidency = {
			residents: {
				avgVotes: avgStat(residents, 'votes'),
				avgComments: avgStat(residents, 'comments')
			},
			nonResidents: {
				avgVotes: avgStat(nonResidents, 'votes'),
				avgComments: avgStat(nonResidents, 'comments')
			}
		};

		// --- Drop-off funnel ---
		const dropOffFunnel: DropOffFunnel = {
			registered: totalUsers,
			quizAttempted: quizAttemptedGroups.length,
			quizPassed: quizPassedGroups.length,
			voted: votedGroups.length
		};

		const result: InsightsResult = {
			topContributors,
			engagementCohorts,
			engagementByResidency,
			dropOffFunnel
		};

		setCache(CACHE_KEY, result, TTL_MS);
		return json(result);
	} catch (err) {
		console.error('Error fetching dashboard insights:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
