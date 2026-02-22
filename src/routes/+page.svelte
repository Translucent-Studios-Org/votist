<script lang="ts">
	import Post from '$lib/components/vote/Post.svelte';
	import knowledgeIcon from '$lib/assets/icons/knowledge.png';
	import voteIcon from '$lib/assets/icons/vote-outline.png';
	import discussIcon from '$lib/assets/icons/discuss-outline.png';

	export let data: any;
</script>

<div class="min-h-screen bg-white">
	<!-- Hero Section -->
	<section class="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center md:pt-24 md:pb-16">
		<h1 class="mb-4 text-4xl leading-tight font-extrabold text-votist-blue md:text-6xl">
			A new <span class="text-votist-gold">civic forum</span><br />
			for a troubled internet
		</h1>
		<p class="mx-auto max-w-xl text-lg text-gray-600 md:text-xl">
			Real people. Shared context. Structured discussion.
		</p>
	</section>

	<!-- CTA Banner -->
	<section class="bg-votist-blue-dark mx-4 mb-16 rounded-xl p-6 md:mx-auto md:max-w-4xl md:p-8">
		<div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<p class="mb-1 text-sm text-white/80 md:text-base">
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
	<section class="mx-auto mb-16 max-w-4xl px-4 md:mb-20">
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
	<section class="mx-auto mb-16 max-w-4xl px-4 md:mb-20">
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
	<section class="mx-auto mb-16 max-w-4xl px-4 md:mb-20">
		<h2 class="text-votist-blue mb-10 text-3xl font-bold md:text-4xl">How Votist works</h2>
		<div class="grid gap-8 md:grid-cols-3">
			<div class="flex items-start gap-4">
				<img src={knowledgeIcon} alt="Background information" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-lg font-bold text-gray-900">1. Review background information</p>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<img src={voteIcon} alt="Knowledge check" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-lg font-bold text-gray-900">2. Complete the Knowledge Check</p>
				</div>
			</div>
			<div class="flex items-start gap-4">
				<img src={discussIcon} alt="Vote and discuss" class="mt-1 h-8 w-8 flex-shrink-0" />
				<div>
					<p class="text-lg font-bold text-gray-900">3. Vote & Discuss</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Bottom CTA -->
	<section class="flex justify-center px-4 pb-16">
		<a
			href="/san-rafael"
			class="bg-votist-gold inline-block rounded-lg px-10 py-3 text-lg font-bold text-white shadow-md transition hover:brightness-110"
		>
			Start
		</a>
	</section>
</div>
