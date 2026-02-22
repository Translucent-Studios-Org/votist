import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const body = await event.request.json();
	const { quizId, userId } = body;

	if (!quizId) {
		return json({ error: 'quizId is required' }, { status: 400 });
	}

	try {
		const where: { quizId: string; userId?: string } = { quizId };
		if (userId) {
			where.userId = userId;
		}

		const result = await prisma.userProgress.deleteMany({ where });

		return json({ success: true, count: result.count });
	} catch (error) {
		console.error('Error resetting quiz progress:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
