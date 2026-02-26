import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import { getCached, setCache } from '$lib/server/analyticsCache';
import type { RequestHandler } from '@sveltejs/kit';

const CACHE_KEY = 'dashboard:growth';
const TTL_MS = 5 * 60 * 1000;

interface DailyCount {
	date: string;
	count: number;
}

interface WeeklyCount {
	week: string;
	count: number;
}

interface DailyEngagement {
	date: string;
	votes: number;
	comments: number;
}

interface GrowthResult {
	userGrowthDaily: DailyCount[];
	userGrowthWeekly: WeeklyCount[];
	engagementDaily: DailyEngagement[];
}

function getISOWeek(date: Date): string {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const cached = getCached<GrowthResult>(CACHE_KEY);
	if (cached) {
		return json(cached);
	}

	try {
		const now = Date.now();
		const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
		const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);

		const [usersLast30d, usersLast90d, votesLast30d, commentsLast30d] = await Promise.all([
			prisma.user.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { createdAt: true }
			}),
			prisma.user.findMany({
				where: { createdAt: { gte: ninetyDaysAgo } },
				select: { createdAt: true }
			}),
			prisma.vote.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { createdAt: true }
			}),
			prisma.comment.findMany({
				where: { createdAt: { gte: thirtyDaysAgo } },
				select: { createdAt: true }
			})
		]);

		// User growth - daily (last 30 days)
		const dailyUserCounts: Record<string, number> = {};
		for (const u of usersLast30d) {
			const dateKey = u.createdAt.toISOString().split('T')[0];
			dailyUserCounts[dateKey] = (dailyUserCounts[dateKey] || 0) + 1;
		}
		const userGrowthDaily: DailyCount[] = Object.entries(dailyUserCounts)
			.map(([date, count]) => ({ date, count }))
			.sort((a, b) => b.date.localeCompare(a.date));

		// User growth - weekly (last 90 days)
		const weeklyUserCounts: Record<string, number> = {};
		for (const u of usersLast90d) {
			const weekKey = getISOWeek(u.createdAt);
			weeklyUserCounts[weekKey] = (weeklyUserCounts[weekKey] || 0) + 1;
		}
		const userGrowthWeekly: WeeklyCount[] = Object.entries(weeklyUserCounts)
			.map(([week, count]) => ({ week, count }))
			.sort((a, b) => b.week.localeCompare(a.week));

		// Engagement daily (votes + comments, last 30 days)
		const dailyVotes: Record<string, number> = {};
		for (const v of votesLast30d) {
			const dateKey = v.createdAt.toISOString().split('T')[0];
			dailyVotes[dateKey] = (dailyVotes[dateKey] || 0) + 1;
		}

		const dailyComments: Record<string, number> = {};
		for (const c of commentsLast30d) {
			const dateKey = c.createdAt.toISOString().split('T')[0];
			dailyComments[dateKey] = (dailyComments[dateKey] || 0) + 1;
		}

		const engagementDates = new Set([...Object.keys(dailyVotes), ...Object.keys(dailyComments)]);
		const engagementDaily: DailyEngagement[] = Array.from(engagementDates)
			.map((date) => ({
				date,
				votes: dailyVotes[date] || 0,
				comments: dailyComments[date] || 0
			}))
			.sort((a, b) => b.date.localeCompare(a.date));

		const result: GrowthResult = {
			userGrowthDaily,
			userGrowthWeekly,
			engagementDaily
		};

		setCache(CACHE_KEY, result, TTL_MS);
		return json(result);
	} catch (err) {
		console.error('Error fetching dashboard growth:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
