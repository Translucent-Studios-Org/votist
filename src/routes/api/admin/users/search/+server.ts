import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const q = event.url.searchParams.get('q')?.trim();
	if (!q) {
		return json([]);
	}

	try {
		const users = await prisma.user.findMany({
			where: {
				OR: [
					{ email: { contains: q, mode: 'insensitive' } },
					{ firstName: { contains: q, mode: 'insensitive' } },
					{ lastName: { contains: q, mode: 'insensitive' } }
				]
			},
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true
			},
			take: 10
		});

		return json(users);
	} catch (error) {
		console.error('Error searching users:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
