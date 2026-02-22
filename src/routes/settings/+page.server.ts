import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db/prisma';

export const load = (async ({ locals }) => {
	const { userId } = await locals.auth();
	if (!userId) {
		throw redirect(302, '/sign-in');
	}

	const dbUser = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			displayName: true,
			useDisplayName: true,
			avatarUrl: true,
			role: true,
			isResident: true
		}
	});

	if (!dbUser) {
		throw redirect(302, '/');
	}

	return { settings: dbUser };
}) satisfies PageServerLoad;

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const { userId } = await locals.auth();
		if (!userId) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const firstName = formData.get('firstName') as string | null;
		const lastName = formData.get('lastName') as string | null;
		const displayName = formData.get('displayName') as string | null;
		const useDisplayName = formData.get('useDisplayName') === 'on';
		const avatarUrl = formData.get('avatarUrl') as string | null;
		const isResident = formData.get('isResident') === 'on';

		if (firstName && firstName.length > 100) {
			return fail(400, { error: 'First name is too long' });
		}
		if (lastName && lastName.length > 100) {
			return fail(400, { error: 'Last name is too long' });
		}
		if (displayName && displayName.length > 100) {
			return fail(400, { error: 'Display name is too long' });
		}
		if (avatarUrl && avatarUrl.length > 500) {
			return fail(400, { error: 'Avatar URL is too long' });
		}

		try {
			await prisma.user.update({
				where: { clerkId: userId },
				data: {
					firstName: firstName?.trim() || null,
					lastName: lastName?.trim() || null,
					displayName: displayName?.trim() || null,
					useDisplayName,
					avatarUrl: avatarUrl?.trim() || null,
					isResident
				}
			});

			return { success: true };
		} catch (err) {
			console.error('Error updating profile:', err);
			return fail(500, { error: 'Failed to update profile' });
		}
	}
};
