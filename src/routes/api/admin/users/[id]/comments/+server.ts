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
		const [comments, total] = await Promise.all([
			prisma.comment.findMany({
				where: { authorId: id },
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
				select: {
					id: true,
					content: true,
					createdAt: true,
					post: {
						select: { id: true, title: true }
					},
					_count: {
						select: { commentLikes: true }
					}
				}
			}),
			prisma.comment.count({ where: { authorId: id } })
		]);

		const totalPages = Math.ceil(total / pageSize);

		const formatted = comments.map((c) => ({
			id: c.id,
			content: c.content,
			date: c.createdAt.toISOString(),
			postId: c.post?.id ?? null,
			postTitle: c.post?.title ?? null,
			likesCount: c._count.commentLikes
		}));

		return json({ comments: formatted, total, page, pageSize, totalPages });
	} catch (err) {
		console.error('Error fetching user comments:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
