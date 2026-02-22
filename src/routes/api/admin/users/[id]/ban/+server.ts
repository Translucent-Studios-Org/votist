import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import { sendBanNotificationEmail } from '$lib/server/email';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const data = await event.request.json();
	const banType = data.type as 'permanent' | 'temporary';
	const duration = data.duration as number | undefined;
	const reason = data.reason?.trim();

	if (!banType || !['permanent', 'temporary'].includes(banType)) {
		return json({ error: 'Invalid ban type' }, { status: 400 });
	}

	if (!reason) {
		return json({ error: 'Reason is required' }, { status: 400 });
	}

	if (banType === 'temporary' && (!duration || duration < 1)) {
		return json({ error: 'Duration must be at least 1 day for temporary suspensions' }, { status: 400 });
	}

	try {
		const [targetUser, adminUser] = await Promise.all([
			prisma.user.findUnique({
				where: { id: event.params.id },
				select: { id: true, email: true, firstName: true, lastName: true, isAdmin: true, isBanned: true }
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

		if (targetUser.isAdmin) {
			return json({ error: 'Cannot ban an admin user' }, { status: 400 });
		}

		if (targetUser.isBanned) {
			return json({ error: 'User is already banned' }, { status: 400 });
		}

		const banExpiresAt =
			banType === 'temporary' && duration
				? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
				: null;

		// Ban the user
		await prisma.user.update({
			where: { id: targetUser.id },
			data: {
				isBanned: true,
				banType,
				banReason: reason,
				bannedAt: new Date(),
				banExpiresAt,
				bannedById: adminUser.id
			}
		});

		const targetName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || 'User';

		// Send notification email
		let emailSent = false;
		if (targetUser.email) {
			const result = await sendBanNotificationEmail({
				to: targetUser.email,
				userName: targetName,
				reason,
				banType,
				duration
			});
			emailSent = result.success;
		}

		// Log the moderation action
		await prisma.moderationLog.create({
			data: {
				action: banType === 'temporary' ? 'SUSPEND' : 'BAN',
				targetId: targetUser.id,
				adminId: adminUser.id,
				reason,
				metadata: { banType, duration, banExpiresAt, emailSent }
			}
		});

		return json({ success: true, emailSent });
	} catch (error) {
		console.error('Error banning user:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
