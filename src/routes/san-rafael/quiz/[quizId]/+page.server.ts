import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';

export const load: ServerLoad = async (event) => {
	const quizId = event.params.quizId;
	if (!quizId) {
		throw error(404, 'Quiz not found');
	}

	// Check if user already completed this quiz
	let alreadyCompleted = false;
	const { user } = await getUser(event);
	if (user) {
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id },
			select: { id: true }
		});
		if (dbUser) {
			const progress = await prisma.userProgress.findUnique({
				where: {
					userId_quizId: { userId: dbUser.id, quizId }
				},
				select: { isCompleted: true }
			});
			alreadyCompleted = progress?.isCompleted ?? false;
		}
	}

	const quiz = await prisma.quiz.findUnique({
		where: { id: quizId },
		include: {
			questions: {
				orderBy: { createdAt: 'asc' }
			}
		}
	});

	if (!quiz) {
		throw error(404, 'Quiz not found');
	}

	// Normalize Question.options (JSON) and correctAnswer (JSON | null)
	const normalized = {
		...quiz,
		questions: quiz.questions.map((q: any) => ({
			...q,
			options: Array.isArray(q.options)
				? q.options
				: q.options && typeof q.options === 'object'
					? Object.values(q.options)
					: [],
			correctAnswer:
				q.correctAnswer &&
				typeof q.correctAnswer === 'object' &&
				Object.keys(q.correctAnswer).length > 0
					? q.correctAnswer
					: null
		}))
	};

	return { quiz: normalized, alreadyCompleted };
};
