<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface ModerationUser {
		id: string;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		avatarUrl: string | null;
		isBanned: boolean;
		banType: string | null;
		banReason: string | null;
		bannedAt: string | null;
		banExpiresAt: string | null;
		bannedById: string | null;
	}

	interface ModerationLogEntry {
		id: string;
		action: string;
		reason: string | null;
		metadata: any;
		createdAt: string;
		target: { id: string; firstName: string | null; lastName: string | null; email: string | null };
		admin: { id: string; firstName: string | null; lastName: string | null };
	}

	let users: ModerationUser[] = [];
	let recentLogs: ModerationLogEntry[] = [];
	let loading = true;
	let activeTab: 'banned' | 'log' = 'banned';
	let searchQuery = '';
	let toastMessage = '';
	let showToast = false;
	let toastTimeout: NodeJS.Timeout | null = null;

	// Unban modal state
	let showUnbanModal = false;
	let userToUnban: ModerationUser | null = null;
	let isUnbanning = false;

	function showToastMessage(message: string) {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = message;
		showToast = true;
		toastTimeout = setTimeout(() => {
			showToast = false;
			toastMessage = '';
			toastTimeout = null;
		}, 5000);
	}

	function hideToast() {
		showToast = false;
		toastMessage = '';
		if (toastTimeout) {
			clearTimeout(toastTimeout);
			toastTimeout = null;
		}
	}

	onDestroy(() => {
		if (toastTimeout) clearTimeout(toastTimeout);
	});

	async function loadData() {
		loading = true;
		try {
			const params = new URLSearchParams();
			params.set('filter', activeTab);
			if (searchQuery.trim()) params.set('q', searchQuery.trim());

			const res = await fetch(`/api/admin/moderation?${params}`);
			const data = await res.json();

			if (activeTab === 'log') {
				recentLogs = data.logs || [];
			} else {
				users = data.users || [];
				recentLogs = data.recentLogs || [];
			}
		} catch (err) {
			console.error('Failed to load moderation data:', err);
		} finally {
			loading = false;
		}
	}

	function handleUnbanClick(user: ModerationUser) {
		userToUnban = user;
		showUnbanModal = true;
	}

	async function confirmUnban() {
		if (!userToUnban || isUnbanning) return;
		isUnbanning = true;

		try {
			const res = await fetch(`/api/admin/users/${userToUnban.id}/unban`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: 'Unbanned from admin panel' })
			});

			if (res.ok) {
				const name = formatName(userToUnban.firstName, userToUnban.lastName);
				users = users.filter((u) => u.id !== userToUnban!.id);
				showUnbanModal = false;
				userToUnban = null;
				showToastMessage(`${name} has been unbanned`);
			} else {
				const data = await res.json();
				console.error('Failed to unban:', data.error);
			}
		} catch (err) {
			console.error('Error unbanning user:', err);
		} finally {
			isUnbanning = false;
		}
	}

	function formatName(firstName: string | null, lastName: string | null) {
		return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown User';
	}

	function formatDate(dateStr: string | null) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function actionLabel(action: string) {
		switch (action) {
			case 'WARN': return 'Warning';
			case 'BAN': return 'Permanent Ban';
			case 'SUSPEND': return 'Suspension';
			case 'UNBAN': return 'Unbanned';
			case 'DELETE_COMMENT': return 'Comment Deleted';
			default: return action;
		}
	}

	function actionBadgeClass(action: string) {
		switch (action) {
			case 'WARN': return 'badge-warning';
			case 'BAN': return 'badge-error';
			case 'SUSPEND': return 'badge-warning';
			case 'UNBAN': return 'badge-success';
			case 'DELETE_COMMENT': return 'badge-info';
			default: return 'badge-ghost';
		}
	}

	onMount(() => loadData());

	$: if (activeTab) loadData();
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-3xl font-bold">Moderation</h1>
</div>

<!-- Toast Container -->
<div class="toast toast-top toast-end">
	{#if showToast}
		<div class="alert alert-success">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<span>{toastMessage}</span>
			<button class="btn btn-sm btn-circle btn-ghost" on:click={hideToast} aria-label="Close notification">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>
	{/if}
</div>

<!-- Tabs -->
<div class="tabs tabs-boxed mb-4 w-fit">
	<button class="tab {activeTab === 'banned' ? 'tab-active' : ''}" on:click={() => (activeTab = 'banned')}>
		Banned Users
	</button>
	<button class="tab {activeTab === 'log' ? 'tab-active' : ''}" on:click={() => (activeTab = 'log')}>
		Activity Log
	</button>
</div>

<!-- Search (only for banned tab) -->
{#if activeTab === 'banned'}
	<div class="mb-4">
		<input
			type="text"
			placeholder="Search by name or email..."
			class="input input-bordered w-full max-w-sm"
			bind:value={searchQuery}
			on:input={() => loadData()}
		/>
	</div>
{/if}

<div class="divider"></div>

{#if loading}
	<div class="flex justify-center py-8">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if activeTab === 'banned'}
	<!-- Banned Users Table -->
	{#if users.length === 0}
		<div class="py-8 text-center">
			<p class="text-gray-500">No banned or suspended users found.</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table w-full">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>Type</th>
						<th>Reason</th>
						<th>Banned At</th>
						<th>Expires</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each users as user}
						<tr>
							<td>
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
										{#if user.avatarUrl}
											<img src={user.avatarUrl} alt="" class="h-8 w-8 rounded-full" />
										{:else}
											<span class="text-xs font-medium">
												{formatName(user.firstName, user.lastName).slice(0, 2).toUpperCase()}
											</span>
										{/if}
									</div>
									<span class="font-medium">{formatName(user.firstName, user.lastName)}</span>
								</div>
							</td>
							<td class="text-sm text-gray-600">{user.email || '—'}</td>
							<td>
								{#if user.banType === 'permanent'}
									<span class="badge badge-error badge-sm">Permanent</span>
								{:else}
									<span class="badge badge-warning badge-sm">Suspended</span>
								{/if}
							</td>
							<td class="max-w-xs text-sm">
								<span class="line-clamp-2">{user.banReason || '—'}</span>
							</td>
							<td class="text-sm">{formatDate(user.bannedAt)}</td>
							<td class="text-sm">
								{#if user.banType === 'permanent'}
									<span class="text-red-600">Never</span>
								{:else}
									{formatDate(user.banExpiresAt)}
								{/if}
							</td>
							<td>
								<button
									class="btn btn-sm btn-outline btn-success"
									on:click={() => handleUnbanClick(user)}
								>
									Unban
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Recent Activity -->
	{#if recentLogs.length > 0}
		<div class="mt-8">
			<h2 class="mb-4 text-xl font-semibold">Recent Moderation Activity</h2>
			<div class="space-y-2">
				{#each recentLogs as log}
					<div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
						<span class="badge {actionBadgeClass(log.action)} badge-sm">{actionLabel(log.action)}</span>
						<span class="text-sm">
							<strong>{formatName(log.admin.firstName, log.admin.lastName)}</strong>
							&rarr;
							<strong>{formatName(log.target.firstName, log.target.lastName)}</strong>
						</span>
						{#if log.reason}
							<span class="text-sm text-gray-500">— {log.reason}</span>
						{/if}
						<span class="ml-auto text-xs text-gray-400">{formatDate(log.createdAt)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{:else}
	<!-- Full Activity Log -->
	{#if recentLogs.length === 0}
		<div class="py-8 text-center">
			<p class="text-gray-500">No moderation activity yet.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each recentLogs as log}
				<div class="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
					<span class="badge {actionBadgeClass(log.action)} badge-sm">{actionLabel(log.action)}</span>
					<span class="text-sm">
						<strong>{formatName(log.admin.firstName, log.admin.lastName)}</strong>
						&rarr;
						<strong>{formatName(log.target.firstName, log.target.lastName)}</strong>
					</span>
					{#if log.reason}
						<span class="flex-1 truncate text-sm text-gray-500">— {log.reason}</span>
					{/if}
					<span class="ml-auto shrink-0 text-xs text-gray-400">{formatDate(log.createdAt)}</span>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<!-- Unban Confirmation Modal -->
{#if showUnbanModal && userToUnban}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Unban User</h3>
			<p class="py-4">
				Are you sure you want to unban <strong>{formatName(userToUnban.firstName, userToUnban.lastName)}</strong>?
				They will be able to comment, vote, and participate again.
			</p>
			<div class="modal-action">
				<button class="btn" on:click={() => { showUnbanModal = false; userToUnban = null; }}>Cancel</button>
				<button
					class="btn btn-success"
					disabled={isUnbanning}
					on:click={confirmUnban}
				>
					{isUnbanning ? 'Unbanning...' : 'Unban'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
