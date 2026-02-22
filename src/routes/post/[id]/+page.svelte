<script lang="ts">
	import type { CommentData } from '$lib/types';
	import Post from '$lib/components/vote/Post.svelte';
	import logo from '$lib/assets/logo/logo-header.png';

	export let data;

	const post = data.post;
	const comments: CommentData[] = data.comments;
	const shareUrl: string = data.shareUrl;
	const qrCodeDataUrl: string = data.qrCodeDataUrl;

	function formatTimestamp(ts: string) {
		const date = new Date(ts);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 30) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	function handlePrint() {
		window.print();
	}

	// No-ops for read-only mode
	function noop() {}
</script>

<svelte:head>
	<title>{post.title} - Votist</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Join CTA Banner (hidden in print) -->
	<div class="border-b border-[#167b9b]/20 print:hidden">
		<div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
			<div class="flex items-center gap-3">
				<img src={logo} alt="Votist" class="h-7" />
				<span class="hidden text-sm sm:inline">
					Civic engagement starts with informed participation
				</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={handlePrint}
					class="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
				>
					Print
				</button>
				<a
					href="/sign-up"
					class="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#167b9b] shadow-sm transition hover:bg-gray-50"
				>
					Join Votist
				</a>
			</div>
		</div>
	</div>

	<!-- San Rafael / Location CTA (hidden in print) -->
	<div class="border-b border-amber-200 bg-amber-50 print:hidden">
		<div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-6">
			<svg
				class="h-5 w-5 flex-shrink-0 text-amber-600"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
				/>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			<p class="flex-1 text-sm text-amber-800">
				<strong>San Rafael resident?</strong> Your voice matters. Join Votist to vote on local issues,
				take quizzes to earn voting power, and shape your community's future.
			</p>
			<a
				href="/sign-up"
				class="flex-shrink-0 rounded-lg bg-[#167b9b] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#125a74]"
			>
				Get Started
			</a>
		</div>
	</div>

	<!-- Print Header (only visible in print) -->
	<div class="hidden print:block print:border-b print:border-gray-300 print:pb-4 print:mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<img src={logo} alt="Votist" class="h-8" />
				<div>
					<p class="text-sm text-gray-600">Civic Engagement Platform</p>
				</div>
			</div>
			<div class="text-right">
				<div class="flex items-center gap-3">
					<div class="text-right">
						<p class="text-xs text-gray-500">Scan to view online</p>
						<p class="text-[10px] text-gray-400 max-w-[180px] truncate">{shareUrl}</p>
					</div>
					<img src={qrCodeDataUrl} alt="QR Code" class="h-16 w-16" />
				</div>
			</div>
		</div>
	</div>

	<!-- Post Content -->
	<div class="mx-auto max-w-4xl px-3 py-6 md:px-4 md:py-8 print:px-0 print:py-2 print:max-w-none">
		<div class="rounded-lg border border-gray-200 bg-white p-4 md:p-6 print:border-0 print:p-0 print:shadow-none">
			<Post {post} isAuthenticated={false} onDiscussionClick={noop} readOnly={true} />

			<!-- Comments Section -->
			{#if comments.length > 0}
				<div class="mt-6 border-t border-gray-200 pt-6 print:mt-4 print:pt-4">
					<h3 class="mb-4 font-medium">
						Discussion <span class="text-sm text-gray-500">({post.comments})</span>
					</h3>

					<div class="space-y-1">
						{#each comments as comment (comment.id)}
							{@const replies = comment.replies || []}
							<div class="rounded-lg bg-gray-50 px-3 py-2 print:bg-white print:border-b print:border-gray-100 print:rounded-none print:px-0">
								<div class="flex gap-3 py-2">
									<div
										class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 print:h-6 print:w-6"
									>
										{#if comment.author.avatar}
											<img
												src={comment.author.avatar}
												alt={comment.author.name}
												class="h-8 w-8 rounded-full print:h-6 print:w-6"
											/>
										{:else}
											<span class="text-xs font-medium text-gray-600 print:text-[10px]">
												{comment.author.name.slice(0, 2).toUpperCase()}
											</span>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex items-center gap-2">
											<span class="text-sm font-medium print:text-xs">{comment.author.name}</span>
											<span class="text-xs text-gray-500 print:text-[10px]">{formatTimestamp(comment.timestamp)}</span>
										</div>
										<p class="text-sm whitespace-pre-wrap print:text-xs">{comment.content}</p>
										<div class="mt-1 flex items-center gap-3 text-xs text-gray-500 print:text-[10px]">
											<span>{comment.likes} likes</span>
											{#if replies.length > 0}
												<span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
											{/if}
										</div>
									</div>
								</div>

								{#if replies.length > 0}
									<div class="ml-6 space-y-1 border-l border-gray-200 pl-4 md:ml-8">
										{#each replies as reply (reply.id)}
											{@const replyTo =
												reply.parentId && reply.parentId !== comment.id
													? replies.find((r) => r.id === reply.parentId)?.author?.name ||
														comment.author.name
													: null}
											<div class="flex gap-2 py-2">
												<div
													class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 print:h-5 print:w-5"
												>
													{#if reply.author.avatar}
														<img
															src={reply.author.avatar}
															alt={reply.author.name}
															class="h-6 w-6 rounded-full print:h-5 print:w-5"
														/>
													{:else}
														<span class="text-[10px] font-medium text-gray-600">
															{reply.author.name.slice(0, 2).toUpperCase()}
														</span>
													{/if}
												</div>
												<div class="min-w-0 flex-1">
													<div class="mb-0.5 flex items-center gap-2">
														<span class="text-xs font-medium print:text-[10px]">{reply.author.name}</span>
														<span class="text-[10px] text-gray-500"
															>{formatTimestamp(reply.timestamp)}</span
														>
													</div>
													{#if replyTo}
														<span
															class="mb-0.5 inline-flex items-center gap-1 text-[10px] text-[#167b9b]"
														>
															Replying to @{replyTo}
														</span>
													{/if}
													<p class="text-xs whitespace-pre-wrap print:text-[10px]">{reply.content}</p>
													<span class="text-[10px] text-gray-500">{reply.likes} likes</span>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- QR Code Section (visible on screen too) -->
		<div class="mt-6 flex items-center justify-center gap-6 rounded-lg border border-gray-200 bg-white p-6 print:mt-8 print:border-t print:border-gray-300 print:border-x-0 print:border-b-0 print:rounded-none print:pt-6 print:px-0">
			<img src={qrCodeDataUrl} alt="QR Code to view this post" class="h-28 w-28 print:h-24 print:w-24" />
			<div class="text-center sm:text-left">
				<p class="text-sm font-medium text-gray-900">Scan to view this post</p>
				<p class="mt-1 max-w-xs text-xs text-gray-500 break-all">{shareUrl}</p>
				<p class="mt-2 text-xs text-[#167b9b] print:hidden">Share this page or print it for posting</p>
			</div>
		</div>

		<!-- Bottom CTA (hidden in print) -->
		<div class="mt-6 rounded-lg border border-[#167b9b]/20 bg-white p-6 text-center md:p-8 print:hidden">
			<img src={logo} alt="Votist" class="mx-auto mb-4 h-8" />
			<h2 class="mb-2 text-xl font-bold text-votist-blue">Want to join the conversation?</h2>
			<p class="mx-auto mb-6 max-w-lg text-gray-600">
				Votist is a civic engagement platform where informed citizens vote on real community issues.
				Complete quizzes, earn voting power, and make your voice count.
			</p>
			<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
				<a
					href="/sign-up"
					class="w-full rounded-lg bg-[#167b9b] px-6 py-2.5 font-medium text-white transition hover:bg-[#125a74] sm:w-auto"
				>
					Create Account
				</a>
				<a
					href="/sign-in"
					class="w-full rounded-lg border border-gray-300 bg-white px-6 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
				>
					Sign In
				</a>
			</div>
		</div>

		<!-- Print Footer (only visible in print) -->
		<div class="hidden print:block print:mt-6 print:pt-4 print:border-t print:border-gray-200 print:text-center">
			<p class="text-xs text-gray-500">
				Join the conversation at <strong>votist.com</strong> &mdash; Civic engagement starts with informed participation
			</p>
		</div>
	</div>
</div>

<style>
	@media print {
		:global(body) {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		/* Hide app shell nav/sidebar/bottom bar */
		:global(nav),
		:global(aside),
		:global(.bottom-nav),
		:global(footer) {
			display: none !important;
		}
		/* Remove page margins for tighter print layout */
		@page {
			margin: 0.5in;
		}
	}
</style>
