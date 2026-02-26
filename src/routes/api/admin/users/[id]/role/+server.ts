import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import { clerkClient } from 'svelte-clerk/server';
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
			select: { id: true, clerkId: true, isAdmin: true }
		});

		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const newIsAdmin = !targetUser.isAdmin;
		const newRole = newIsAdmin ? 'admin' : 'visitor';

		await prisma.user.update({
			where: { id },
			data: { isAdmin: newIsAdmin, role: newRole }
		});

		if (targetUser.clerkId) {
			await clerkClient.users.updateUserMetadata(targetUser.clerkId, {
				publicMetadata: { role: newRole }
			});
		}

		return json({ success: true, isAdmin: newIsAdmin, role: newRole });
	} catch (err) {
		console.error('Error toggling user role:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
