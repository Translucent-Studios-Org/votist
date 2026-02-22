import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
import { checkUserBanStatus } from '$lib/server/moderation';
import { prisma } from '$lib/server/db/prisma';

const EDIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// PUT /api/comments/[id] - Update a comment (within 2-minute window)
export const PUT: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await event.request.json();
	const content = data.content?.trim();

	if (!content || content.length > 2000) {
		return json({ error: 'Invalid content' }, { status: 400 });
	}

	try {
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id },
			select: { id: true }
		});

		if (!dbUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		// Check if user is banned
		const banStatus = await checkUserBanStatus(dbUser.id);
		if (banStatus.isBanned) {
			return json({ error: 'Your account has been suspended', reason: banStatus.reason }, { status: 403 });
		}

		const existingComment = await prisma.comment.findUnique({
			where: { id: event.params.id },
			select: { authorId: true, createdAt: true }
		});

		if (!existingComment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		const isOwner = existingComment.authorId === dbUser.id;
		const isAdmin = user.publicMetadata?.role === 'admin';

		if (!isOwner && !isAdmin) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// Enforce 2-minute edit window for non-admins
		if (!isAdmin) {
			const elapsed = Date.now() - existingComment.createdAt.getTime();
			if (elapsed > EDIT_WINDOW_MS) {
				return json({ error: 'Edit window has expired (2 minutes)' }, { status: 403 });
			}
		}

		const comment = await prisma.comment.update({
			where: { id: event.params.id },
			data: { content }
		});

		return json({
			comment: {
				id: comment.id,
				content: comment.content
			}
		});
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};

// DELETE /api/comments/[id] - Delete a comment
export const DELETE: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated || !user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id },
			select: { id: true }
		});

		if (!dbUser) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		const existingComment = await prisma.comment.findUnique({
			where: { id: event.params.id },
			select: { authorId: true }
		});

		if (!existingComment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		const isOwner = existingComment.authorId === dbUser.id;
		const isAdmin = user.publicMetadata?.role === 'admin';

		if (!isOwner && !isAdmin) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		// Delete comment and its replies (cascade should handle replies)
		await prisma.comment.delete({
			where: { id: event.params.id }
		});

		// Log admin deletion as moderation action
		if (isAdmin && !isOwner) {
			await prisma.moderationLog.create({
				data: {
					action: 'DELETE_COMMENT',
					targetId: existingComment.authorId,
					adminId: dbUser.id,
					reason: 'Comment deleted by admin',
					metadata: { commentId: event.params.id }
				}
			});
		}

		return json({ success: true });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};
