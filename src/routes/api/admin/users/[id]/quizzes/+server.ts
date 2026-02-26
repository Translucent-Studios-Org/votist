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
		const progress = await prisma.userProgress.findMany({
			where: { userId: id },
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				quizScore: true,
				isCompleted: true,
				completedAt: true,
				createdAt: true,
				quiz: {
					select: {
						id: true,
						title: true,
						difficulty: true,
						passingScore: true
					}
				}
			}
		});

		const formatted = progress.map((p) => ({
			id: p.id,
			quizId: p.quiz?.id ?? null,
			quizTitle: p.quiz?.title ?? null,
			difficulty: p.quiz?.difficulty ?? null,
			score: p.quizScore,
			passingScore: p.quiz?.passingScore ?? null,
			isCompleted: p.isCompleted,
			completedAt: p.completedAt?.toISOString() ?? null,
			startedAt: p.createdAt.toISOString()
		}));

		return json({ quizzes: formatted, total: formatted.length });
	} catch (err) {
		console.error('Error fetching user quizzes:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
