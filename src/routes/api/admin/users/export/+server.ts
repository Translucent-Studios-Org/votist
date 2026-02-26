import { requireAdmin } from '$lib/server/admin';
import { prisma } from '$lib/server/db/prisma';
import type { RequestHandler } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';

function escapeCsvField(value: string | null | undefined): string {
	if (value === null || value === undefined) return '';
	const str = String(value);
	// If it contains commas, quotes, or newlines, wrap in quotes and escape inner quotes
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return new Response(JSON.stringify({ error: 'Forbidden' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const params = event.url.searchParams;
	const q = params.get('q')?.trim();
	const role = params.get('role');
	const resident = params.get('resident');
	const banned = params.get('banned');
	const tier = params.get('tier');

	const where: Prisma.UserWhereInput = {};

	if (q) {
		where.OR = [
			{ email: { contains: q, mode: 'insensitive' } },
			{ firstName: { contains: q, mode: 'insensitive' } },
			{ lastName: { contains: q, mode: 'insensitive' } },
			{ displayName: { contains: q, mode: 'insensitive' } }
		];
	}

	if (role === 'admin') {
		where.isAdmin = true;
	} else if (role === 'visitor') {
		where.isAdmin = false;
	}

	if (resident === 'true') {
		where.isResident = true;
	} else if (resident === 'false') {
		where.isResident = false;
	}

	if (banned === 'true') {
		where.isBanned = true;
	} else if (banned === 'false') {
		where.isBanned = false;
	}

	if (tier === 'none') {
		where.userProgress = { none: { isCompleted: true } };
	} else if (tier && ['VOTIST', 'SCHOLAR', 'MENTOR'].includes(tier)) {
		where.userProgress = {
			some: {
				isCompleted: true,
				quiz: { difficulty: tier as 'VOTIST' | 'SCHOLAR' | 'MENTOR' }
			}
		};
	}

	try {
		const users = await prisma.user.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				email: true,
				firstName: true,
				lastName: true,
				displayName: true,
				useDisplayName: true,
				role: true,
				isAdmin: true,
				isResident: true,
				isBanned: true,
				banType: true,
				createdAt: true,
				_count: {
					select: {
						votes: true,
						comments: true,
						userProgress: true
					}
				}
			}
		});

		const headers = ['Name', 'Email', 'Role', 'Resident', 'Join Date', 'Votes', 'Comments', 'Quizzes', 'Status'];
		const rows = users.map((u) => {
			const displayName = u.useDisplayName && u.displayName
				? u.displayName
				: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '';

			const status = u.isBanned
				? u.banType === 'temporary' ? 'Suspended' : 'Banned'
				: 'Active';

			return [
				escapeCsvField(displayName),
				escapeCsvField(u.email),
				escapeCsvField(u.isAdmin ? 'Admin' : 'Visitor'),
				escapeCsvField(u.isResident ? 'Yes' : 'No'),
				escapeCsvField(u.createdAt.toISOString().split('T')[0]),
				escapeCsvField(String(u._count.votes)),
				escapeCsvField(String(u._count.comments)),
				escapeCsvField(String(u._count.userProgress)),
				escapeCsvField(status)
			].join(',');
		});

		const csv = [headers.join(','), ...rows].join('\r\n');

		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': 'attachment; filename="users-export.csv"'
			}
		});
	} catch (err) {
		console.error('Error exporting users CSV:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
