import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import type { RequestHandler } from '@sveltejs/kit';
import type { Prisma } from '@prisma/client';

const PAGE_SIZE = 25;

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const params = event.url.searchParams;
	const q = params.get('q')?.trim();
	const role = params.get('role'); // 'admin' | 'visitor'
	const resident = params.get('resident'); // 'true' | 'false'
	const banned = params.get('banned'); // 'true' | 'false'
	const tier = params.get('tier'); // 'VOTIST' | 'SCHOLAR' | 'MENTOR' | 'none'
	const sort = params.get('sort') || 'joinDate'; // 'name' | 'joinDate' | 'votes' | 'comments' | 'quizzes'
	const order = (params.get('order') || 'desc') as 'asc' | 'desc';
	const page = Math.max(1, parseInt(params.get('page') || '1', 10));

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

	// Tier filter: find users who completed at least one quiz of the given difficulty
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

	// Build orderBy
	let orderBy: Prisma.UserOrderByWithRelationInput;
	switch (sort) {
		case 'name':
			orderBy = { firstName: order };
			break;
		case 'votes':
			orderBy = { votes: { _count: order } };
			break;
		case 'comments':
			orderBy = { comments: { _count: order } };
			break;
		case 'quizzes':
			orderBy = { userProgress: { _count: order } };
			break;
		case 'joinDate':
		default:
			orderBy = { createdAt: order };
			break;
	}

	try {
		const [users, total] = await Promise.all([
			prisma.user.findMany({
				where,
				orderBy,
				skip: (page - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
					displayName: true,
					useDisplayName: true,
					avatarUrl: true,
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
			}),
			prisma.user.count({ where })
		]);

		const totalPages = Math.ceil(total / PAGE_SIZE);

		return json({
			users,
			total,
			page,
			pageSize: PAGE_SIZE,
			totalPages
		});
	} catch (err) {
		console.error('Error fetching admin users:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
