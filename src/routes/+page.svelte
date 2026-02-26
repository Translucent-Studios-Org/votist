<script lang="ts">
	import Post from '$lib/components/vote/Post.svelte';
	import voteIcon from '$lib/assets/icons/vote-outline.png';
	import discussIcon from '$lib/assets/icons/discuss-outline.png';
	import research from '$lib/assets/icons/research-outline.png';

	let { data }: { data: any } = $props();

	let showAuthModal = $state(false);
</script>

<div class="min-h-screen bg-white">
	<!-- Hero Section -->
	<section class="mx-auto max-w-4xl px-4 pt-10 pb-8 text-center">
		<h1 class="text-votist-blue mb-3 text-4xl leading-tight font-extrabold md:text-6xl">
			A new <span class="text-votist-gold">civic forum</span><br />
			for a troubled internet
		</h1>
		<p class="text-votist-blue mx-auto max-w-xl text-2xl md:text-4xl">
			Real people. Shared context. Structured discussion.
		</p>
	</section>

	<!-- CTA Banner -->
	<section class="bg-votist-blue-dark mx-4 mb-10 max-w-4xl rounded-xl p-6 md:mx-auto">
		<div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="mb-1 text-3xl text-white/80 md:text-base">
					We're launching Votist locally
					<span class="text-votist-gold font-semibold">with one real question:</span>
				</p>
				<h2 class="text-xl font-bold text-white md:text-2xl">
					What direction should San Rafael<br class="hidden md:inline" /> take on housing?
				</h2>
			</div>
			<a
				href="/san-rafael"
				class="bg-votist-gold inline-block rounded-lg px-8 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-110"
			>
				Start
			</a>
		</div>
	</section>

	<!-- Vote Section -->
	<section class="mx-auto mb-10 max-w-4xl px-4 md:mb-14">
		<div class="grid items-start gap-8 md:grid-cols-2 md:gap-12">
			<div>
				<h2 class="text-votist-blue mb-3 text-3xl font-bold md:text-4xl">Vote</h2>
				<p class="text-lg text-gray-600">Make your voice heard on major civic issues.</p>
			</div>
			<div>
				{#if data.firstPoll}
					<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
						<Post
							post={data.firstPoll.post}
							isAuthenticated={data.isAuthenticated}
							readOnly={!data.isAuthenticated}
							hideAuthor={true}
							quizGateBlocked={data.firstPoll.quizGateBlocked}
							quizGateMessage={data.firstPoll.quizGateMessage}
							onDiscussionClick={() => {
								window.location.href = '/vote';
							}}
							onAuthRequired={() => {
								showAuthModal = true;
							}}
						/>
					</div>
				{:else}
					<div class="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
						<p class="text-gray-500">No polls available yet.</p>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Discuss Section -->
	<section class="mx-auto mb-10 max-w-4xl px-4 md:mb-14">
		<div class="grid items-start gap-8 md:grid-cols-2 md:gap-12">
			<div>
				<h2 class="text-votist-blue mb-3 text-3xl font-bold md:text-4xl">Discuss</h2>
				<p class="text-lg text-gray-600">
					Exchange ideas with residents grounded in shared context.
				</p>
			</div>
			<div class="space-y-4">
				<!-- Stub Comment 1 -->
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="mb-2 flex items-center gap-3">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-600"
						>
							KM
						</div>
						<span class="text-sm font-bold text-gray-800">Kirk Makeshift</span>
					</div>
					<p class="mb-3 text-sm text-gray-700">
						The leverage might be in massing, step-backs, and public benefit negotiations rather
						than rejection.
					</p>
					<div class="flex items-center gap-4 text-xs text-gray-500">
						<span class="text-votist-blue flex items-center gap-1 font-medium">
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 15l7-7 7 7"
								/>
							</svg>
							2
						</span>
						<span class="cursor-pointer hover:text-gray-700">Reply</span>
					</div>

					<!-- Nested Reply -->
					<div class="mt-4 ml-8 border-l-2 border-gray-100 pl-4">
						<div class="mb-2 flex items-center gap-3">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-600"
							>
								SO
							</div>
							<span class="text-sm font-bold text-gray-800">Sarah Overton</span>
						</div>
						<p class="mb-2 text-sm text-gray-700">
							Agreed. The constraint isn't whether growth occurs — it's how it integrates.
						</p>
						<div class="flex items-center gap-4 text-xs text-gray-500">
							<span class="text-votist-blue flex items-center gap-1 font-medium">
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 15l7-7 7 7"
									/>
								</svg>
								1
							</span>
							<span class="cursor-pointer hover:text-gray-700">Reply</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How Votist Works -->
	<section class="mx-auto mb-10 max-w-4xl px-4 md:mb-14">
		<h2 class="text-votist-blue mb-6 text-3xl font-bold md:text-4xl">How Votist works</h2>
		<div class="grid gap-8 md:grid-cols-3">
			<div class="flex items-start gap-4">
				<img src={research} alt="Background information" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-votist-blue text-lg font-bold">1. Review background information</p>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<img src={voteIcon} alt="Knowledge check" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-votist-blue text-lg font-bold">2. Complete the Knowledge Check</p>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<img src={discussIcon} alt="Vote and discuss" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-votist-blue text-lg font-bold">3. Vote & Discuss</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="flex justify-center px-4 pb-10">
		<a
			href="/san-rafael"
			class="bg-votist-gold inline-block rounded-lg px-10 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-110"
		>
			Start
		</a>
	</section>
	<section
		class="mx-auto flex
	 max-w-4xl flex-col justify-center px-4 pb-10 md:mb-14"
	>
		<h2 class="text-votist-blue mt-10 mb-6 text-3xl font-bold md:text-4xl">What is Votist?</h2>
		<p class="w-full text-lg md:w-4/5">
			Votist is an experimental civic participation platform designed to make informed public
			opinion visible and legible. Participation requires three conditions: shared context, light
			knowledge-gating, and real-name accountability. Before weighing in on real policy questions,
			participants review curated materials and complete a brief knowledge check under their own
			names. The pilot tests whether this modest friction and identity transparency can generate a
			clearer civic signal than traditional anonymous comment threads or quick polls. Votist
			operates as an independent initiative and does not replace formal democratic decision-making.
		</p>
	</section>
</div>

<!-- Auth Required Modal -->
{#if showAuthModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
		onclick={() => (showAuthModal = false)}
		onkeydown={(e) => e.key === 'Escape' && (showAuthModal = false)}
		role="button"
		tabindex="-1"
	>
		<div
			class="mx-4 max-w-md rounded-xl bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="mb-4 text-center">
				<div
					class="bg-votist-blue/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
				>
					<svg
						class="text-votist-blue h-7 w-7"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
				</div>
				<h3 class="text-votist-blue mb-2 text-xl font-bold">Join the Conversation</h3>
				<p class="text-gray-600">
					Log in or sign up to vote, discuss, and make your voice heard on civic issues that matter.
				</p>
			</div>
			<div class="flex flex-col gap-3">
				<a
					href="/sign-in"
					class="bg-votist-blue rounded-lg px-4 py-3 text-center font-semibold text-white transition hover:brightness-110"
					>Log In</a
				>
				<a
					href="/sign-up"
					class="border-votist-blue text-votist-blue rounded-lg border-2 px-4 py-3 text-center font-semibold transition hover:bg-gray-50"
					>Sign Up</a
				>
				<button
					type="button"
					class="mt-1 text-sm text-gray-500 hover:text-gray-700"
					onclick={() => (showAuthModal = false)}>Maybe later</button
				>
			</div>
		</div>
	</div>
{/if}
