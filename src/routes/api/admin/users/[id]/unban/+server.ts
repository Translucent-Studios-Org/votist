import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const [targetUser, adminUser] = await Promise.all([
			prisma.user.findUnique({
				where: { id: event.params.id },
				select: { id: true, isBanned: true }
			}),
			prisma.user.findUnique({
				where: { clerkId: user.id },
				select: { id: true }
			})
		]);

		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		if (!adminUser) {
			return json({ error: 'Admin user not found' }, { status: 404 });
		}

		if (!targetUser.isBanned) {
			return json({ error: 'User is not currently banned' }, { status: 400 });
		}

		const data = await event.request.json().catch(() => ({}));
		const reason = data.reason?.trim() || 'Unbanned by admin';

		// Clear ban
		await prisma.user.update({
			where: { id: targetUser.id },
			data: {
				isBanned: false,
				banType: null,
				banReason: null,
				bannedAt: null,
				banExpiresAt: null,
				bannedById: null
			}
		});

		// Log the moderation action
		await prisma.moderationLog.create({
			data: {
				action: 'UNBAN',
				targetId: targetUser.id,
				adminId: adminUser.id,
				reason
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error unbanning user:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
