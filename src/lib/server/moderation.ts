import { prisma } from '$lib/server/db/prisma';

export interface BanCheckResult {
	isBanned: boolean;
	reason?: string;
	banType?: string;
	expiresAt?: Date | null;
}

/**
 * Check if a user is currently banned. Auto-expires temporary bans.
 */
export async function checkUserBanStatus(userId: string): Promise<BanCheckResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			isBanned: true,
			banType: true,
			banReason: true,
			banExpiresAt: true
		}
	});

	if (!user || !user.isBanned) {
		return { isBanned: false };
	}

	// Auto-expire temporary bans
	if (user.banType === 'temporary' && user.banExpiresAt && new Date() > user.banExpiresAt) {
		await prisma.user.update({
			where: { id: userId },
			data: {
				isBanned: false,
				banType: null,
				banReason: null,
				bannedAt: null,
				banExpiresAt: null,
				bannedById: null
			}
		});
		return { isBanned: false };
	}

	return {
		isBanned: true,
		reason: user.banReason ?? undefined,
		banType: user.banType ?? undefined,
		expiresAt: user.banExpiresAt
	};
}
