<script lang="ts">
	import { page } from '$app/state';
	import logo from '$lib/assets/logo/logo-header.png';
</script>

<div class="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12">
	<div class="text-center">
		<!-- Logo -->
		<a href="/" class="mb-8 inline-block">
			<img src={logo} alt="Votist" class="h-10 w-auto opacity-60" />
		</a>

		<!-- Error code -->
		<div class="mb-4 text-8xl font-bold text-[#167B9B]/20 md:text-9xl">
			{page.status}
		</div>

		<!-- Message -->
		<h1 class="mb-3 text-2xl font-bold text-votist-blue md:text-3xl">
			{#if page.status === 404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h1>

		<p class="mx-auto mb-8 max-w-md text-gray-500">
			{#if page.status === 404}
				The page you're looking for doesn't exist or has been moved. Let's get you back on track.
			{:else}
				{page.error?.message || 'An unexpected error occurred. Please try again.'}
			{/if}
		</p>

		<!-- Action buttons -->
		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href="/"
				class="inline-flex items-center gap-2 rounded-lg bg-[#167B9B] px-6 py-3 font-medium text-white transition-colors hover:bg-[#155E75]"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
				Go Home
			</a>
			<a
				href="/vote"
				class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
			>
				Discuss & Vote
			</a>
			<a
				href="/support"
				class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
			>
				Get Support
			</a>
		</div>

		<!-- Helpful links -->
		<div class="mt-12 border-t border-gray-200 pt-8">
			<p class="mb-4 text-sm font-medium text-gray-400">Quick links</p>
			<div class="flex flex-wrap justify-center gap-4 text-sm">
				<a href="/san-rafael" class="text-[#167B9B] hover:underline">Level Up</a>
				<span class="text-gray-300">|</span>
				<a href="/research" class="text-[#167B9B] hover:underline">Research</a>
				<span class="text-gray-300">|</span>
				<a href="/about" class="text-[#167B9B] hover:underline">What is Votist</a>
				<span class="text-gray-300">|</span>
				<a href="/feedback" class="text-[#167B9B] hover:underline">Feedback</a>
			</div>
		</div>
	</div>
</div>
