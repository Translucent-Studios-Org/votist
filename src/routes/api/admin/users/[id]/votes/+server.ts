import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';
import { requireAdmin } from '$lib/server/admin';
import type { RequestHandler } from '@sveltejs/kit';

const PAGE_SIZE = 20;

export const GET: RequestHandler = async (event) => {
	try {
		await requireAdmin(event);
	} catch {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	const { id } = event.params;
	if (!id) return json({ error: 'Missing user id' }, { status: 400 });

	const page = Math.max(1, parseInt(event.url.searchParams.get('page') || '1', 10));
	const pageSize = Math.min(100, parseInt(event.url.searchParams.get('pageSize') || String(PAGE_SIZE), 10));

	try {
		const [votes, total] = await Promise.all([
			prisma.vote.findMany({
				where: { userId: id },
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
				select: {
					id: true,
					createdAt: true,
					option: {
						select: {
							id: true,
							text: true,
							poll: {
								select: { question: true }
							}
						}
					},
					post: {
						select: { id: true, title: true }
					}
				}
			}),
			prisma.vote.count({ where: { userId: id } })
		]);

		const totalPages = Math.ceil(total / pageSize);

		const formatted = votes.map((v) => ({
			id: v.id,
			date: v.createdAt.toISOString(),
			pollQuestion: v.option?.poll?.question ?? null,
			optionText: v.option?.text ?? null,
			postId: v.post?.id ?? null,
			postTitle: v.post?.title ?? null
		}));

		return json({ votes: formatted, total, page, pageSize, totalPages });
	} catch (err) {
		console.error('Error fetching user votes:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
