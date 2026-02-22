import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import { sendWarningEmail } from '$lib/server/email';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const data = await event.request.json();
	const message = data.message?.trim();

	if (!message) {
		return json({ error: 'Warning message is required' }, { status: 400 });
	}

	try {
		const [targetUser, adminUser] = await Promise.all([
			prisma.user.findUnique({
				where: { id: event.params.id },
				select: { id: true, email: true, firstName: true, lastName: true }
			}),
			prisma.user.findUnique({
				where: { clerkId: user.id },
				select: { id: true, firstName: true, lastName: true }
			})
		]);

		if (!targetUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		if (!adminUser) {
			return json({ error: 'Admin user not found' }, { status: 404 });
		}

		const targetName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || 'User';
		const adminName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || 'Admin';

		// Send warning email if user has an email
		let emailSent = false;
		if (targetUser.email) {
			const result = await sendWarningEmail({
				to: targetUser.email,
				userName: targetName,
				message,
				adminName
			});
			emailSent = result.success;
		}

		// Log the moderation action
		await prisma.moderationLog.create({
			data: {
				action: 'WARN',
				targetId: targetUser.id,
				adminId: adminUser.id,
				reason: message,
				metadata: { emailSent, targetEmail: targetUser.email }
			}
		});

		return json({ success: true, emailSent });
	} catch (error) {
		console.error('Error warning user:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
