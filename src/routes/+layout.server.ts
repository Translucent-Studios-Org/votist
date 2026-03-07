import type { LayoutServerLoad } from './$types';
import { buildClerkProps } from 'svelte-clerk/server';
import { clerkClient } from 'svelte-clerk/server';
import { prisma } from '$lib/server/db/prisma';

export const load = (async ({ locals }) => {
	const { userId } = await locals.auth();
	const clerkProps = buildClerkProps(locals.auth());

	let userData = null;
	if (userId) {
		const dbSelect = {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			avatarUrl: true,
			role: true,
			isAdmin: true,
			isResident: true,
			createdAt: true
		};

		const [clerkUser, dbUserInitial] = await Promise.all([
			clerkClient.users.getUser(userId),
			prisma.user.findUnique({ where: { clerkId: userId }, select: dbSelect })
		]);

		let dbUser = dbUserInitial;

		if (!dbUser) {
			const email = clerkUser.emailAddresses[0]?.emailAddress;
			const userByEmail = email
				? await prisma.user.findUnique({ where: { email } })
				: null;

			if (userByEmail) {
				await prisma.user.update({
					where: { id: userByEmail.id },
					data: {
						clerkId: userId,
						firstName: clerkUser.firstName ?? userByEmail.firstName,
						lastName: clerkUser.lastName ?? userByEmail.lastName,
						avatarUrl: clerkUser.imageUrl ?? userByEmail.avatarUrl,
						isAdmin: clerkUser.publicMetadata?.role === 'admin'
					}
				});
				dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: dbSelect });
			} else {
				await prisma.user.create({
					data: {
						clerkId: userId,
						email,
						firstName: clerkUser.firstName,
						lastName: clerkUser.lastName,
						avatarUrl: clerkUser.imageUrl,
						isAdmin: clerkUser.publicMetadata?.role === 'admin'
					}
				});
				dbUser = await prisma.user.findUnique({ where: { clerkId: userId }, select: dbSelect });
			}
		}

		userData = {
			fullName:
				dbUser?.firstName && dbUser?.lastName
					? `${dbUser.firstName} ${dbUser.lastName}`
					: clerkUser.firstName && clerkUser.lastName
						? `${clerkUser.firstName} ${clerkUser.lastName}`
						: clerkUser.username || 'Anonymous',
			avatarUrl: dbUser?.avatarUrl || clerkUser.imageUrl || null,
			email: dbUser?.email || clerkUser.emailAddresses[0]?.emailAddress || null,
			firstName: dbUser?.firstName || clerkUser.firstName || null,
			lastName: dbUser?.lastName || clerkUser.lastName || null,
			role: dbUser?.role || (clerkUser.publicMetadata?.role as string) || 'visitor',
			isAdmin: dbUser?.isAdmin ?? false,
			isResident: dbUser?.isResident ?? false,
			dbUserId: dbUser?.id || null,
			createdAt: dbUser?.createdAt?.toISOString() || null
		};
	}

	return {
		clerk: clerkProps,
		user: userData
	};
}) satisfies LayoutServerLoad;
