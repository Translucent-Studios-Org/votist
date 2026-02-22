<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { goto } from '$app/navigation';

	const dispatch = createEventDispatcher<{
		saved: void;
		error: { message: string };
	}>();

	export let post: any;

	// Hardcoded categories as requested
	const categories = [
		'General Discussion',
		'Policy & Governance',
		'Community Issues',
		'Local Development',
		'Environment',
		'Education',
		'Healthcare',
		'Transportation',
		'Housing',
		'Public Safety',
		'Technology',
		'Economy',
		'Culture & Arts',
		'Sports & Recreation',
		'Other'
	];

	let title = post.title || '';
	let content = post.content || '';
	let category = post.category || categories[0];
	let tags: string[] = post.tags || [];
	let tagInput = '';

	// Display settings
	let showTitle = post.showTitle ?? true;
	let showContent = post.showContent ?? true;

	// Poll-related fields
	let includePoll = !!post.poll;
	let pollQuestion = post.poll?.question || '';
	let pollOptions: string[] = post.poll?.options?.map((opt: any) => opt.text) || ['', ''];
	let pollEndsAt = post.poll?.endsAt ? new Date(post.poll.endsAt).toISOString().slice(0, 16) : '';

	// Quiz Gate fields (initialized from existing post data)
	let enableQuizGate = post.quizGateType && post.quizGateType !== 'NONE';
	let quizGateType: 'DIFFICULTY' | 'SPECIFIC_QUIZ' = (post.quizGateType === 'SPECIFIC_QUIZ' ? 'SPECIFIC_QUIZ' : 'DIFFICULTY');
	let quizGateDifficulty: 'VOTIST' | 'SCHOLAR' | 'MENTOR' = post.quizGateDifficulty || 'VOTIST';
	let quizGateQuizId: string | null = post.quizGateQuizId || null;
	let quizGateQuizTitle: string = post.quizGateQuiz?.title || '';
	let quizSearchQuery = post.quizGateQuiz?.title || '';
	let quizSearchResults: Array<{ id: string; title: string; difficulty: string; order: number }> = [];
	let showQuizDropdown = false;
	let searchTimeout: ReturnType<typeof setTimeout>;

	function addTag() {
		const tag = tagInput.trim();
		if (tag && !tags.includes(tag)) {
			tags = [...tags, tag];
			tagInput = '';
		}
	}

	function removeTag(tagToRemove: string) {
		tags = tags.filter((tag) => tag !== tagToRemove);
	}

	function addPollOption() {
		pollOptions = [...pollOptions, ''];
	}

	function removePollOption(index: number) {
		if (pollOptions.length > 2) {
			pollOptions = pollOptions.filter((_, i) => i !== index);
		}
	}

	function updatePollOption(index: number, value: string) {
		pollOptions = pollOptions.map((option, i) => (i === index ? value : option));
	}

	async function searchQuizzes(query: string) {
		try {
			const res = await fetch(`/api/quizzes/search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			if (data.quizzes) {
				quizSearchResults = data.quizzes;
			}
		} catch (e) {
			console.error('Failed to search quizzes:', e);
		}
	}

	function handleQuizSearch(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		quizSearchQuery = value;
		clearTimeout(searchTimeout);
		if (value.trim()) {
			searchTimeout = setTimeout(() => searchQuizzes(value), 300);
			showQuizDropdown = true;
		} else {
			searchTimeout = setTimeout(() => searchQuizzes(''), 300);
			showQuizDropdown = true;
		}
	}

	function selectQuiz(quiz: { id: string; title: string; difficulty: string }) {
		quizGateQuizId = quiz.id;
		quizGateQuizTitle = quiz.title;
		quizSearchQuery = quiz.title;
		showQuizDropdown = false;
	}

	function clearQuizSelection() {
		quizGateQuizId = null;
		quizGateQuizTitle = '';
		quizSearchQuery = '';
		quizSearchResults = [];
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.relative')) {
			showQuizDropdown = false;
		}
	}

	async function handleSubmit() {
		if (!title.trim() || !content.trim()) {
			showToast('Title and content are required', 'error');
			return;
		}

		if (includePoll && (!pollQuestion.trim() || pollOptions.some((opt) => !opt.trim()))) {
			showToast('Poll question and all options are required when including a poll', 'error');
			return;
		}

		try {
			const postData: any = {
				title: title.trim(),
				content: content.trim(),
				category,
				tags,
				showTitle,
				showContent,
				quizGateType: enableQuizGate ? quizGateType : 'NONE',
				quizGateDifficulty: enableQuizGate && quizGateType === 'DIFFICULTY' ? quizGateDifficulty : null,
				quizGateQuizId: enableQuizGate && quizGateType === 'SPECIFIC_QUIZ' ? quizGateQuizId : null
			};

			if (includePoll) {
				postData.poll = {
					question: pollQuestion.trim(),
					options: pollOptions.filter((opt) => opt.trim()).map((opt) => ({ text: opt.trim() })),
					endsAt: pollEndsAt ? new Date(pollEndsAt).toISOString() : null
				};
			}

			const response = await fetch(`/api/posts/${post.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(postData)
			});

			if (response.ok) {
				dispatch('saved');
				// Redirect to posts page with success message
				goto('/admin/posts?success=Post updated successfully!');
			} else {
				const error = await response.text();
				console.error('Error updating post:', error);
				showToast('Failed to update post. Please try again.', 'error');
				dispatch('error', { message: error });
			}
		} catch (error) {
			showToast('Error saving post', 'error');
			console.error('Error:', error);
		}
	}

	function showToast(message: string, type: 'success' | 'error' = 'success') {
		const toast = document.createElement('div');
		toast.className = `toast toast-end`;
		toast.innerHTML = `
            <div class="alert ${type === 'success' ? 'alert-success' : 'alert-error'}">
                <span>${message}</span>
            </div>
        `;
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 3000);
	}
</script>

<form on:submit|preventDefault={handleSubmit} on:click={handleClickOutside} class="space-y-6">
	<div class="form-control w-full">
		<label class="label" for="title">
			<span class="label-text font-semibold">Post Title</span>
		</label>
		<input
			id="title"
			type="text"
			class="input input-bordered w-full text-lg"
			bind:value={title}
			required
			placeholder="Enter a compelling title for your post..."
		/>
		<div class="label">
			<span class="label-text-alt text-gray-500">
				Make your title clear and engaging to attract readers.
			</span>
		</div>
	</div>

	<div class="form-control w-full">
		<label class="label" for="content">
			<span class="label-text font-semibold">Post Content</span>
		</label>
		<textarea
			id="content"
			class="textarea textarea-bordered min-h-[200px] w-full resize-y"
			bind:value={content}
			required
			placeholder="Write your post content here... Share your thoughts, ideas, or questions with the community."
		></textarea>
		<div class="label">
			<span class="label-text-alt text-gray-500">
				Write engaging content that encourages discussion and community participation.
			</span>
		</div>
	</div>

	<div class="form-control w-full max-w-xs">
		<label class="label" for="category">
			<span class="label-text">Category</span>
		</label>
		<select id="category" class="select select-bordered w-full" bind:value={category} required>
			{#each categories as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>
	</div>

	<div class="form-control w-full">
		<label class="label" for="tags">
			<span class="label-text">Tags</span>
		</label>
		<div class="join w-full">
			<input
				id="tags"
				type="text"
				class="input input-bordered join-item flex-1"
				bind:value={tagInput}
				placeholder="Add a tag"
				on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
			/>
			<button type="button" class="btn btn-primary join-item" on:click={addTag}> Add Tag </button>
		</div>
		{#if tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-2">
				{#each tags as tag}
					<div class="badge badge-primary gap-2">
						{tag}
						<button
							type="button"
							class="btn btn-xs btn-circle btn-ghost"
							on:click={() => removeTag(tag)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="divider">Display Settings</div>

	<div class="card bg-base-200 space-y-2 p-4">
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Show title on post</span>
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={showTitle} />
			</label>
		</div>
		<div class="form-control">
			<label class="label cursor-pointer">
				<span class="label-text">Show content/description on post</span>
				<input type="checkbox" class="checkbox checkbox-primary" bind:checked={showContent} />
			</label>
		</div>
		<div class="label">
			<span class="label-text-alt text-gray-500">
				Controls whether title and content are visible to voters. Admin views always show both.
			</span>
		</div>
	</div>

	<div class="divider">Optional Poll</div>

	<div class="form-control">
		<label class="label cursor-pointer">
			<span class="label-text">Include a poll with this post</span>
			<input type="checkbox" class="checkbox checkbox-primary" bind:checked={includePoll} />
		</label>
	</div>

	{#if includePoll}
		<div class="card bg-base-200 space-y-4 p-4">
			<div class="form-control">
				<label class="label" for="poll-question">
					<span class="label-text">Poll Question</span>
				</label>
				<input
					id="poll-question"
					type="text"
					class="input input-bordered w-full"
					bind:value={pollQuestion}
					placeholder="What is your opinion on..."
				/>
			</div>

			<div class="form-control">
				<label class="label" for="poll-options">
					<span class="label-text">Poll Options</span>
				</label>
				{#each pollOptions as option, index}
					<div class="join mb-2">
						<input
							type="text"
							class="input input-bordered join-item flex-1"
							bind:value={pollOptions[index]}
							placeholder="Option {index + 1}"
						/>
						{#if pollOptions.length > 2}
							<button
								type="button"
								class="btn btn-error join-item"
								on:click={() => removePollOption(index)}
							>
								×
							</button>
						{/if}
					</div>
				{/each}
				<button type="button" class="btn btn-sm btn-outline" on:click={addPollOption}>
					Add Option
				</button>
			</div>

			<div class="form-control">
				<label class="label" for="poll-ends">
					<span class="label-text">Poll End Date (optional)</span>
				</label>
				<input
					id="poll-ends"
					type="datetime-local"
					class="input input-bordered w-full"
					bind:value={pollEndsAt}
				/>
			</div>
		</div>
	{/if}

	<div class="divider">Quiz Gate / Access Control</div>

	<div class="form-control">
		<label class="label cursor-pointer">
			<span class="label-text">Require quiz completion to participate</span>
			<input type="checkbox" class="checkbox checkbox-primary" bind:checked={enableQuizGate} />
		</label>
		<div class="label">
			<span class="label-text-alt text-gray-500">
				When enabled, users must complete specific quizzes before they can vote or comment on this post.
			</span>
		</div>
	</div>

	{#if enableQuizGate}
		<div class="card bg-base-200 space-y-4 p-4">
			<div class="form-control">
				<label class="label">
					<span class="label-text">Gate Type</span>
				</label>
				<div class="flex gap-4">
					<label class="label cursor-pointer gap-2">
						<input
							type="radio"
							name="quizGateType"
							class="radio radio-primary"
							value="DIFFICULTY"
							bind:group={quizGateType}
						/>
						<span class="label-text">Difficulty Level</span>
					</label>
					<label class="label cursor-pointer gap-2">
						<input
							type="radio"
							name="quizGateType"
							class="radio radio-primary"
							value="SPECIFIC_QUIZ"
							bind:group={quizGateType}
						/>
						<span class="label-text">Specific Quiz</span>
					</label>
				</div>
			</div>

			{#if quizGateType === 'DIFFICULTY'}
				<div class="form-control">
					<label class="label" for="quiz-gate-difficulty">
						<span class="label-text">Required Difficulty Level</span>
					</label>
					<select
						id="quiz-gate-difficulty"
						class="select select-bordered w-full"
						bind:value={quizGateDifficulty}
					>
						<option value="VOTIST">VOTIST - Complete all basic quizzes</option>
						<option value="SCHOLAR">SCHOLAR - Complete all basic + intermediate quizzes</option>
						<option value="MENTOR">MENTOR - Complete all quizzes</option>
					</select>
					<div class="label">
						<span class="label-text-alt text-gray-500">
							Users must complete ALL quizzes at this level and below to participate.
						</span>
					</div>
				</div>
			{:else}
				<div class="form-control">
					<label class="label" for="quiz-gate-search">
						<span class="label-text">Select Required Quiz</span>
					</label>
					<div class="relative">
						<input
							id="quiz-gate-search"
							type="text"
							class="input input-bordered w-full"
							placeholder="Search quizzes by title..."
							value={quizSearchQuery}
							on:input={handleQuizSearch}
							on:focus={() => { showQuizDropdown = true; searchQuizzes(quizSearchQuery); }}
							autocomplete="off"
						/>
						{#if quizGateQuizId}
							<button
								type="button"
								class="btn btn-sm btn-circle btn-ghost absolute right-2 top-1/2 -translate-y-1/2"
								on:click={clearQuizSelection}
							>
								×
							</button>
						{/if}

						{#if showQuizDropdown && quizSearchResults.length > 0}
							<div class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
								{#each quizSearchResults as quiz}
									<button
										type="button"
										class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 {quiz.id === quizGateQuizId ? 'bg-primary/10' : ''}"
										on:click={() => selectQuiz(quiz)}
									>
										<div>
											<div class="font-medium">{quiz.title}</div>
											<div class="text-sm text-gray-500">
												{quiz.difficulty} · Order #{quiz.order}
											</div>
										</div>
										{#if quiz.id === quizGateQuizId}
											<span class="badge badge-primary badge-sm">Selected</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					{#if quizGateQuizId}
						<div class="label">
							<span class="label-text-alt text-success">
								Selected: {quizGateQuizTitle}
							</span>
						</div>
					{:else}
						<div class="label">
							<span class="label-text-alt text-gray-500">
								Search for and select a specific quiz that users must complete.
							</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	<div class="flex justify-between">
		<a href="/admin/posts" class="btn">Back to Posts</a>
		<div class="join">
			<a href="/admin/posts" class="btn join-item">Cancel</a>
			<button type="submit" class="btn btn-primary join-item">Update Post</button>
		</div>
	</div>
</form>
