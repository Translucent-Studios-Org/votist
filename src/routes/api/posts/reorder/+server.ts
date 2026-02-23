import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
import { prisma } from '$lib/server/db/prisma';

// PUT /api/posts/reorder - Update sort order for posts
export const PUT: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Admin access required' }, { status: 403 });
	}

	const data = await event.request.json();

	if (!Array.isArray(data.orders)) {
		return json({ error: 'orders array required' }, { status: 400 });
	}

	try {
		await prisma.$transaction(
			data.orders.map((item: { id: string; sortOrder: number }) =>
				prisma.post.update({
					where: { id: item.id },
					data: { sortOrder: item.sortOrder }
				})
			)
		);

		return json({ success: true });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};
