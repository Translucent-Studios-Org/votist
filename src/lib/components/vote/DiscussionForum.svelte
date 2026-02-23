<script lang="ts">
	import type { PollFeedData, PostData, CommentData } from '$lib/types';
	import Post from './Post.svelte';
	import CommentForm from './CommentForm.svelte';
	import Comment from './Comment.svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	let {
		pollData,
		isAuthenticated,
		user,
		quizGateBlocked = false,
		quizGateMessage = ''
	}: {
		pollData: PollFeedData;
		isAuthenticated: boolean;
		user: any;
		quizGateBlocked?: boolean;
		quizGateMessage?: string;
	} = $props();

	let post: PostData = $state(pollData.post);
	let comments: CommentData[] = $state([]);
	let sortBy = $state('popular');
	let isDiscussionOpen = $state(false);
	let commentsLoaded = $state(false);
	let commentsLoading = $state(false);

	// Sync post data with parent on navigation
	$effect(() => {
		post = pollData.post;
	});

	// Lazy-load comments when discussion is opened
	$effect(() => {
		if (isDiscussionOpen && !commentsLoaded && !commentsLoading) {
			loadComments();
		}
	});

	async function loadComments() {
		commentsLoading = true;
		try {
			const res = await fetch(`/api/posts/${post.id}/comments`);
			const data = await res.json();
			if (res.ok && data.comments) {
				comments = data.comments;
			}
		} catch (err) {
			console.error('Failed to load comments:', err);
		} finally {
			commentsLoading = false;
			commentsLoaded = true;
		}
	}

	let sortedComments = $derived(
		[...comments].sort((a, b) => {
			if (sortBy === 'popular') {
				return b.likes - a.likes;
			} else if (sortBy === 'newest') {
				return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
			} else {
				return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
			}
		})
	);

	function handleDiscussionClick() {
		isDiscussionOpen = !isDiscussionOpen;
	}

	function handleAddComment(newComment: CommentData) {
		comments = [newComment, ...comments];
		post = {
			...post,
			comments: post.comments + 1
		};
	}

	function handleAddReply(reply: CommentData) {
		// Thread reply under the correct root comment (2-level threading)
		const rootId = reply.rootCommentId || reply.parentId;
		comments = comments.map((comment) => {
			if (comment.id === rootId) {
				return {
					...comment,
					replies: [...(comment.replies || []), reply]
				};
			}
			return comment;
		});
		post = {
			...post,
			comments: post.comments + 1
		};
	}

	function handleDeleteComment(commentId: string) {
		// Check if it's a top-level comment
		const topLevel = comments.find((c) => c.id === commentId);
		if (topLevel) {
			const removedCount = 1 + (topLevel.replies?.length || 0);
			comments = comments.filter((c) => c.id !== commentId);
			post = { ...post, comments: Math.max(0, post.comments - removedCount) };
			return;
		}
		// Otherwise it's a reply — remove from its parent
		comments = comments.map((comment) => {
			if (comment.replies?.some((r) => r.id === commentId)) {
				return {
					...comment,
					replies: comment.replies.filter((r) => r.id !== commentId)
				};
			}
			return comment;
		});
		post = { ...post, comments: Math.max(0, post.comments - 1) };
	}

	function handleEditComment(commentId: string, newContent: string) {
		// Check top-level
		const topIdx = comments.findIndex((c) => c.id === commentId);
		if (topIdx !== -1) {
			comments = comments.map((c) =>
				c.id === commentId ? { ...c, content: newContent } : c
			);
			return;
		}
		// Otherwise it's a reply
		comments = comments.map((comment) => ({
			...comment,
			replies: comment.replies?.map((r) =>
				r.id === commentId ? { ...r, content: newContent } : r
			)
		}));
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white">
	<div class="p-3 sm:p-4 md:p-6">
		<Post
			{post}
			{isAuthenticated}
			{user}
			{quizGateBlocked}
			{quizGateMessage}
			onDiscussionClick={handleDiscussionClick}
		/>

		<!-- Discussion Toggle -->
		<div class="mt-6 border-t border-gray-200 pt-6">
			<button
				type="button"
				class="flex h-auto w-full items-center justify-between rounded-md p-3 text-left hover:bg-gray-50"
				onclick={handleDiscussionClick}
			>
				<span class="flex items-center gap-2">
					<h3 class="font-medium">Discussion</h3>
					<span class="text-sm text-gray-500">({post.comments})</span>
				</span>
				{#if isDiscussionOpen}
					<ChevronUp class="h-4 w-4 text-gray-500" />
				{:else}
					<ChevronDown class="h-4 w-4 text-gray-500" />
				{/if}
			</button>

			{#if isDiscussionOpen}
				<div class="mt-4 space-y-6">
					<div class="flex items-center justify-end">
						<select
							bind:value={sortBy}
							class="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
						>
							<option value="popular">Most Popular</option>
							<option value="newest">Newest First</option>
							<option value="oldest">Oldest First</option>
						</select>
					</div>

					{#if quizGateBlocked}
						<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
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
								<span class="font-medium text-amber-800">Knowledge Check Required to Comment</span>
							</div>
							<p class="text-sm text-amber-700">{quizGateMessage}</p>
							<a
								href="/san-rafael/quiz/cmliugj750007pepgmpphvune"
								class="mt-3 inline-block rounded-lg bg-[#167b9b] px-4 py-2 text-sm font-medium text-white hover:bg-[#125a74]"
							>
								Complete Knowledge Check
							</a>
						</div>
					{:else}
						<CommentForm
							postId={post.id}
							{isAuthenticated}
							{user}
							onAddComment={handleAddComment}
							placeholder="Share your thoughts on the poll..."
						/>
					{/if}

					{#if commentsLoading}
						<div class="flex justify-center py-6">
							<div class="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#167b9b]"></div>
						</div>
					{:else}
						<div class="space-y-1">
							{#each sortedComments as comment (comment.id)}
								<Comment
									{comment}
									onAddReply={handleAddReply}
									onDelete={handleDeleteComment}
									onEdit={handleEditComment}
									postId={post.id}
									{isAuthenticated}
									{user}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
