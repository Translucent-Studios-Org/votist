import { error } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
import { prisma } from '$lib/server/db/prisma';
import type { RequestEvent } from '@sveltejs/kit';

export async function requireAdmin(event: RequestEvent) {
	const { user } = await getUser(event);
	if (!user || user.publicMetadata?.role !== 'admin') {
		throw error(403, 'Forbidden');
	}
	const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
	if (!dbUser) {
		throw error(404, 'Admin user not found');
	}
	return { user, dbUser };
}
