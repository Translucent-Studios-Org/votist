import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import type { RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { id } = event.params;
	if (!id) return json({ error: 'Missing user id' }, { status: 400 });

	try {
		const targetUser = await prisma.user.findUnique({
			where: { id },
			select: { id: true, isResident: true }
		});

		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const newIsResident = !targetUser.isResident;

		await prisma.user.update({
			where: { id },
			data: { isResident: newIsResident }
		});

		return json({ success: true, isResident: newIsResident });
	} catch (err) {
		console.error('Error toggling resident status:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
