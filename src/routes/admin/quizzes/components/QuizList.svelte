<script lang="ts">
	import type { Quiz } from '$lib/types';

	export let quizzes: Quiz[];

	// Group quizzes by difficulty
	const grouped = {
		VOTIST: [],
		SCHOLAR: [],
		MENTOR: []
	} as Record<string, Quiz[]>;

	for (const quiz of quizzes) {
		const diff = quiz.difficulty || 'VOTIST';
		if (!grouped[diff]) grouped[diff] = [];
		grouped[diff].push(quiz);
	}

	async function moveUp(index: number, group: Quiz[]) {
		if (index === 0) return;
		[group[index - 1], group[index]] = [group[index], group[index - 1]];
		const difficulty = group[0]?.difficulty;
		if (difficulty !== undefined) {
			grouped[difficulty] = [...group]; // force reactivity
		}
		await updateSequence(group);
	}

	async function moveDown(index: number, group: Quiz[]) {
		if (index === group.length - 1) return;
		[group[index], group[index + 1]] = [group[index + 1], group[index]];
		const difficulty = group[0]?.difficulty;
		if (difficulty !== undefined) {
			grouped[difficulty] = [...group]; // force reactivity
		}
		await updateSequence(group);
	}

	let updatingSequence = false;

	async function updateSequence(list: Quiz[]) {
		const updates = list.map((quiz, index) => ({
			...quiz,
			order: index + 1
		}));
		try {
			updatingSequence = true;
			await Promise.all(
				updates.map(async (quiz) => {
					const res = await fetch(`/api/quizzes/${quiz.id}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							title: quiz.title,
							description: quiz.description,
							passingScore: quiz.passingScore,
							associatedMaterialId: quiz.associatedMaterialId,
							order: quiz.order,
							questions: quiz.questions,
							difficulty: quiz.difficulty
						})
					});
					if (!res.ok) {
						console.error(`Failed to update quiz order for ${quiz.id}`);
					}
				})
			);
		} catch (error) {
			console.error('Error updating sequence:', error);
		} finally {
			updatingSequence = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this quiz?')) return;

		const response = await fetch(`/api/quizzes/${id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			window.location.reload();
		}
	}

	// Reset progress state
	let resetModalOpen = false;
	let resetQuizId = '';
	let resetQuizTitle = '';
	let resetMode: 'choose' | 'all-confirm' | 'single' | 'single-confirm' | 'result' = 'choose';
	let resetLoading = false;
	let resetResultCount = 0;

	// User search state
	let userSearchQuery = '';
	let userSearchResults: { id: string; email: string | null; firstName: string | null; lastName: string | null }[] = [];
	let userSearchLoading = false;
	let selectedUser: { id: string; email: string | null; firstName: string | null; lastName: string | null } | null = null;
	let searchTimeout: ReturnType<typeof setTimeout>;

	function openResetModal(quizId: string, quizTitle: string) {
		resetQuizId = quizId;
		resetQuizTitle = quizTitle;
		resetMode = 'choose';
		resetResultCount = 0;
		selectedUser = null;
		userSearchQuery = '';
		userSearchResults = [];
		resetModalOpen = true;
	}

	function closeResetModal() {
		resetModalOpen = false;
	}

	function handleSearchInput() {
		clearTimeout(searchTimeout);
		selectedUser = null;
		if (userSearchQuery.trim().length < 2) {
			userSearchResults = [];
			return;
		}
		searchTimeout = setTimeout(() => searchUsers(), 300);
	}

	async function searchUsers() {
		userSearchLoading = true;
		try {
			const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(userSearchQuery.trim())}`);
			if (res.ok) {
				userSearchResults = await res.json();
			}
		} catch (e) {
			console.error('User search error:', e);
		} finally {
			userSearchLoading = false;
		}
	}

	function selectUser(user: typeof selectedUser) {
		selectedUser = user;
		userSearchResults = [];
	}

	async function resetProgress(userId?: string) {
		resetLoading = true;
		try {
			const res = await fetch('/api/admin/quiz-progress', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ quizId: resetQuizId, userId })
			});
			if (res.ok) {
				const data = await res.json();
				resetResultCount = data.count;
				resetMode = 'result';
			}
		} catch (e) {
			console.error('Reset error:', e);
		} finally {
			resetLoading = false;
		}
	}
</script>

<div class="space-y-8 overflow-x-auto">
	{#each Object.entries(grouped) as [difficulty, group]}
		<div>
			<h2 class="mb-2 text-xl font-bold">{difficulty} Quizzes</h2>
			<table class="mb-6 table w-full table-fixed">
				<thead>
					<tr>
						<th class="w-1/12">Order</th>
						<th class="w-1/6">Title</th>
						<th class="w-1/6">Questions</th>
						<th class="w-1/4">Actions</th>
						<th class="w-1/6">Move</th>
					</tr>
				</thead>
				<tbody>
					{#each group as quiz, index}
						<tr>
							<td>{index + 1}</td>
							<td>{quiz.title}</td>
							<td>{quiz.questions ? quiz.questions.length : 0} questions</td>
							<td>
								<div class="flex gap-2">
									<a href="/admin/quizzes/{quiz.id}/edit" class="btn btn-sm">Edit</a>
									<button
										class="btn btn-sm btn-warning"
										on:click={() => openResetModal(quiz.id, quiz.title)}
									>
										Reset Progress
									</button>
									<button class="btn btn-sm btn-error" on:click={() => handleDelete(quiz.id)}>
										Delete
									</button>
								</div>
							</td>
							<td>
								<div class="flex">
									<button
										class="btn btn-sm btn-ghost"
										on:click={() => moveUp(index, group)}
										aria-label="Move quiz up"
										disabled={updatingSequence}
									>
										↑
									</button>
									<button
										class="btn btn-sm btn-ghost"
										on:click={() => moveDown(index, group)}
										aria-label="Move quiz down"
										disabled={updatingSequence}
									>
										↓
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}
</div>

<!-- Reset Progress Modal -->
{#if resetModalOpen}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="modal modal-open" on:click|self={closeResetModal}>
		<div class="modal-box">
			<h3 class="text-lg font-bold">Reset Progress: {resetQuizTitle}</h3>

			{#if resetMode === 'choose'}
				<p class="py-4 text-sm text-gray-500">
					Choose whether to reset progress for all users or a specific user.
				</p>
				<div class="flex flex-col gap-3">
					<button class="btn btn-warning" on:click={() => (resetMode = 'all-confirm')}>
						Reset All Users
					</button>
					<button class="btn btn-outline" on:click={() => (resetMode = 'single')}>
						Reset One User
					</button>
				</div>

			{:else if resetMode === 'all-confirm'}
				<p class="py-4 text-sm text-red-600">
					This will delete all user progress for this quiz. Every user will need to retake it. Are you sure?
				</p>
				<div class="modal-action">
					<button class="btn" on:click={() => (resetMode = 'choose')}>Back</button>
					<button
						class="btn btn-error"
						disabled={resetLoading}
						on:click={() => resetProgress()}
					>
						{resetLoading ? 'Resetting...' : 'Confirm Reset All'}
					</button>
				</div>

			{:else if resetMode === 'single'}
				<div class="py-4">
					<label class="label" for="user-search">
						<span class="label-text">Search by email or name</span>
					</label>
					<input
						id="user-search"
						type="text"
						class="input input-bordered w-full"
						placeholder="Type to search..."
						bind:value={userSearchQuery}
						on:input={handleSearchInput}
					/>

					{#if userSearchLoading}
						<div class="mt-2 text-sm text-gray-500">Searching...</div>
					{/if}

					{#if userSearchResults.length > 0}
						<ul class="menu mt-2 rounded-box bg-base-200">
							{#each userSearchResults as u}
								<li>
									<button on:click={() => selectUser(u)}>
										{u.firstName || ''} {u.lastName || ''} — {u.email || 'no email'}
									</button>
								</li>
							{/each}
						</ul>
					{/if}

					{#if selectedUser}
						<div class="alert mt-3">
							<span>Selected: <strong>{selectedUser.firstName || ''} {selectedUser.lastName || ''}</strong> ({selectedUser.email})</span>
						</div>
					{/if}
				</div>
				<div class="modal-action">
					<button class="btn" on:click={() => (resetMode = 'choose')}>Back</button>
					<button
						class="btn btn-warning"
						disabled={!selectedUser}
						on:click={() => (resetMode = 'single-confirm')}
					>
						Next
					</button>
				</div>

			{:else if resetMode === 'single-confirm'}
				<p class="py-4 text-sm text-red-600">
					Reset quiz progress for <strong>{selectedUser?.firstName || ''} {selectedUser?.lastName || ''}</strong> ({selectedUser?.email})? They will need to retake this quiz.
				</p>
				<div class="modal-action">
					<button class="btn" on:click={() => (resetMode = 'single')}>Back</button>
					<button
						class="btn btn-error"
						disabled={resetLoading}
						on:click={() => resetProgress(selectedUser?.id)}
					>
						{resetLoading ? 'Resetting...' : 'Confirm Reset'}
					</button>
				</div>

			{:else if resetMode === 'result'}
				<div class="py-4">
					<div class="alert alert-success">
						<span>Reset complete. {resetResultCount} progress record{resetResultCount !== 1 ? 's' : ''} deleted.</span>
					</div>
				</div>
				<div class="modal-action">
					<button class="btn" on:click={closeResetModal}>Close</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
