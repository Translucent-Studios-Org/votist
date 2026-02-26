<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Vote, MessageSquare, BookOpen, Heart, ArrowLeft, Shield, ShieldOff, UserCheck, UserX, AlertTriangle, Ban, Mail, CheckCircle, XCircle } from 'lucide-svelte';

	// ─── Types ───────────────────────────────────────────────────────────────────

	interface UserDetail {
		id: string;
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		displayName: string | null;
		useDisplayName: boolean;
		avatarUrl: string | null;
		role: string;
		isAdmin: boolean;
		isResident: boolean;
		isBanned: boolean;
		banType: string | null;
		banReason: string | null;
		bannedAt: string | null;
		banExpiresAt: string | null;
		createdAt: string;
	}

	interface Counts {
		votes: number;
		comments: number;
		postLikes: number;
		commentLikes: number;
		quizzesCompleted: number;
		quizzesTaken: number;
	}

	interface ModerationEntry {
		id: string;
		action: string;
		reason: string | null;
		createdAt: string;
		admin: { firstName: string | null; lastName: string | null };
	}

	interface Activity {
		type: 'vote' | 'comment' | 'quiz' | 'like';
		date: string;
		details: Record<string, any>;
	}

	interface VoteEntry {
		id: string;
		postId: string;
		postTitle: string;
		pollQuestion: string;
		optionText: string;
		createdAt: string;
	}

	interface CommentEntry {
		id: string;
		content: string;
		postId: string;
		postTitle: string;
		likes: number;
		createdAt: string;
	}

	interface QuizEntry {
		quizId: string;
		quizTitle: string;
		difficulty: string;
		score: number;
		passingScore: number;
		isCompleted: boolean;
		completedAt: string | null;
	}

	// ─── State ───────────────────────────────────────────────────────────────────

	let userId = $page.params.id;

	let user: UserDetail | null = null;
	let counts: Counts | null = null;
	let moderationHistory: ModerationEntry[] = [];
	let pageLoading = true;

	// Tab state
	let activeTab: 'activity' | 'votes' | 'comments' | 'quizzes' | 'moderation' = 'activity';
	let tabLoading = false;

	// Activity tab
	let activities: Activity[] = [];
	let activityPage = 1;
	let activityTotal = 0;
	let activityTotalPages = 0;
	let activityLoadingMore = false;

	// Votes tab
	let votes: VoteEntry[] = [];
	let votePage = 1;
	let voteTotal = 0;
	let voteTotalPages = 0;

	// Comments tab
	let comments: CommentEntry[] = [];
	let commentPage = 1;
	let commentTotal = 0;
	let commentTotalPages = 0;

	// Quizzes tab
	let quizzes: QuizEntry[] = [];

	// Toast
	let toastMessage = '';
	let toastType: 'success' | 'error' = 'success';
	let showToast = false;
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	// Action loading flags
	let actionLoading = false;

	// Modal visibility
	let showRoleModal = false;
	let showResidentModal = false;
	let showBanModal = false;
	let showWarnModal = false;
	let showUnbanModal = false;
	let showEmailModal = false;

	// Ban modal fields
	let banType: 'permanent' | 'temporary' = 'permanent';
	let banDuration = 7;
	let banReason = '';

	// Warn modal fields
	let warnMessage = '';

	// Unban modal fields
	let unbanReason = '';

	// Email modal fields
	let emailSubject = '';
	let emailBody = '';
	let emailTemplate = 'custom';

	const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
		welcome: {
			subject: 'Welcome to Votist!',
			body: `Hi {name},\n\nWelcome to Votist! We're glad to have you as part of our community.\n\nGet started by exploring the latest polls and sharing your voice.\n\nBest,\nThe Votist Team`
		},
		quiz_reminder: {
			subject: 'Complete Your Quiz to Unlock Full Access',
			body: `Hi {name},\n\nYou haven't completed your community quiz yet. Finishing it will unlock full voting privileges and more!\n\nHead to your profile to take the quiz now.\n\nBest,\nThe Votist Team`
		},
		engagement: {
			subject: "We miss you! Here's what's new on Votist",
			body: `Hi {name},\n\nIt's been a while since we've seen you! There are new polls waiting for your vote.\n\nCome back and make your voice heard.\n\nBest,\nThe Votist Team`
		},
		custom: {
			subject: '',
			body: ''
		}
	};

	// ─── Utilities ───────────────────────────────────────────────────────────────

	function formatName(u: UserDetail | null) {
		if (!u) return 'Unknown User';
		if (u.useDisplayName && u.displayName) return u.displayName;
		return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unknown User';
	}

	function getInitials(u: UserDetail | null) {
		if (!u) return '??';
		const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
		if (!name) return (u.email || '??').slice(0, 2).toUpperCase();
		return name
			.split(' ')
			.map((p) => p[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatDateTime(dateStr: string | null | undefined) {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncate(str: string, len: number) {
		return str.length > len ? str.slice(0, len) + '...' : str;
	}

	function actionLabel(action: string) {
		switch (action) {
			case 'WARN': return 'Warning';
			case 'BAN': return 'Banned';
			case 'SUSPEND': return 'Suspended';
			case 'UNBAN': return 'Unbanned';
			default: return action;
		}
	}

	function actionBadgeClass(action: string) {
		switch (action) {
			case 'WARN': return 'badge-warning';
			case 'BAN': return 'badge-error';
			case 'SUSPEND': return 'badge-warning';
			case 'UNBAN': return 'badge-success';
			default: return 'badge-ghost';
		}
	}

	function difficultyBadgeClass(difficulty: string) {
		switch (difficulty) {
			case 'VOTIST': return 'badge-primary';
			case 'SCHOLAR': return 'badge-secondary';
			case 'EXPERT': return 'badge-accent';
			default: return 'badge-ghost';
		}
	}

	function activityDescription(a: Activity) {
		switch (a.type) {
			case 'vote':
				return `Voted "${a.details.optionText}" on <strong>${a.details.postTitle}</strong>`;
			case 'comment':
				return `Commented on <strong>${a.details.postTitle}</strong>: "${truncate(a.details.content ?? '', 80)}"`;
			case 'quiz':
				return `Took quiz <strong>${a.details.quizTitle}</strong> — scored ${a.details.score}% (${a.details.passed ? 'Passed' : 'Failed'})`;
			case 'like':
				return `Liked post <strong>${a.details.postTitle}</strong>`;
			default:
				return 'Unknown activity';
		}
	}

	// ─── Toast ───────────────────────────────────────────────────────────────────

	function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
		if (toastTimeout) clearTimeout(toastTimeout);
		toastMessage = msg;
		toastType = type;
		showToast = true;
		toastTimeout = setTimeout(() => {
			showToast = false;
			toastTimeout = null;
		}, 5000);
	}

	function hideToast() {
		showToast = false;
		if (toastTimeout) {
			clearTimeout(toastTimeout);
			toastTimeout = null;
		}
	}

	// ─── Data Loading ─────────────────────────────────────────────────────────────

	async function loadUser() {
		const res = await fetch(`/api/admin/users/${userId}`);
		if (!res.ok) throw new Error('Failed to load user');
		const data = await res.json();
		user = data.user;
		counts = data.counts;
		moderationHistory = data.moderationHistory ?? [];
	}

	async function loadActivity(reset = false) {
		if (reset) { activityPage = 1; activities = []; }
		tabLoading = reset;
		activityLoadingMore = !reset;
		try {
			const res = await fetch(`/api/admin/users/${userId}/activity?page=${activityPage}&pageSize=20`);
			const data = await res.json();
			activities = reset ? (data.activities ?? []) : [...activities, ...(data.activities ?? [])];
			activityTotal = data.total ?? 0;
			activityTotalPages = data.totalPages ?? 0;
		} finally {
			tabLoading = false;
			activityLoadingMore = false;
		}
	}

	async function loadVotes(p = 1) {
		tabLoading = true;
		votePage = p;
		try {
			const res = await fetch(`/api/admin/users/${userId}/votes?page=${p}&pageSize=20`);
			const data = await res.json();
			votes = data.votes ?? [];
			voteTotal = data.total ?? 0;
			voteTotalPages = data.totalPages ?? 0;
		} finally {
			tabLoading = false;
		}
	}

	async function loadComments(p = 1) {
		tabLoading = true;
		commentPage = p;
		try {
			const res = await fetch(`/api/admin/users/${userId}/comments?page=${p}&pageSize=20`);
			const data = await res.json();
			comments = data.comments ?? [];
			commentTotal = data.total ?? 0;
			commentTotalPages = data.totalPages ?? 0;
		} finally {
			tabLoading = false;
		}
	}

	async function loadQuizzes() {
		tabLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/quizzes`);
			const data = await res.json();
			quizzes = data.quizzes ?? [];
		} finally {
			tabLoading = false;
		}
	}

	async function switchTab(tab: typeof activeTab) {
		activeTab = tab;
		if (tab === 'activity' && activities.length === 0) await loadActivity(true);
		if (tab === 'votes' && votes.length === 0) await loadVotes(1);
		if (tab === 'comments' && comments.length === 0) await loadComments(1);
		if (tab === 'quizzes' && quizzes.length === 0) await loadQuizzes();
	}

	async function loadMoreActivity() {
		activityPage++;
		await loadActivity(false);
	}

	// ─── Actions ─────────────────────────────────────────────────────────────────

	async function toggleRole() {
		if (!user || actionLoading) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/role`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!res.ok) throw new Error('Failed');
			const data = await res.json();
			user = { ...user, isAdmin: data.isAdmin };
			showToastMsg(`Admin status ${data.isAdmin ? 'granted' : 'revoked'} for ${formatName(user)}`);
		} catch {
			showToastMsg('Failed to update role', 'error');
		} finally {
			actionLoading = false;
			showRoleModal = false;
		}
	}

	async function toggleResident() {
		if (!user || actionLoading) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/resident`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			if (!res.ok) throw new Error('Failed');
			const data = await res.json();
			user = { ...user, isResident: data.isResident };
			showToastMsg(`${formatName(user)} is now ${data.isResident ? 'a resident' : 'no longer a resident'}`);
		} catch {
			showToastMsg('Failed to update resident status', 'error');
		} finally {
			actionLoading = false;
			showResidentModal = false;
		}
	}

	async function submitBan() {
		if (!user || actionLoading || !banReason.trim()) return;
		actionLoading = true;
		try {
			const body: Record<string, any> = { type: banType, reason: banReason };
			if (banType === 'temporary') body.duration = banDuration;
			const res = await fetch(`/api/admin/users/${userId}/ban`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new Error('Failed');
			user = { ...user, isBanned: true, banType, banReason };
			showToastMsg(`${formatName(user)} has been ${banType === 'permanent' ? 'banned' : 'suspended'}`);
			await loadUser();
			banReason = '';
		} catch {
			showToastMsg('Failed to ban user', 'error');
		} finally {
			actionLoading = false;
			showBanModal = false;
		}
	}

	async function submitWarn() {
		if (!user || actionLoading || !warnMessage.trim()) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/warn`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: warnMessage })
			});
			if (!res.ok) throw new Error('Failed');
			showToastMsg(`Warning sent to ${formatName(user)}`);
			warnMessage = '';
			// Refresh moderation history
			await loadUser();
		} catch {
			showToastMsg('Failed to send warning', 'error');
		} finally {
			actionLoading = false;
			showWarnModal = false;
		}
	}

	async function submitUnban() {
		if (!user || actionLoading) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/unban`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason: unbanReason || 'Unbanned by admin' })
			});
			if (!res.ok) throw new Error('Failed');
			user = { ...user, isBanned: false, banType: null, banReason: null };
			showToastMsg(`${formatName(user)} has been unbanned`);
			unbanReason = '';
			await loadUser();
		} catch {
			showToastMsg('Failed to unban user', 'error');
		} finally {
			actionLoading = false;
			showUnbanModal = false;
		}
	}

	async function submitEmail() {
		if (!user || actionLoading || !emailSubject.trim() || !emailBody.trim()) return;
		actionLoading = true;
		try {
			const res = await fetch(`/api/admin/users/${userId}/email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					subject: emailSubject,
					body: emailBody,
					template: emailTemplate !== 'custom' ? emailTemplate : undefined
				})
			});
			if (!res.ok) throw new Error('Failed');
			showToastMsg(`Email sent to ${formatName(user)}`);
			emailSubject = '';
			emailBody = '';
			emailTemplate = 'custom';
		} catch {
			showToastMsg('Failed to send email', 'error');
		} finally {
			actionLoading = false;
			showEmailModal = false;
		}
	}

	function applyTemplate(tpl: string) {
		emailTemplate = tpl;
		if (tpl !== 'custom' && EMAIL_TEMPLATES[tpl]) {
			const name = formatName(user);
			emailSubject = EMAIL_TEMPLATES[tpl].subject;
			emailBody = EMAIL_TEMPLATES[tpl].body.replace(/{name}/g, name);
		}
	}

	// ─── Lifecycle ───────────────────────────────────────────────────────────────

	onMount(async () => {
		try {
			await loadUser();
			// Pre-load the first tab
			await loadActivity(true);
		} catch (e) {
			console.error('Failed to load user detail:', e);
		} finally {
			pageLoading = false;
		}
	});

	onDestroy(() => {
		if (toastTimeout) clearTimeout(toastTimeout);
	});
</script>

<!-- ─── Toast ─────────────────────────────────────────────────────────────────── -->
<div class="toast toast-top toast-end z-50">
	{#if showToast}
		<div class="alert {toastType === 'success' ? 'alert-success' : 'alert-error'} shadow-lg">
			{#if toastType === 'success'}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			{/if}
			<span class="text-sm">{toastMessage}</span>
			<button class="btn btn-sm btn-circle btn-ghost" on:click={hideToast} aria-label="Dismiss">✕</button>
		</div>
	{/if}
</div>

<!-- ─── Full-page loading ─────────────────────────────────────────────────────── -->
{#if pageLoading}
	<div class="flex min-h-96 items-center justify-center">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if !user}
	<div class="py-16 text-center">
		<p class="text-xl text-gray-500">User not found.</p>
		<a href="/admin/users" class="btn btn-primary mt-4">Back to Users</a>
	</div>
{:else}

<!-- ─── Back Button ────────────────────────────────────────────────────────────── -->
<div class="mb-4">
	<button class="btn btn-ghost btn-sm gap-1" on:click={() => goto('/admin/users')}>
		<ArrowLeft size={16} />
		Back to Users
	</button>
</div>

<!-- ─── Profile Header ────────────────────────────────────────────────────────── -->
<div class="card bg-base-100 shadow mb-6">
	<div class="card-body">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<!-- Avatar + Identity -->
			<div class="flex items-start gap-4">
				<!-- Avatar -->
				<div class="relative shrink-0">
					{#if user.avatarUrl}
						<img
							src={user.avatarUrl}
							alt={formatName(user)}
							class="h-16 w-16 rounded-full object-cover ring-2 ring-base-300"
						/>
					{:else}
						<div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-content text-xl font-bold ring-2 ring-base-300">
							{getInitials(user)}
						</div>
					{/if}
				</div>

				<!-- Name / Email / Badges -->
				<div>
					<h1 class="text-2xl font-bold leading-tight">{formatName(user)}</h1>
					{#if user.displayName && !user.useDisplayName}
						<p class="text-sm text-gray-500">Display name: {user.displayName}</p>
					{/if}
					<p class="text-sm text-gray-500 mt-0.5">{user.email ?? '—'}</p>
					<p class="text-xs text-gray-400 mt-1">Joined {formatDate(user.createdAt)}</p>

					<!-- Badges -->
					<div class="mt-2 flex flex-wrap gap-1">
						{#if user.isAdmin}
							<span class="badge badge-primary badge-sm">Admin</span>
						{/if}
						{#if user.isResident}
							<span class="badge badge-info badge-sm">Resident</span>
						{/if}
						{#if user.isBanned && user.banType === 'permanent'}
							<span class="badge badge-error badge-sm">Banned</span>
						{:else if user.isBanned}
							<span class="badge badge-warning badge-sm">Suspended</span>
						{/if}
						{#if !user.isAdmin && !user.isResident && !user.isBanned}
							<span class="badge badge-ghost badge-sm capitalize">{user.role}</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Quick Actions -->
			<div class="flex flex-wrap gap-2 sm:justify-end">
				<!-- Role toggle -->
				<button
					class="btn btn-sm {user.isAdmin ? 'btn-outline btn-error' : 'btn-outline btn-primary'}"
					on:click={() => (showRoleModal = true)}
					disabled={actionLoading}
					title={user.isAdmin ? 'Remove admin' : 'Make admin'}
				>
					{#if user.isAdmin}
						<ShieldOff size={14} />
						Remove Admin
					{:else}
						<Shield size={14} />
						Make Admin
					{/if}
				</button>

				<!-- Resident toggle -->
				<button
					class="btn btn-sm {user.isResident ? 'btn-outline btn-warning' : 'btn-outline btn-info'}"
					on:click={() => (showResidentModal = true)}
					disabled={actionLoading}
				>
					{#if user.isResident}
						<UserX size={14} />
						Remove Resident
					{:else}
						<UserCheck size={14} />
						Set Resident
					{/if}
				</button>

				<!-- Warn -->
				<button
					class="btn btn-sm btn-outline btn-warning"
					on:click={() => (showWarnModal = true)}
					disabled={actionLoading}
				>
					<AlertTriangle size={14} />
					Warn
				</button>

				<!-- Ban / Unban -->
				{#if user.isBanned}
					<button
						class="btn btn-sm btn-outline btn-success"
						on:click={() => (showUnbanModal = true)}
						disabled={actionLoading}
					>
						<CheckCircle size={14} />
						Unban
					</button>
				{:else}
					<button
						class="btn btn-sm btn-outline btn-error"
						on:click={() => (showBanModal = true)}
						disabled={actionLoading}
					>
						<Ban size={14} />
						Ban / Suspend
					</button>
				{/if}

				<!-- Contact -->
				<button
					class="btn btn-sm btn-outline"
					on:click={() => (showEmailModal = true)}
					disabled={actionLoading}
				>
					<Mail size={14} />
					Contact
				</button>
			</div>
		</div>
	</div>
</div>

<!-- ─── Stat Cards ─────────────────────────────────────────────────────────────── -->
{#if counts}
<div class="stats stats-vertical lg:stats-horizontal shadow w-full mb-6 bg-base-100">
	<div class="stat">
		<div class="stat-title">Votes Cast</div>
		<div class="stat-value text-primary">{counts.votes}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Comments</div>
		<div class="stat-value text-secondary">{counts.comments}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Quizzes</div>
		<div class="stat-value text-accent">{counts.quizzesCompleted}<span class="text-lg text-gray-400">/{counts.quizzesTaken}</span></div>
		<div class="stat-desc">Completed / Taken</div>
	</div>
	<div class="stat">
		<div class="stat-title">Post Likes</div>
		<div class="stat-value">{counts.postLikes}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Comment Likes</div>
		<div class="stat-value">{counts.commentLikes}</div>
	</div>
	<div class="stat">
		<div class="stat-title">Mod Actions</div>
		<div class="stat-value {moderationHistory.length > 0 ? 'text-warning' : ''}">{moderationHistory.length}</div>
	</div>
</div>
{/if}

<!-- ─── Tabs ───────────────────────────────────────────────────────────────────── -->
<div class="tabs tabs-boxed mb-4 w-fit flex-wrap gap-1">
	<button class="tab {activeTab === 'activity' ? 'tab-active' : ''}" on:click={() => switchTab('activity')}>
		Activity
	</button>
	<button class="tab {activeTab === 'votes' ? 'tab-active' : ''}" on:click={() => switchTab('votes')}>
		Votes {#if counts}({counts.votes}){/if}
	</button>
	<button class="tab {activeTab === 'comments' ? 'tab-active' : ''}" on:click={() => switchTab('comments')}>
		Comments {#if counts}({counts.comments}){/if}
	</button>
	<button class="tab {activeTab === 'quizzes' ? 'tab-active' : ''}" on:click={() => switchTab('quizzes')}>
		Quizzes
	</button>
	<button class="tab {activeTab === 'moderation' ? 'tab-active' : ''}" on:click={() => switchTab('moderation')}>
		Moderation {#if moderationHistory.length > 0}({moderationHistory.length}){/if}
	</button>
</div>

<div class="card bg-base-100 shadow">
	<div class="card-body">
		{#if tabLoading}
			<div class="flex justify-center py-12">
				<span class="loading loading-spinner loading-lg"></span>
			</div>

		<!-- ── Activity Timeline ─────────────────────────────────────────────────── -->
		{:else if activeTab === 'activity'}
			{#if activities.length === 0}
				<p class="py-8 text-center text-gray-500">No activity recorded yet.</p>
			{:else}
				<div class="space-y-3">
					{#each activities as a}
						<div class="flex items-start gap-3 rounded-lg border border-base-200 p-3">
							<!-- Icon -->
							<div class="mt-0.5 shrink-0 rounded-full bg-base-200 p-1.5">
								{#if a.type === 'vote'}
									<Vote size={14} class="text-primary" />
								{:else if a.type === 'comment'}
									<MessageSquare size={14} class="text-secondary" />
								{:else if a.type === 'quiz'}
									<BookOpen size={14} class="text-accent" />
								{:else}
									<Heart size={14} class="text-error" />
								{/if}
							</div>
							<!-- Description -->
							<div class="min-w-0 flex-1">
								<p class="text-sm leading-snug">{@html activityDescription(a)}</p>
							</div>
							<!-- Date -->
							<span class="shrink-0 text-xs text-gray-400">{formatDateTime(a.date)}</span>
						</div>
					{/each}
				</div>

				{#if activityPage < activityTotalPages}
					<div class="mt-4 flex justify-center">
						<button
							class="btn btn-outline btn-sm"
							disabled={activityLoadingMore}
							on:click={loadMoreActivity}
						>
							{#if activityLoadingMore}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
							Load More
						</button>
					</div>
				{/if}

				<p class="mt-2 text-center text-xs text-gray-400">Showing {activities.length} of {activityTotal}</p>
			{/if}

		<!-- ── Voting History ─────────────────────────────────────────────────────── -->
		{:else if activeTab === 'votes'}
			{#if votes.length === 0}
				<p class="py-8 text-center text-gray-500">No votes recorded.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th>Poll Question</th>
								<th>Chosen Option</th>
								<th>Post</th>
								<th>Date</th>
							</tr>
						</thead>
						<tbody>
							{#each votes as v}
								<tr class="hover">
									<td class="max-w-xs">
										<span class="line-clamp-2 text-sm">{v.pollQuestion}</span>
									</td>
									<td>
										<span class="badge badge-outline badge-sm">{v.optionText}</span>
									</td>
									<td>
										<a
											href="/posts/{v.postId}"
											target="_blank"
											rel="noopener noreferrer"
											class="link link-primary text-sm"
										>
											{truncate(v.postTitle, 40)}
										</a>
									</td>
									<td class="text-sm text-gray-500 whitespace-nowrap">{formatDate(v.createdAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Pagination -->
				{#if voteTotalPages > 1}
					<div class="mt-4 flex items-center justify-between">
						<p class="text-sm text-gray-500">Page {votePage} of {voteTotalPages} ({voteTotal} total)</p>
						<div class="join">
							<button
								class="join-item btn btn-sm"
								disabled={votePage <= 1}
								on:click={() => loadVotes(votePage - 1)}
							>«</button>
							<button
								class="join-item btn btn-sm"
								disabled={votePage >= voteTotalPages}
								on:click={() => loadVotes(votePage + 1)}
							>»</button>
						</div>
					</div>
				{/if}
			{/if}

		<!-- ── Comments ──────────────────────────────────────────────────────────── -->
		{:else if activeTab === 'comments'}
			{#if comments.length === 0}
				<p class="py-8 text-center text-gray-500">No comments yet.</p>
			{:else}
				<div class="space-y-3">
					{#each comments as c}
						<div class="rounded-lg border border-base-200 p-4">
							<p class="text-sm leading-relaxed text-gray-800">{truncate(c.content, 200)}</p>
							<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
								<a
									href="/posts/{c.postId}"
									target="_blank"
									rel="noopener noreferrer"
									class="link link-primary font-medium"
								>
									{truncate(c.postTitle, 50)}
								</a>
								<span>{c.likes} {c.likes === 1 ? 'like' : 'likes'}</span>
								<span class="ml-auto">{formatDateTime(c.createdAt)}</span>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if commentTotalPages > 1}
					<div class="mt-4 flex items-center justify-between">
						<p class="text-sm text-gray-500">Page {commentPage} of {commentTotalPages} ({commentTotal} total)</p>
						<div class="join">
							<button
								class="join-item btn btn-sm"
								disabled={commentPage <= 1}
								on:click={() => loadComments(commentPage - 1)}
							>«</button>
							<button
								class="join-item btn btn-sm"
								disabled={commentPage >= commentTotalPages}
								on:click={() => loadComments(commentPage + 1)}
							>»</button>
						</div>
					</div>
				{/if}
			{/if}

		<!-- ── Quiz Performance ───────────────────────────────────────────────────── -->
		{:else if activeTab === 'quizzes'}
			{#if quizzes.length === 0}
				<p class="py-8 text-center text-gray-500">No quiz activity recorded.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th>Quiz Title</th>
								<th>Difficulty</th>
								<th>Score / Passing</th>
								<th>Status</th>
								<th>Completed At</th>
							</tr>
						</thead>
						<tbody>
							{#each quizzes as q}
								<tr class="hover">
									<td class="font-medium text-sm">{q.quizTitle}</td>
									<td>
										<span class="badge badge-sm {difficultyBadgeClass(q.difficulty)}">{q.difficulty}</span>
									</td>
									<td class="text-sm">
										<span class="{q.score >= q.passingScore ? 'text-success font-semibold' : 'text-error'}">{q.score}%</span>
										<span class="text-gray-400"> / {q.passingScore}%</span>
									</td>
									<td>
										{#if q.isCompleted && q.score >= q.passingScore}
											<span class="badge badge-success badge-sm">Passed</span>
										{:else if q.isCompleted}
											<span class="badge badge-error badge-sm">Failed</span>
										{:else}
											<span class="badge badge-ghost badge-sm">Incomplete</span>
										{/if}
									</td>
									<td class="text-sm text-gray-500 whitespace-nowrap">
										{q.completedAt ? formatDate(q.completedAt) : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

		<!-- ── Moderation History ─────────────────────────────────────────────────── -->
		{:else if activeTab === 'moderation'}
			{#if moderationHistory.length === 0}
				<p class="py-8 text-center text-gray-500">No moderation history.</p>
			{:else}
				<div class="space-y-3">
					{#each moderationHistory as entry}
						<div class="flex items-start gap-3 rounded-lg border border-base-200 p-4">
							<span class="badge {actionBadgeClass(entry.action)} badge-sm mt-0.5 shrink-0">
								{actionLabel(entry.action)}
							</span>
							<div class="min-w-0 flex-1">
								{#if entry.reason}
									<p class="text-sm">{entry.reason}</p>
								{/if}
								<p class="mt-1 text-xs text-gray-400">
									by {[entry.admin.firstName, entry.admin.lastName].filter(Boolean).join(' ') || 'Admin'}
								</p>
							</div>
							<span class="shrink-0 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(entry.createdAt)}</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- ════════════════════════════════════════════════════════════════════════════ -->
<!-- MODALS                                                                       -->
<!-- ════════════════════════════════════════════════════════════════════════════ -->

<!-- Role Modal -->
{#if showRoleModal}
<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">
			{user.isAdmin ? 'Remove Admin Access' : 'Grant Admin Access'}
		</h3>
		<p class="py-4 text-sm">
			{#if user.isAdmin}
				Are you sure you want to <strong>remove admin status</strong> from <strong>{formatName(user)}</strong>?
				They will lose access to the admin panel immediately.
			{:else}
				Are you sure you want to make <strong>{formatName(user)}</strong> an admin?
				This grants <strong>full admin panel access</strong> including user management, post editing, and moderation.
			{/if}
		</p>
		<div class="modal-action">
			<button class="btn btn-ghost btn-sm" on:click={() => (showRoleModal = false)} disabled={actionLoading}>
				Cancel
			</button>
			<button
				class="btn btn-sm {user.isAdmin ? 'btn-error' : 'btn-primary'}"
				disabled={actionLoading}
				on:click={toggleRole}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				{user.isAdmin ? 'Remove Admin' : 'Make Admin'}
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => (showRoleModal = false)}></div>
</div>
{/if}

<!-- Resident Modal -->
{#if showResidentModal}
<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">
			{user.isResident ? 'Remove Resident Status' : 'Set as Resident'}
		</h3>
		<p class="py-4 text-sm">
			{#if user.isResident}
				Remove resident status from <strong>{formatName(user)}</strong>?
				They will lose resident-level access and privileges.
			{:else}
				Set <strong>{formatName(user)}</strong> as a verified resident?
				This grants them resident-level access and privileges.
			{/if}
		</p>
		<div class="modal-action">
			<button class="btn btn-ghost btn-sm" on:click={() => (showResidentModal = false)} disabled={actionLoading}>
				Cancel
			</button>
			<button
				class="btn btn-sm {user.isResident ? 'btn-warning' : 'btn-info'}"
				disabled={actionLoading}
				on:click={toggleResident}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				{user.isResident ? 'Remove Resident' : 'Set Resident'}
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => (showResidentModal = false)}></div>
</div>
{/if}

<!-- Warn Modal -->
{#if showWarnModal}
<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Send Warning to {formatName(user)}</h3>
		<div class="py-4 space-y-3">
			<label class="form-control">
				<div class="label"><span class="label-text">Warning Message</span></div>
				<textarea
					class="textarea textarea-bordered h-32 text-sm"
					placeholder="Describe the reason for this warning..."
					bind:value={warnMessage}
				></textarea>
			</label>
		</div>
		<div class="modal-action">
			<button class="btn btn-ghost btn-sm" on:click={() => { showWarnModal = false; warnMessage = ''; }} disabled={actionLoading}>
				Cancel
			</button>
			<button
				class="btn btn-warning btn-sm"
				disabled={actionLoading || !warnMessage.trim()}
				on:click={submitWarn}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Send Warning
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => { showWarnModal = false; warnMessage = ''; }}></div>
</div>
{/if}

<!-- Ban Modal -->
{#if showBanModal}
<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Ban / Suspend {formatName(user)}</h3>
		<div class="py-4 space-y-4">
			<label class="form-control">
				<div class="label"><span class="label-text">Ban Type</span></div>
				<select class="select select-bordered select-sm" bind:value={banType}>
					<option value="permanent">Permanent Ban</option>
					<option value="temporary">Temporary Suspension</option>
				</select>
			</label>

			{#if banType === 'temporary'}
				<label class="form-control">
					<div class="label"><span class="label-text">Duration (days)</span></div>
					<input
						type="number"
						class="input input-bordered input-sm"
						min="1"
						max="365"
						bind:value={banDuration}
					/>
				</label>
			{/if}

			<label class="form-control">
				<div class="label"><span class="label-text">Reason <span class="text-error">*</span></span></div>
				<textarea
					class="textarea textarea-bordered h-24 text-sm"
					placeholder="Explain the reason for this action..."
					bind:value={banReason}
				></textarea>
			</label>
		</div>
		<div class="modal-action">
			<button class="btn btn-ghost btn-sm" on:click={() => { showBanModal = false; banReason = ''; }} disabled={actionLoading}>
				Cancel
			</button>
			<button
				class="btn btn-error btn-sm"
				disabled={actionLoading || !banReason.trim()}
				on:click={submitBan}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				{banType === 'permanent' ? 'Permanently Ban' : `Suspend for ${banDuration} day${banDuration === 1 ? '' : 's'}`}
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => { showBanModal = false; banReason = ''; }}></div>
</div>
{/if}

<!-- Unban Modal -->
{#if showUnbanModal}
<div class="modal modal-open">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Unban {formatName(user)}</h3>
		<p class="text-sm text-gray-500 mt-1">
			They will be able to comment, vote, and participate again immediately.
		</p>
		<div class="py-4">
			<label class="form-control">
				<div class="label"><span class="label-text">Reason (optional)</span></div>
				<textarea
					class="textarea textarea-bordered h-24 text-sm"
					placeholder="Reason for unbanning..."
					bind:value={unbanReason}
				></textarea>
			</label>
		</div>
		<div class="modal-action">
			<button class="btn btn-ghost btn-sm" on:click={() => { showUnbanModal = false; unbanReason = ''; }} disabled={actionLoading}>
				Cancel
			</button>
			<button
				class="btn btn-success btn-sm"
				disabled={actionLoading}
				on:click={submitUnban}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Confirm Unban
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => { showUnbanModal = false; unbanReason = ''; }}></div>
</div>
{/if}

<!-- Email Modal -->
{#if showEmailModal}
<div class="modal modal-open">
	<div class="modal-box max-w-lg">
		<h3 class="text-lg font-bold">Contact {formatName(user)}</h3>
		<div class="py-4 space-y-4">
			<label class="form-control">
				<div class="label"><span class="label-text">Template</span></div>
				<select
					class="select select-bordered select-sm"
					bind:value={emailTemplate}
					on:change={(e) => applyTemplate((e.target as HTMLSelectElement).value)}
				>
					<option value="custom">Custom Message</option>
					<option value="welcome">Welcome</option>
					<option value="quiz_reminder">Quiz Reminder</option>
					<option value="engagement">Engagement Follow-up</option>
				</select>
			</label>

			<label class="form-control">
				<div class="label"><span class="label-text">Subject <span class="text-error">*</span></span></div>
				<input
					type="text"
					class="input input-bordered input-sm"
					placeholder="Email subject..."
					bind:value={emailSubject}
				/>
			</label>

			<label class="form-control">
				<div class="label"><span class="label-text">Message <span class="text-error">*</span></span></div>
				<textarea
					class="textarea textarea-bordered h-40 text-sm font-mono"
					placeholder="Write your message here..."
					bind:value={emailBody}
				></textarea>
			</label>
		</div>
		<div class="modal-action">
			<button
				class="btn btn-ghost btn-sm"
				on:click={() => { showEmailModal = false; emailSubject = ''; emailBody = ''; emailTemplate = 'custom'; }}
				disabled={actionLoading}
			>
				Cancel
			</button>
			<button
				class="btn btn-primary btn-sm"
				disabled={actionLoading || !emailSubject.trim() || !emailBody.trim()}
				on:click={submitEmail}
			>
				{#if actionLoading}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				Send Email
			</button>
		</div>
	</div>
	<div class="modal-backdrop" on:click={() => { showEmailModal = false; }}></div>
</div>
{/if}

{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
