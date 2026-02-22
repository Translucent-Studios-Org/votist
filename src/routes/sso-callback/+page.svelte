<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';

	let loading = true;
	let error = '';

	async function waitForClerk(maxAttempts = 20): Promise<any> {
		for (let i = 0; i < maxAttempts; i++) {
			const clerk = (window as any).Clerk;
			if (clerk) {
				// Wait for Clerk to be fully loaded
				await clerk.load();
				return clerk;
			}
			// Wait 250ms before trying again
			await new Promise(resolve => setTimeout(resolve, 250));
		}
		throw new Error('Clerk failed to load');
	}

	onMount(async () => {
		if (!browser) return;

		console.log('[SSO Callback] Starting authentication...');

		try {
			// Wait for Clerk to be ready
			console.log('[SSO Callback] Waiting for Clerk to load...');
			const clerk = await waitForClerk();
			console.log('[SSO Callback] Clerk loaded successfully');

			// Handle the OAuth redirect
			console.log('[SSO Callback] Handling redirect callback...');
			await clerk.handleRedirectCallback();
			console.log('[SSO Callback] Redirect callback handled');

			// Check if user is authenticated
			if (clerk.user) {
				console.log('[SSO Callback] User authenticated:', clerk.user.id);

				// Set the active session
				if (clerk.session) {
					console.log('[SSO Callback] Setting active session...');
					await clerk.setActive({ session: clerk.session.id });
				}

				// Wait a moment for session cookie to be set
				await new Promise(resolve => setTimeout(resolve, 1000));

				console.log('[SSO Callback] Redirecting to home...');
				// Force a full page reload to ensure server sees the session
				window.location.href = '/';
			} else {
				console.error('[SSO Callback] No user found after authentication');
				error = 'Authentication failed. Please try again.';
				loading = false;
			}
		} catch (err: any) {
			console.error('[SSO Callback] Error:', err);
			error = err.message || 'Failed to complete authentication';
			loading = false;
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
		{#if loading}
			<div class="text-center">
				<div class="mb-4 flex justify-center">
					<span class="loading loading-spinner loading-lg text-[#167B9B]"></span>
				</div>
				<h2 class="text-xl font-semibold text-votist-blue">Completing sign in...</h2>
				<p class="mt-2 text-gray-600">Please wait while we complete your authentication.</p>
			</div>
		{:else if error}
			<div class="text-center">
				<div class="mb-4">
					<svg
						class="mx-auto h-12 w-12 text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-votist-blue">Authentication Failed</h2>
				<p class="mt-2 text-gray-600">{error}</p>
				<div class="mt-6 space-y-3">
					<a href="/sign-in" class="btn w-full bg-[#167B9B] text-white hover:bg-[#155E75]">
						Back to Sign In
					</a>
					<a href="/sign-up" class="btn btn-outline w-full"> Create Account </a>
				</div>
			</div>
		{/if}
	</div>
</div>
