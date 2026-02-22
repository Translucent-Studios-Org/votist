import { redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import { initializeUserProgress } from '$lib/server/db/initializeUserProgress';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async (event) => {
	try {
		const { user } = await getUser(event);
		if (!user) {
			throw redirect(302, '/sign-in');
		}

		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id },
			select: { id: true }
		});
		if (!dbUser) {
			throw redirect(302, '/sign-in');
		}
		const userId = dbUser.id;

		await initializeUserProgress(userId);

		const quizzes = await prisma.quiz.findMany({
			orderBy: [{ difficulty: 'asc' }, { order: 'asc' }],
			include: {
				userProgress: {
					where: { userId: userId },
					select: { isCompleted: true, quizScore: true }
				}
			}
		});

		const quizzesWithProgress = quizzes.map((quiz) => {
			const userProgress = quiz.userProgress[0];
			let status = 'LOCKED';

			if (userProgress) {
				if (userProgress.isCompleted) {
					status = 'COMPLETED';
				} else {
					status = 'AVAILABLE';
				}
			}

			return {
				id: quiz.id,
				title: quiz.title,
				difficulty: quiz.difficulty,
				order: quiz.order,
				status: status,
				score: userProgress?.quizScore || 0
			};
		});

		return {
			quizzes: quizzesWithProgress
		};
	} catch (error) {
		console.error('Error in quiz page server load:', error);
		throw error;
	}
};
