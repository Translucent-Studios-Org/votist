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

	const page = Math.max(1, parseInt(event.url.searchParams.get('page') || '1', 10));
	const pageSize = Math.min(100, Math.max(1, parseInt(event.url.searchParams.get('pageSize') || '20', 10)));

	try {
		const [votes, comments, quizCompletions, postLikes] = await Promise.all([
			prisma.vote.findMany({
				where: { userId: id },
				orderBy: { createdAt: 'desc' },
				take: 200,
				select: {
					id: true,
					createdAt: true,
					option: { select: { text: true } },
					post: { select: { id: true, title: true } }
				}
			}),
			prisma.comment.findMany({
				where: { authorId: id },
				orderBy: { createdAt: 'desc' },
				take: 200,
				select: {
					id: true,
					content: true,
					createdAt: true,
					post: { select: { id: true, title: true } }
				}
			}),
			prisma.userProgress.findMany({
				where: { userId: id, isCompleted: true },
				orderBy: { completedAt: 'desc' },
				take: 200,
				select: {
					id: true,
					quizScore: true,
					completedAt: true,
					quiz: { select: { id: true, title: true, difficulty: true } }
				}
			}),
			prisma.postLike.findMany({
				where: { userId: id },
				orderBy: { createdAt: 'desc' },
				take: 200,
				select: {
					id: true,
					createdAt: true,
					post: { select: { id: true, title: true } }
				}
			})
		]);

		type ActivityItem = {
			type: 'vote' | 'comment' | 'quiz' | 'like';
			date: string;
			details: Record<string, unknown>;
		};

		const timeline: ActivityItem[] = [
			...votes.map((v) => ({
				type: 'vote' as const,
				date: v.createdAt.toISOString(),
				details: {
					voteId: v.id,
					optionText: v.option?.text ?? null,
					postId: v.post?.id ?? null,
					postTitle: v.post?.title ?? null
				}
			})),
			...comments.map((c) => ({
				type: 'comment' as const,
				date: c.createdAt.toISOString(),
				details: {
					commentId: c.id,
					content: c.content.slice(0, 200),
					postId: c.post?.id ?? null,
					postTitle: c.post?.title ?? null
				}
			})),
			...quizCompletions.map((q) => ({
				type: 'quiz' as const,
				date: (q.completedAt ?? q.completedAt)!.toISOString(),
				details: {
					progressId: q.id,
					quizId: q.quiz?.id ?? null,
					quizTitle: q.quiz?.title ?? null,
					difficulty: q.quiz?.difficulty ?? null,
					score: q.quizScore
				}
			})),
			...postLikes.map((l) => ({
				type: 'like' as const,
				date: l.createdAt.toISOString(),
				details: {
					likeId: l.id,
					postId: l.post?.id ?? null,
					postTitle: l.post?.title ?? null
				}
			}))
		];

		// Sort by date descending
		timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		const total = timeline.length;
		const totalPages = Math.ceil(total / pageSize);
		const paginated = timeline.slice((page - 1) * pageSize, page * pageSize);

		return json({ activity: paginated, total, page, pageSize, totalPages });
	} catch (err) {
		console.error('Error fetching user activity:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
