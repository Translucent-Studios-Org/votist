const cache = new Map<string, { data: unknown; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry || Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
	return entry.data as T;
}

export function setCache(key: string, data: unknown, ttlMs: number = 5 * 60 * 1000): void {
	cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
