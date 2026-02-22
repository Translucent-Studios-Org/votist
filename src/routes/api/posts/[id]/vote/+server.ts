import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth';
import { userMeetsQuizRequirement, userMeetsPostQuizGate } from '$lib/server/quizPermissions';
import { checkUserBanStatus } from '$lib/server/moderation';
import { prisma } from '$lib/server/db/prisma';

// POST /api/posts/[id]/vote - Vote on a poll option
export const POST: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const data = await event.request.json();

	try {
		// Look up internal DB user by Clerk ID
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id }
		});

		if (!dbUser) {
			return json({ error: 'User not found in database' }, { status: 404 });
		}

		// Check if user is banned
		const banStatus = await checkUserBanStatus(dbUser.id);
		if (banStatus.isBanned) {
			return json({ error: 'Your account has been suspended', reason: banStatus.reason }, { status: 403 });
		}

		// Verify the post and poll option exist
		const post = await prisma.post.findUnique({
			where: { id: event.params.id },
			include: {
				poll: {
					include: {
						options: true
					}
				}
			}
		});

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (!post.poll) {
			return json({ error: 'Post does not have a poll' }, { status: 400 });
		}

		const option = post.poll.options.find((opt) => opt.id === data.optionId);
		if (!option) {
			return json({ error: 'Poll option not found' }, { status: 404 });
		}

		// Check if poll has ended
		if (post.poll.endsAt && new Date() > post.poll.endsAt) {
			return json({ error: 'Poll has ended' }, { status: 400 });
		}

		// Check if user meets quiz difficulty requirement
		if (post.poll.requiredDifficulty) {
			const meetsRequirement = await userMeetsQuizRequirement(
				dbUser.id,
				post.poll.requiredDifficulty
			);

			if (!meetsRequirement) {
				return json(
					{
						error: 'Quiz requirement not met',
						requiredDifficulty: post.poll.requiredDifficulty,
						message: `You must complete at least one ${post.poll.requiredDifficulty} level quiz to vote on this poll.`
					},
					{ status: 403 }
				);
			}
		}

		// Check if user meets post-level quiz gate
		const gateResult = await userMeetsPostQuizGate(dbUser.id, post);
		if (!gateResult.allowed) {
			return json(
				{
					error: 'Quiz gate requirement not met',
					quizGateType: post.quizGateType,
					quizGateDifficulty: post.quizGateDifficulty,
					message: gateResult.message
				},
				{ status: 403 }
			);
		}

		// Use transaction to handle vote update/creation atomically
		const result = await prisma.$transaction(async (tx) => {
			// Check if user already voted
			const existingVote = await tx.vote.findUnique({
				where: {
					userId_postId: {
						userId: dbUser.id,
						postId: event.params.id
					}
				}
			});

			if (existingVote) {
				// User is changing their vote
				if (existingVote.optionId === data.optionId) {
					// Same option selected, no change needed
					return await tx.poll.findUnique({
						where: { id: post.poll!.id },
						include: {
							options: true
						}
					});
				}

				// Remove vote from previous option
				await tx.pollOption.update({
					where: { id: existingVote.optionId },
					data: { votes: { decrement: 1 } }
				});

				// Update vote to new option
				await tx.vote.update({
					where: { id: existingVote.id },
					data: { optionId: data.optionId }
				});

				// Add vote to new option
				await tx.pollOption.update({
					where: { id: data.optionId },
					data: { votes: { increment: 1 } }
				});

				// Total votes don't change when switching
			} else {
				// Create new vote
				await tx.vote.create({
					data: {
						userId: dbUser.id,
						postId: event.params.id,
						optionId: data.optionId
					}
				});

				// Increment votes for the selected option
				await tx.pollOption.update({
					where: { id: data.optionId },
					data: { votes: { increment: 1 } }
				});

				// Update total votes in poll
				await tx.poll.update({
					where: { id: post.poll!.id },
					data: { totalVotes: { increment: 1 } }
				});
			}

			// Return updated poll data
			return await tx.poll.findUnique({
				where: { id: post.poll!.id },
				include: {
					options: true
				}
			});
		});

		return json({
			success: true,
			poll: result,
			userVote: data.optionId
		});
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 400 });
	}
};

// DELETE /api/posts/[id]/vote - Remove user's vote
export const DELETE: RequestHandler = async (event) => {
	const { user, isAuthenticated } = await getUser(event);

	if (!isAuthenticated) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Look up internal DB user by Clerk ID
		const dbUser = await prisma.user.findUnique({
			where: { clerkId: user.id }
		});

		if (!dbUser) {
			return json({ error: 'User not found in database' }, { status: 404 });
		}

		// Find user's vote
		const vote = await prisma.vote.findUnique({
			where: {
				userId_postId: {
					userId: dbUser.id,
					postId: event.params.id
				}
			},
			include: {
				option: true
			}
		});

		if (!vote) {
			return json({ error: 'No vote found' }, { status: 404 });
		}

		// Use transaction to handle vote removal atomically
		await prisma.$transaction(async (tx) => {
			// Remove the vote
			await tx.vote.delete({
				where: { id: vote.id }
			});

			// Decrement votes for the option
			await tx.pollOption.update({
				where: { id: vote.optionId },
				data: { votes: { decrement: 1 } }
			});

			// Decrement total votes in poll
			await tx.poll.update({
				where: { postId: event.params.id },
				data: { totalVotes: { decrement: 1 } }
			});
		});

		return json({ message: 'Vote removed successfully' });
	} catch (error: unknown) {
		let message = 'Unknown error';
		if (error && typeof error === 'object' && 'message' in error) {
			message = (error as any).message;
		}
		return json({ error: message }, { status: 500 });
	}
};
