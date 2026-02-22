import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { getUser } from '$lib/server/auth';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async (event) => {
	const { user } = await getUser(event);

	if (!user || user.publicMetadata?.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const filter = event.url.searchParams.get('filter') || 'banned';
	const search = event.url.searchParams.get('q')?.trim();

	try {
		if (filter === 'log') {
			// Return recent moderation log entries
			const logs = await prisma.moderationLog.findMany({
				orderBy: { createdAt: 'desc' },
				take: 50,
				include: {
					target: {
						select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
					},
					admin: {
						select: { id: true, firstName: true, lastName: true }
					}
				}
			});

			return json({ logs });
		}

		// Build where clause for banned/suspended users
		const where: Record<string, unknown> = { isBanned: true };

		if (filter === 'suspended') {
			where.banType = 'temporary';
		} else if (filter === 'permanent') {
			where.banType = 'permanent';
		}

		if (search) {
			where.OR = [
				{ email: { contains: search, mode: 'insensitive' } },
				{ firstName: { contains: search, mode: 'insensitive' } },
				{ lastName: { contains: search, mode: 'insensitive' } }
			];
		}

		const [users, recentLogs] = await Promise.all([
			prisma.user.findMany({
				where,
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					avatarUrl: true,
					isBanned: true,
					banType: true,
					banReason: true,
					bannedAt: true,
					banExpiresAt: true,
					bannedById: true
				},
				orderBy: { bannedAt: 'desc' }
			}),
			prisma.moderationLog.findMany({
				orderBy: { createdAt: 'desc' },
				take: 20,
				include: {
					target: {
						select: { id: true, firstName: true, lastName: true, email: true }
					},
					admin: {
						select: { id: true, firstName: true, lastName: true }
					}
				}
			})
		]);

		return json({ users, recentLogs });
	} catch (error) {
		console.error('Error fetching moderation data:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
