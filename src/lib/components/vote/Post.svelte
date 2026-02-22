<script lang="ts">
	import type { PostData } from '$lib/types';
	import { MoreHorizontal, ArrowUp, MessageCircle, Share, BarChart3, Check } from 'lucide-svelte';

	export let post: PostData;
	export const onLike: () => void = () => {};
	export let onDiscussionClick: () => void;
	export let isAuthenticated: boolean;
	export const user: any = null;
	export let quizGateBlocked: boolean = false;
	export let quizGateMessage: string = '';
	export let readOnly: boolean = false;
	export let hideAuthor: boolean = false;

	let revertVote: {
		prevUserVote: string | undefined;
		prevTotalVotes: number;
		prevOptions: any[];
	} | null = null;

	let isVoting: boolean = false;
	let showQuizRequirementModal: boolean = false;
	let quizRequirementMessage: string = '';
	let requiredDifficultyLevel: string = '';
	let showShareCopied: boolean = false;

	function formatLocaleTime(ts: string) {
		const date = new Date(ts);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function handleShareClick() {
		const shareUrl = `${window.location.origin}/post/${post.id}`;
		try {
			await navigator.clipboard.writeText(shareUrl);
			showShareCopied = true;
			setTimeout(() => (showShareCopied = false), 2000);
		} catch {
			// Fallback for browsers without clipboard API
			window.open(shareUrl, '_blank');
		}
	}

	async function handleVoteClick(optionId: string) {
		if (readOnly || quizGateBlocked) return;
		if (!post.poll || !isAuthenticated || isVoting) return;

		const isChangingVote = !!post.poll.userVote && post.poll.userVote !== optionId;
		const isNewVote = !post.poll.userVote;

		if (!isNewVote && !isChangingVote) return;

		if (!post.id || !optionId) return;

		const selectedOption = post.poll.options.find((o) => o.id === optionId);
		if (!selectedOption) return;

		isVoting = true;

		revertVote = {
			prevUserVote: post.poll.userVote,
			prevTotalVotes: post.poll.totalVotes,
			prevOptions: post.poll.options.map((o) => ({ ...o }))
		};

		if (post.poll) {
			if (isChangingVote) {
				const prevOption = post.poll.options.find((o) => o.id === post.poll!.userVote);
				if (prevOption) prevOption.votes -= 1;
				const newOption = post.poll.options.find((o) => o.id === optionId);
				if (newOption) newOption.votes += 1;
				post.poll.userVote = optionId;
			} else {
				post.poll.userVote = optionId;
				post.poll.totalVotes += 1;
				const option = post.poll.options.find((o) => o.id === optionId);
				if (option) option.votes += 1;
			}
		}

		try {
			const response = await fetch(`/api/posts/${post.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ optionId })
			});

			const data = await response.json();

			if (response.ok && data.success) {
				if (data.poll && post.poll) {
					// Update vote counts in-place to preserve option order
					if (data.poll.options) {
						const serverOptionsMap = new Map(
							data.poll.options.map((o: any) => [o.id, o])
						);
						post.poll.options = post.poll.options.map((existing) => {
							const server = serverOptionsMap.get(existing.id);
							return server
								? { ...existing, votes: server.votes ?? 0 }
								: existing;
						});
					}
					post.poll.question = data.poll.question || post.poll.question;
					post.poll.totalVotes = data.poll.totalVotes ?? post.poll.totalVotes;
					post.poll.userVote = data.userVote;
					post.poll.endsAt = data.poll.endsAt || post.poll.endsAt;
				}
			} else if (response.status === 403 && data.error === 'Quiz requirement not met') {
				if (revertVote && post.poll) {
					post.poll.userVote = revertVote.prevUserVote;
					post.poll.totalVotes = revertVote.prevTotalVotes;
					post.poll.options = revertVote.prevOptions;
				}
				quizRequirementMessage = data.message || 'You need to complete a knowledge check to vote.';
				requiredDifficultyLevel = data.requiredDifficulty || '';
				showQuizRequirementModal = true;
			} else {
				if (revertVote && post.poll) {
					post.poll.userVote = revertVote.prevUserVote;
					post.poll.totalVotes = revertVote.prevTotalVotes;
					post.poll.options = revertVote.prevOptions;
				}
			}
		} catch {
			if (revertVote && post.poll) {
				post.poll.userVote = revertVote.prevUserVote;
				post.poll.totalVotes = revertVote.prevTotalVotes;
				post.poll.options = revertVote.prevOptions;
			}
		} finally {
			isVoting = false;
			revertVote = null;
		}
	}

	function getPercentage(votes: number, total: number) {
		if (total === 0) return 0;
		return Math.round((votes / total) * 100);
	}

	function redirectToQuizzes() {
		showQuizRequirementModal = false;
		window.location.href = '/san-rafael/quiz/cmliugj750007pepgmpphvune';
	}
</script>

<div>
	<!-- {#if !hideAuthor}
		<div class="mb-3 flex items-start gap-3 md:mb-4 md:gap-4">
			<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 md:h-12 md:w-12">
				{#if post.author.avatar}
					<img src={post.author.avatar} alt={post.author.name} class="h-10 w-10 rounded-full md:h-12 md:w-12" />
				{:else}
					<span class="text-xs font-medium text-gray-600 md:text-sm">
						{post.author.name.slice(0, 2).toUpperCase()}
					</span>
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<div class="mb-1 flex flex-wrap items-center gap-1 md:gap-2">
					<h3 class="text-sm font-medium md:text-base">{post.author.name}</h3>
					<span class="text-xs text-gray-500 md:text-sm">@{post.author.username}</span>
					{#if post.author.isVerified}
						<div class="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
							<div class="h-2 w-2 rounded-full bg-white"></div>
						</div>
					{/if}
				</div>
				<div class="flex items-center gap-1 text-xs text-gray-500 md:gap-2 md:text-sm">
					<span>{formatLocaleTime(post.timestamp)}</span>
					<span>&middot;</span>
					<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{post.category}</span>
				</div>
			</div>

			<button class="flex h-8 w-8 items-center justify-center rounded p-0 hover:bg-gray-100">
				<MoreHorizontal class="h-4 w-4" />
			</button>
		</div>
	{/if} -->

	{#if post.showTitle || post.showContent}
		<div class="mb-3 md:mb-4">
			{#if post.showTitle}
				<h1 class="mb-2 text-lg font-semibold md:mb-3 md:text-xl">{post.title}</h1>
			{/if}
			{#if post.showContent}
				<div class="prose prose-sm max-w-none">
					<p class="text-sm whitespace-pre-wrap text-gray-700 md:text-base">{post.content}</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Poll Section -->
	{#if post.poll}
		<div class="mb-3 md:mb-4">
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-3 md:p-4">
				<div class="mb-4 flex items-center gap-2">
					<BarChart3 class="h-4 w-4 text-gray-500" />
					<span class="text-sm font-medium">Poll</span>
					{#if post.poll.endsAt}
						<span class="text-xs text-gray-500">&middot; Ends {post.poll.endsAt}</span>
					{/if}
				</div>

				<h3 class="mb-4 font-medium">{post.poll.question}</h3>

				<div class="space-y-3">
					{#if quizGateBlocked && !readOnly}
						<div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
							<div class="mb-2 flex items-center gap-2">
								<svg
									class="h-5 w-5 text-amber-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
									/>
								</svg>
								<span class="font-medium text-amber-800">Knowledge Check Required</span>
							</div>
							<p class="text-sm text-amber-700">{quizGateMessage}</p>
							<button
								type="button"
								class="mt-3 rounded-lg bg-[#167b9b] px-4 py-2 text-sm font-medium text-white hover:bg-[#125a74]"
								on:click={redirectToQuizzes}
							>
								Complete Knowledge Check
							</button>
						</div>
					{/if}
					{#each post.poll.options as option}
						{@const percentage = getPercentage(option.votes, post.poll!.totalVotes)}
						{@const isSelected = post.poll?.userVote === option.id}
						{@const hasVoted = !!post.poll?.userVote || readOnly}
						{@const canVote = isAuthenticated && !isVoting && !quizGateBlocked && !readOnly}
						{@const isPollEnded = post.poll.endsAt && new Date() > new Date(post.poll.endsAt)}

						<div class="space-y-2">
							<button
								type="button"
								on:click={() => handleVoteClick(option.id)}
								class="h-auto w-full justify-start overflow-hidden rounded-md border p-0 transition-all duration-200 {isPollEnded ||
								readOnly
									? 'cursor-default'
									: canVote
										? 'cursor-pointer hover:bg-gray-50'
										: 'cursor-not-allowed opacity-50'} {isSelected
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200'} {isVoting ? 'opacity-75' : ''}"
								disabled={!canVote || !!isPollEnded}
							>
								<div class="relative w-full p-3">
									{#if hasVoted}
										<div
											class="absolute inset-0 transition-all duration-500 {isSelected
												? 'bg-blue-200'
												: 'bg-gray-200'}"
											style="width: {percentage}%"
										></div>
									{/if}
									<div class="relative flex items-center justify-between">
										<span class="text-left">{option.text}</span>
										{#if hasVoted}
											<div class="flex items-center gap-2 text-sm">
												<span>{percentage}%</span>
												<span class="text-gray-500">({option.votes})</span>
											</div>
										{:else if !isAuthenticated && !readOnly}
											<span class="text-xs text-gray-400">Sign in to vote</span>
										{/if}
									</div>
								</div>
							</button>
						</div>
					{/each}
				</div>

				<div class="mt-4 border-t border-gray-200 pt-3">
					<div class="flex items-center justify-between text-sm text-gray-500">
						<span>{post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
						{#if readOnly}
							<span>View only</span>
						{:else if post.poll.endsAt && new Date() > new Date(post.poll.endsAt)}
							{#if isVoting}
								<span class="text-blue-600">Submitting vote...</span>
							{:else}
								<span class="text-red-600">Poll ended</span>
							{/if}
						{:else if isVoting}
							<span class="text-blue-600">Submitting vote...</span>
						{:else if !isAuthenticated}
							<span>Sign in to vote</span>
						{:else if post.poll.userVote}
							<span class="text-green-600">You can change your vote before the poll ends</span>
						{:else}
							<span>Choose an option to see results</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if post.tags.length > 0}
		<div class="mb-4 flex flex-wrap gap-2">
			{#each post.tags as tag}
				<span class="rounded border bg-gray-100 px-2 py-1 text-xs">#{tag}</span>
			{/each}
		</div>
	{/if}

	{#if !readOnly}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-6">
				<button
					type="button"
					on:click={onLike}
					class="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-100 {post.isLiked || false
						? 'text-orange-500'
						: 'text-gray-500'} {!isAuthenticated ? 'cursor-not-allowed opacity-50' : ''}"
					disabled={!isAuthenticated}
				>
					<ArrowUp class="h-4 w-4 {post.isLiked || false ? 'fill-current' : ''}" />
					<span>{post.likes}</span>
				</button>

				<button
					class="flex items-center gap-2 rounded px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					on:click={onDiscussionClick}
				>
					<MessageCircle class="h-4 w-4" />
					<span>{post.comments}</span>
				</button>
			</div>

			<div class="flex items-center gap-2">
				<button
					class="relative flex items-center gap-1.5 rounded px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					on:click={handleShareClick}
				>
					{#if showShareCopied}
						<Check class="h-4 w-4 text-green-500" />
						<span class="text-xs text-green-500">Copied!</span>
					{:else}
						<Share class="h-4 w-4" />
					{/if}
				</button>
			</div>
		</div>
	{:else}
		<div class="flex items-center gap-6 text-gray-500">
			<div class="flex items-center gap-2">
				<ArrowUp class="h-4 w-4" />
				<span>{post.likes} likes</span>
			</div>
			<div class="flex items-center gap-2">
				<MessageCircle class="h-4 w-4" />
				<span>{post.comments} comments</span>
			</div>
		</div>
	{/if}
</div>

<!-- Quiz Requirement Modal -->
{#if showQuizRequirementModal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		on:click={() => (showQuizRequirementModal = false)}
		on:keydown={(e) => e.key === 'Escape' && (showQuizRequirementModal = false)}
		role="button"
		tabindex="-1"
	>
		<div
			class="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl"
			on:click={(e) => e.stopPropagation()}
			on:keydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<div class="mb-4">
				<h3 class="mb-2 text-xl font-bold text-votist-blue">Knowledge Check Required to Vote</h3>
				<p class="text-gray-600">
					{quizRequirementMessage}
				</p>
			</div>

			<div class="mb-6 rounded-lg bg-blue-50 p-4">
				<p class="text-sm text-blue-800">
					Complete at least one <strong>{requiredDifficultyLevel}</strong> level quiz to participate
					in this poll. Knowledge checks help ensure informed participation in our community discussions.
				</p>
			</div>

			<div class="flex gap-3">
				<button
					type="button"
					class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
					on:click={() => (showQuizRequirementModal = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="flex-1 rounded-lg bg-[#167b9b] px-4 py-2 font-medium text-white hover:bg-[#125a74]"
					on:click={redirectToQuizzes}
				>
					Take Knowledge Check
				</button>
			</div>
		</div>
	</div>
{/if}
