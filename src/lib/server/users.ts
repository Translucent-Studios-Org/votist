import { prisma } from '$lib/server/db/prisma';

export interface UserProfile {
	id: string;
	email: string | null;
	firstName: string | null;
	lastName: string | null;
	avatarUrl: string | null;
	role: string;
	isAdmin: boolean;
	isResident: boolean;
	createdAt: Date;
}

export interface TransformUserData {
	name: string;
	avatar: string | null;
	username: string;
	isVerified: boolean;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			avatarUrl: true,
			role: true,
			isAdmin: true,
			isResident: true,
			createdAt: true
		}
	});

	return user;
}

export function formatDisplayName(
	firstName: string | null,
	lastName: string | null,
	displayName?: string | null,
	useDisplayName?: boolean
): string {
	if (useDisplayName && displayName) return displayName;
	if (!firstName && !lastName) return 'Anonymous';
	if (!lastName) return firstName!;
	if (!firstName) return lastName;
	return `${firstName} ${lastName.charAt(0)}.`;
}

export async function transformUserData(userId: string): Promise<TransformUserData> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			firstName: true,
			lastName: true,
			displayName: true,
			useDisplayName: true,
			avatarUrl: true,
			email: true
		}
	});

	if (!user) {
		return {
			name: 'Unknown User',
			avatar: null,
			username: 'unknown',
			isVerified: false
		};
	}

	return {
		name: formatDisplayName(user.firstName, user.lastName, user.displayName, user.useDisplayName),
		avatar: user.avatarUrl,
		username: user.email?.split('@')[0] ?? 'user',
		isVerified: true
	};
}
