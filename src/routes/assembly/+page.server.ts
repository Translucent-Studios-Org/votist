import { prisma } from '$lib/server/db/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const assemblies = await prisma.assembly.findMany({
		where: { status: 'active' },
		orderBy: { createdAt: 'desc' }
	});

	// Fallback if no assemblies exist in DB yet
	if (assemblies.length === 0) {
		return {
			assemblies: [
				{
					id: 'san-rafael',
					title: 'San Rafael, CA',
					description: 'Housing and the Future',
					topic: 'housing',
					location: 'San Rafael, California',
					status: 'active'
				}
			]
		};
	}

	return { assemblies };
};
