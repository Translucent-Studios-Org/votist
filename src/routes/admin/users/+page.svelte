<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		ChevronUp,
		ChevronDown,
		ChevronsUpDown,
		Download,
		Search,
		Users
	} from 'lucide-svelte';

	type User = {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		displayName: string;
		useDisplayName: boolean;
		avatarUrl: string | null;
		role: string;
		isAdmin: boolean;
		isResident: boolean;
		isBanned: boolean;
		banType: string | null;
		createdAt: string;
		_count: {
			votes: number;
			comments: number;
			userProgress: number;
		};
	};

	// --- State ---
	let users: User[] = [];
	let loading = true;
	let total = 0;
	let page = 1;
	let totalPages = 1;
	let pageSize = 25;

	let searchQuery = '';
	let roleFilter = '';
	let residentFilter = '';
	let bannedFilter = '';
	let tierFilter = '';
	let sortField = 'createdAt';
	let sortOrder = 'desc';

	// Debounce state
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// --- Helpers ---
	function getDisplayName(user: User): string {
		if (user.useDisplayName && user.displayName) return user.displayName;
		return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
	}

	function getInitials(user: User): string {
		const name = getDisplayName(user);
		return name
			.split(' ')
			.slice(0, 2)
			.map((n) => n[0]?.toUpperCase() ?? '')
			.join('');
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusLabel(user: User): { label: string; cls: string } {
		if (user.isBanned) {
			if (user.banType === 'SUSPENDED') return { label: 'Suspended', cls: 'badge-warning' };
			return { label: 'Banned', cls: 'badge-error' };
		}
		return { label: 'Active', cls: 'badge-success' };
	}

	function buildUrl(): string {
		const params = new URLSearchParams();
		if (searchQuery) params.set('q', searchQuery);
		if (roleFilter) params.set('role', roleFilter);
		if (residentFilter) params.set('resident', residentFilter);
		if (bannedFilter) params.set('banned', bannedFilter);
		if (tierFilter) params.set('tier', tierFilter);
		if (sortField) params.set('sort', sortField);
		if (sortOrder) params.set('order', sortOrder);
		params.set('page', String(page));
		return `/api/admin/users?${params.toString()}`;
	}

	async function loadUsers() {
		loading = true;
		try {
			const response = await fetch(buildUrl());
			if (!response.ok) throw new Error('Failed to fetch users');
			const result = await response.json();
			users = result.users ?? [];
			total = result.total ?? 0;
			totalPages = result.totalPages ?? 1;
			pageSize = result.pageSize ?? 25;
		} catch (err) {
			console.error('Error loading users:', err);
			users = [];
		} finally {
			loading = false;
		}
	}

	// --- Search debounce ---
	function onSearchInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			page = 1;
			loadUsers();
		}, 300);
	}

	// --- Filter change handlers ---
	function onFilterChange() {
		page = 1;
		loadUsers();
	}

	// --- Sort ---
	function setSort(field: string) {
		if (sortField === field) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortOrder = 'asc';
		}
		page = 1;
		loadUsers();
	}

	function getSortIcon(field: string) {
		if (sortField !== field) return ChevronsUpDown;
		return sortOrder === 'asc' ? ChevronUp : ChevronDown;
	}

	// --- Pagination ---
	function prevPage() {
		if (page > 1) {
			page -= 1;
			loadUsers();
		}
	}

	function nextPage() {
		if (page < totalPages) {
			page += 1;
			loadUsers();
		}
	}

	// --- Export ---
	function exportCsv() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('q', searchQuery);
		if (roleFilter) params.set('role', roleFilter);
		if (residentFilter) params.set('resident', residentFilter);
		if (bannedFilter) params.set('banned', bannedFilter);
		if (tierFilter) params.set('tier', tierFilter);
		if (sortField) params.set('sort', sortField);
		if (sortOrder) params.set('order', sortOrder);
		window.location.href = `/api/admin/users/export?${params.toString()}`;
	}

	// --- Computed pagination display ---
	$: rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
	$: rangeEnd = Math.min(page * pageSize, total);

	onMount(() => {
		loadUsers();
	});

	onDestroy(() => {
		if (debounceTimer) clearTimeout(debounceTimer);
	});
</script>

<!-- Header -->
<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<div class="flex items-center gap-2">
		<Users class="h-7 w-7" />
		<h1 class="text-3xl font-bold">User Management</h1>
	</div>
	<button class="btn btn-sm btn-outline gap-2" on:click={exportCsv}>
		<Download class="h-4 w-4" />
		Export CSV
	</button>
</div>

<div class="divider"></div>

<!-- Search + Filters -->
<div class="mb-4 flex flex-wrap gap-3">
	<!-- Search -->
	<label class="input input-bordered input-sm flex min-w-56 flex-1 items-center gap-2">
		<Search class="h-4 w-4 opacity-50" />
		<input
			type="text"
			class="grow"
			placeholder="Search by name or email..."
			bind:value={searchQuery}
			on:input={onSearchInput}
		/>
	</label>

	<!-- Role filter -->
	<select
		class="select select-bordered select-sm"
		bind:value={roleFilter}
		on:change={onFilterChange}
	>
		<option value="">All Roles</option>
		<option value="admin">Admin</option>
		<option value="visitor">Visitor</option>
	</select>

	<!-- Resident filter -->
	<select
		class="select select-bordered select-sm"
		bind:value={residentFilter}
		on:change={onFilterChange}
	>
		<option value="">All Residents</option>
		<option value="true">Resident</option>
		<option value="false">Non-Resident</option>
	</select>

	<!-- Status / banned filter -->
	<select
		class="select select-bordered select-sm"
		bind:value={bannedFilter}
		on:change={onFilterChange}
	>
		<option value="">All Statuses</option>
		<option value="false">Active</option>
		<option value="true">Banned</option>
		<option value="suspended">Suspended</option>
	</select>

	<!-- Quiz tier filter -->
	<select
		class="select select-bordered select-sm"
		bind:value={tierFilter}
		on:change={onFilterChange}
	>
		<option value="">All Tiers</option>
		<option value="none">None</option>
		<option value="VOTIST">Votist</option>
		<option value="SCHOLAR">Scholar</option>
		<option value="MENTOR">Mentor</option>
	</select>
</div>

<!-- Table area -->
{#if loading}
	<div class="flex justify-center py-16">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if users.length === 0}
	<div class="flex flex-col items-center gap-3 py-20 text-base-content/50">
		<Users class="h-12 w-12" />
		<p class="text-lg font-medium">No users found</p>
		<p class="text-sm">Try adjusting your search or filters.</p>
	</div>
{:else}
	<div class="overflow-x-auto rounded-box border border-base-300">
		<table class="table w-full">
			<thead>
				<tr class="bg-base-200 text-base-content/70">
					<th class="w-10"></th>
					<!-- Avatar col -->
					<th>
						<button
							class="flex items-center gap-1 font-semibold hover:text-base-content"
							on:click={() => setSort('name')}
						>
							Name
							<svelte:component this={getSortIcon('name')} class="h-3.5 w-3.5" />
						</button>
					</th>
					<th>Email</th>
					<th>Role</th>
					<th>Resident</th>
					<th>
						<button
							class="flex items-center gap-1 font-semibold hover:text-base-content"
							on:click={() => setSort('createdAt')}
						>
							Joined
							<svelte:component this={getSortIcon('createdAt')} class="h-3.5 w-3.5" />
						</button>
					</th>
					<th>
						<button
							class="flex items-center gap-1 font-semibold hover:text-base-content"
							on:click={() => setSort('votes')}
						>
							Votes
							<svelte:component this={getSortIcon('votes')} class="h-3.5 w-3.5" />
						</button>
					</th>
					<th>
						<button
							class="flex items-center gap-1 font-semibold hover:text-base-content"
							on:click={() => setSort('comments')}
						>
							Comments
							<svelte:component this={getSortIcon('comments')} class="h-3.5 w-3.5" />
						</button>
					</th>
					<th>
						<button
							class="flex items-center gap-1 font-semibold hover:text-base-content"
							on:click={() => setSort('quizzes')}
						>
							Quizzes
							<svelte:component this={getSortIcon('quizzes')} class="h-3.5 w-3.5" />
						</button>
					</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each users as user (user.id)}
					{@const status = getStatusLabel(user)}
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
					<tr
						class="hover:bg-base-200 cursor-pointer transition-colors"
						on:click={() => goto(`/admin/users/${user.id}`)}
					>
						<!-- Avatar -->
						<td>
							{#if user.avatarUrl}
								<div class="avatar">
									<div class="h-8 w-8 rounded-full">
										<img src={user.avatarUrl} alt={getDisplayName(user)} />
									</div>
								</div>
							{:else}
								<div class="avatar avatar-placeholder">
									<div
										class="bg-neutral text-neutral-content h-8 w-8 rounded-full text-xs font-bold"
									>
										<span>{getInitials(user)}</span>
									</div>
								</div>
							{/if}
						</td>

						<!-- Name -->
						<td class="font-medium whitespace-nowrap">{getDisplayName(user)}</td>

						<!-- Email -->
						<td class="text-base-content/70 text-sm">{user.email}</td>

						<!-- Role -->
						<td>
							{#if user.isAdmin}
								<span class="badge badge-primary badge-sm">Admin</span>
							{:else}
								<span class="badge badge-ghost badge-sm">Visitor</span>
							{/if}
						</td>

						<!-- Resident -->
						<td>
							{#if user.isResident}
								<span class="badge badge-info badge-sm">Resident</span>
							{/if}
						</td>

						<!-- Joined -->
						<td class="text-base-content/70 whitespace-nowrap text-sm">
							{formatDate(user.createdAt)}
						</td>

						<!-- Votes -->
						<td class="text-center">{user._count.votes}</td>

						<!-- Comments -->
						<td class="text-center">{user._count.comments}</td>

						<!-- Quizzes -->
						<td class="text-center">{user._count.userProgress}</td>

						<!-- Status -->
						<td>
							<span class="badge badge-sm {status.cls}">{status.label}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
		<p class="text-base-content/60 text-sm">
			Showing <span class="font-medium text-base-content">{rangeStart}–{rangeEnd}</span> of
			<span class="font-medium text-base-content">{total}</span> users
		</p>
		<div class="join">
			<button class="join-item btn btn-sm" disabled={page <= 1} on:click={prevPage}>
				&laquo; Prev
			</button>
			<button class="join-item btn btn-sm btn-disabled pointer-events-none">
				{page} / {totalPages}
			</button>
			<button class="join-item btn btn-sm" disabled={page >= totalPages} on:click={nextPage}>
				Next &raquo;
			</button>
		</div>
	</div>
{/if}
