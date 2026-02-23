<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Post } from '$lib/types';

	export let posts: Post[];

	const dispatch = createEventDispatcher<{
		deletePost: { id: string; title: string };
	}>();

	let showDeleteModal = false;
	let postToDelete: { id: string; title: string } | null = null;
	let isSaving = false;

	function handleDelete(id: string, title: string) {
		postToDelete = { id, title };
		showDeleteModal = true;
	}

	function cancelDelete() {
		showDeleteModal = false;
		postToDelete = null;
	}

	async function confirmDelete() {
		if (!postToDelete) return;

		const response = await fetch(`/api/posts/${postToDelete.id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			dispatch('deletePost', postToDelete);
			showDeleteModal = false;
			postToDelete = null;
		} else {
			alert('Failed to delete post. Please try again.');
		}
	}

	async function movePost(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= posts.length) return;

		// Swap in local array
		const temp = posts[index];
		posts[index] = posts[targetIndex];
		posts[targetIndex] = temp;
		posts = posts;

		// Save new order
		await saveOrder();
	}

	async function saveOrder() {
		isSaving = true;
		try {
			const orders = posts.map((post, i) => ({ id: post.id, sortOrder: i }));
			const response = await fetch('/api/posts/reorder', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orders })
			});
			if (!response.ok) {
				alert('Failed to save order. Please try again.');
			}
		} catch {
			alert('Failed to save order. Please try again.');
		} finally {
			isSaving = false;
		}
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncateText(text: string, maxLength: number = 100) {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}
</script>

{#if isSaving}
	<div class="alert alert-info mb-4">
		<span class="loading loading-spinner loading-sm"></span>
		<span>Saving order...</span>
	</div>
{/if}

<div class="overflow-x-auto">
	<table class="table w-full table-fixed">
		<thead>
			<tr>
				<th class="w-16">Order</th>
				<th class="w-1/5">Title</th>
				<th class="w-1/6">Category</th>
				<th class="w-1/8">Author</th>
				<th class="w-1/4">Content Preview</th>
				<th class="w-1/12">Tags</th>
				<th class="w-1/12">Comments</th>
				<th class="w-1/12">Likes</th>
				<th class="w-1/12">Created</th>
				<th class="w-1/12">Actions</th>
			</tr>
		</thead>
		<tbody>
			{#each posts as post, index}
				<tr>
					<td class="px-2">
						<div class="flex flex-col items-center gap-0.5">
							<button
								class="btn btn-xs btn-ghost px-1"
								disabled={index === 0 || isSaving}
								on:click={() => movePost(index, 'up')}
								title="Move up"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
								</svg>
							</button>
							<span class="text-xs font-mono text-gray-400">{index + 1}</span>
							<button
								class="btn btn-xs btn-ghost px-1"
								disabled={index === posts.length - 1 || isSaving}
								on:click={() => movePost(index, 'down')}
								title="Move down"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
					</td>
					<td class="px-2 break-words">
						<div class="text-sm font-bold">{post.title}</div>
						{#if post.poll}
							<div class="badge badge-secondary badge-xs mt-1">Has Poll</div>
						{/if}
					</td>
					<td class="px-2">
						<div class="badge badge-outline badge-sm text-xs whitespace-nowrap">
							{post.category}
						</div>
					</td>
					<td class="px-2 text-xs break-words">
						{post.authorName || 'Unknown'}
					</td>
					<td class="max-w-xs px-2">
						<div class="line-clamp-3 text-sm break-words">
							{truncateText(post.content, 80)}
						</div>
					</td>
					<td class="px-2">
						{#if post.tags && post.tags.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each post.tags.slice(0, 2) as tag}
									<div class="badge badge-primary badge-xs">{tag}</div>
								{/each}
								{#if post.tags.length > 2}
									<div class="badge badge-ghost badge-xs">+{post.tags.length - 2}</div>
								{/if}
							</div>
						{:else}
							<span class="text-xs text-gray-400">No tags</span>
						{/if}
					</td>
					<td class="px-2 text-center">{post.comments?.length || 0}</td>
					<td class="px-2 text-center">{post.likes}</td>
					<td class="px-2 text-xs">
						{formatDate(post.createdAt)}
					</td>
					<td class="px-2">
						<div class="flex flex-col gap-1">
							<a href="/admin/posts/{post.id}/edit" class="btn btn-xs btn-primary"> Edit </a>
							<button
								class="btn btn-xs btn-error"
								on:click={() => handleDelete(post.id, post.title)}
							>
								Delete
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if posts.length === 0}
	<div class="py-8 text-center">
		<p class="text-gray-500">No posts found. Create your first post!</p>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && postToDelete}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Delete Post</h3>
			<p class="py-4">
				Are you sure you want to delete "<strong>{postToDelete.title}</strong>"? This action cannot
				be undone.
			</p>
			<div class="modal-action">
				<button class="btn" on:click={cancelDelete}>Cancel</button>
				<button class="btn btn-error" on:click={confirmDelete}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
