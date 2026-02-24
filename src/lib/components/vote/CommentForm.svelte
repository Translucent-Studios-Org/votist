<script lang="ts">
	import type { CommentData } from '$lib/types';

	export let postId: string;
	export let placeholder = 'Share your thoughts...';
	export let parentId: string | null = null;
	export let isAuthenticated: boolean;
	export let user: any;
	export let onAddComment: (comment: CommentData) => void;

	let content = '';
	let isFocused = false;
	let isSubmitting = false;
	let textareaEl: HTMLTextAreaElement;

	function autoResize() {
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = textareaEl.scrollHeight + 'px';
		}
	}

	async function handleSubmit() {
		if (!isAuthenticated || !content.trim() || isSubmitting) return;

		const commentContent = content.trim();

		// Build optimistic comment immediately
		const optimisticComment: CommentData = {
			id: `temp-${Date.now()}`,
			author: {
				name:
					user?.firstName && user?.lastName
						? `${user.firstName} ${user.lastName}`
						: user?.firstName || 'You',
				avatar: user?.imageUrl || '',
				username: user?.email?.split('@')[0] || 'you'
			},
			content: commentContent,
			timestamp: new Date().toISOString(),
			likes: 0,
			isLiked: false,
			replies: []
		};

		// Show optimistic comment and clear form immediately
		onAddComment(optimisticComment);
		content = '';
		isFocused = false;
		if (textareaEl) textareaEl.style.height = 'auto';
		isSubmitting = true;

		try {
			const response = await fetch(`/api/posts/${postId}/comments`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					content: commentContent,
					parentId
				})
			});

			const result = await response.json();

			if (!response.ok) {
				console.error('Failed to add comment:', result.error);
			}
		} catch (error) {
			console.error('Error adding comment:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<div class="flex gap-3">
		<div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
			{#if user?.imageUrl}
				<img src={user.imageUrl} alt={user.firstName || 'User'} class="h-10 w-10 rounded-full" />
			{:else}
				<span class="text-sm font-medium text-gray-600">
					{(user?.firstName || 'You').slice(0, 2).toUpperCase()}
				</span>
			{/if}
		</div>

		<div class="flex-1">
			<textarea
				bind:this={textareaEl}
				bind:value={content}
				on:focus={() => (isFocused = true)}
				on:input={autoResize}
				{placeholder}
				class="scrollbar-hide min-h-[44px] w-full resize-none overflow-y-hidden rounded-md border border-gray-200 bg-gray-50 p-3 focus:border-blue-300 focus:bg-white focus:outline-none focus-visible:ring-0"
				disabled={!isAuthenticated || isSubmitting}
			></textarea>

			{#if isFocused || content}
				<div class="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
					<div class="text-xs text-gray-500">
						{content.length}/2000 characters
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							class="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700"
							on:click={() => {
								content = '';
								isFocused = false;
								if (textareaEl) textareaEl.style.height = 'auto';
							}}
							disabled={!isAuthenticated || isSubmitting}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:opacity-50"
							disabled={!content.trim() || !isAuthenticated || isSubmitting}
							on:click={handleSubmit}
						>
							{isSubmitting ? 'Posting...' : 'Comment'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
