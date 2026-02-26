<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		LayoutDashboard,
		Users,
		Vote,
		MessageSquare,
		BookOpen,
		ShieldBan,
		TrendingUp,
		AlertCircle,
		RefreshCw,
		ExternalLink
	} from 'lucide-svelte';

	// ── Types ──────────────────────────────────────────────────────────────────
	type OverviewData = {
		totalUsers: number;
		activeUsers7d: number;
		activeUsers30d: number;
		totalVotes: number;
		totalComments: number;
		totalQuizCompletions: number;
		totalBannedUsers: number;
		residentCount: number;
		nonResidentCount: number;
		newUsersThisWeek: number;
		newUsersThisMonth: number;
	};

	type GrowthEntry = { date: string; count: number };
	type EngagementEntry = { date: string; votes: number; comments: number };

	type GrowthData = {
		userGrowthDaily: GrowthEntry[];
		userGrowthWeekly: { week: string; count: number }[];
		engagementDaily: EngagementEntry[];
	};

	type Contributor = {
		id: string;
		firstName: string;
		lastName: string;
		avatarUrl: string | null;
		votes: number;
		comments: number;
		quizzes: number;
		total: number;
	};
	type InsightsData = {
		topContributors: Contributor[];
		engagementCohorts: {
			highlyActive: number;
			occasional: number;
			dormant: number;
			neverEngaged: number;
		};
		engagementByResidency: {
			residents: { avgVotes: number; avgComments: number };
			nonResidents: { avgVotes: number; avgComments: number };
		};
		dropOffFunnel: {
			registered: number;
			quizAttempted: number;
			quizPassed: number;
			voted: number;
		};
	};

	// ── State ──────────────────────────────────────────────────────────────────
	let loading = $state(true);
	let error = $state('');

	let overview: OverviewData | null = $state(null);
	let growth: GrowthData | null = $state(null);
	let insights: InsightsData | null = $state(null);

	// ── Data Loading ──────────────────────────────────────────────────────────
	async function loadAll() {
		loading = true;
		error = '';
		try {
			const [ovRes, grRes, inRes] = await Promise.all([
				fetch('/api/admin/dashboard/overview'),
				fetch('/api/admin/dashboard/growth'),
				fetch('/api/admin/dashboard/insights')
			]);

			if (!ovRes.ok || !grRes.ok || !inRes.ok) {
				throw new Error('One or more dashboard endpoints failed');
			}

			[overview, growth, insights] = await Promise.all([
				ovRes.json(),
				grRes.json(),
				inRes.json()
			]);
		} catch (e: any) {
			error = e?.message ?? 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	onMount(loadAll);

	// ── SVG Chart Helpers ─────────────────────────────────────────────────────
	function buildLinePath(
		data: any[],
		width: number,
		height: number,
		getValue: (d: any) => number
	): string {
		if (!data.length) return '';
		const maxVal = Math.max(...data.map(getValue), 1);
		const stepX = width / Math.max(data.length - 1, 1);
		return data
			.map((d, i) => {
				const x = i * stepX;
				const y = height - (getValue(d) / maxVal) * height;
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
			})
			.join(' ');
	}

	function buildFillPath(
		data: any[],
		width: number,
		height: number,
		getValue: (d: any) => number
	): string {
		const line = buildLinePath(data, width, height, getValue);
		if (!line) return '';
		const lastX = ((data.length - 1) * width) / Math.max(data.length - 1, 1);
		return `${line} L ${lastX.toFixed(1)} ${height} L 0 ${height} Z`;
	}

	function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
		const rad = ((angleDeg - 90) * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	function donutArc(
		cx: number,
		cy: number,
		r: number,
		startAngle: number,
		endAngle: number
	): string {
		// Clamp to avoid full-circle arcs which render as nothing
		const clampedEnd = Math.min(endAngle, startAngle + 359.99);
		const start = polarToCartesian(cx, cy, r, clampedEnd);
		const end = polarToCartesian(cx, cy, r, startAngle);
		const largeArc = clampedEnd - startAngle > 180 ? 1 : 0;
		return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
	}

	// ── Derived / Computed ────────────────────────────────────────────────────
	let growthData = $derived(growth?.userGrowthDaily ?? []);
	let engagementData = $derived(growth?.engagementDaily ?? []);

	const chartW = 460;
	const chartH = 120;
	const chartPad = 40;

	// X-axis date labels — show every Nth label to avoid crowding
	function xLabels(data: { date: string }[], width: number, every = 5) {
		return data
			.filter((_, i) => i % every === 0 || i === data.length - 1)
			.map((d, _, arr) => {
				const idx = data.indexOf(d);
				const x = (idx / Math.max(data.length - 1, 1)) * width;
				const label = new Date(d.date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric'
				});
				return { x, label };
			});
	}

	// Y-axis tick values
	function yTicks(data: any[], getValue: (d: any) => number, count = 4) {
		const maxVal = Math.max(...data.map(getValue), 1);
		return Array.from({ length: count + 1 }, (_, i) => ({
			value: Math.round((maxVal / count) * i),
			y: chartH - (i / count) * chartH
		}));
	}

	// Funnel pct helper
	function pct(n: number, base: number) {
		if (!base) return '0%';
		return ((n / base) * 100).toFixed(1) + '%';
	}

	function getInitials(c: Contributor) {
		return [(c.firstName ?? '')[0], (c.lastName ?? '')[0]]
			.filter(Boolean)
			.join('')
			.toUpperCase();
	}

	// Cohort total for percentage calculations
	let cohortTotal = $derived(
		insights
			? insights.engagementCohorts.highlyActive +
				insights.engagementCohorts.occasional +
				insights.engagementCohorts.dormant +
				insights.engagementCohorts.neverEngaged
			: 0
	);

	// Engagement cohorts for display
	let cohorts = $derived(
		insights
			? [
				{
					key: 'highlyActive',
					label: 'Highly Active',
					count: insights.engagementCohorts.highlyActive,
					color: 'bg-success',
					textColor: 'text-success',
					badge: 'badge-success',
					description: 'Votes + comments regularly'
				},
				{
					key: 'occasional',
					label: 'Occasional',
					count: insights.engagementCohorts.occasional,
					color: 'bg-info',
					textColor: 'text-info',
					badge: 'badge-info',
					description: 'Some activity in the last 30 days'
				},
				{
					key: 'dormant',
					label: 'Dormant',
					count: insights.engagementCohorts.dormant,
					color: 'bg-warning',
					textColor: 'text-warning',
					badge: 'badge-warning',
					description: 'Registered but inactive'
				},
				{
					key: 'neverEngaged',
					label: 'Never Engaged',
					count: insights.engagementCohorts.neverEngaged,
					color: 'bg-base-300',
					textColor: 'text-base-content/50',
					badge: 'badge-ghost',
					description: 'No activity recorded'
				}
			]
			: []
	);

	// Quick links
	const quickLinks = [
		{ href: '/admin/users', label: 'User Directory', icon: Users, color: 'btn-primary' },
		{ href: '/admin/moderation', label: 'Moderation', icon: ShieldBan, color: 'btn-error' },
		{ href: '/admin/quizzes', label: 'Quiz Management', icon: BookOpen, color: 'btn-secondary' },
		{ href: '/admin/posts', label: 'Post Management', icon: MessageSquare, color: 'btn-accent' }
	];
</script>

<!-- ═══════════════════════════════════════════════════════════ LOADING STATE -->
{#if loading}
	<div class="flex min-h-96 flex-col items-center justify-center gap-4">
		<span class="loading loading-spinner loading-lg text-primary"></span>
		<p class="text-base-content/60 text-sm">Loading dashboard data…</p>
	</div>

<!-- ════════════════════════════════════════════════════════════ ERROR STATE -->
{:else if error}
	<div class="flex min-h-96 flex-col items-center justify-center gap-4">
		<AlertCircle class="text-error h-12 w-12" />
		<p class="text-lg font-semibold">Failed to load dashboard</p>
		<p class="text-base-content/60 max-w-sm text-center text-sm">{error}</p>
		<button class="btn btn-primary btn-sm gap-2" onclick={loadAll}>
			<RefreshCw class="h-4 w-4" />
			Retry
		</button>
	</div>

<!-- ═══════════════════════════════════════════════════════════ MAIN CONTENT -->
{:else if overview && growth && insights}

	<!-- ── Page Header ──────────────────────────────────────────────────────── -->
	<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="bg-primary/10 rounded-xl p-2">
				<LayoutDashboard class="text-primary h-7 w-7" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
				<p class="text-base-content/60 mt-0.5 text-sm">
					Overview of platform health and user engagement
				</p>
			</div>
		</div>
		<button class="btn btn-ghost btn-sm gap-2" onclick={loadAll}>
			<RefreshCw class="h-4 w-4" />
			Refresh
		</button>
	</div>

	<div class="divider my-2"></div>

	<!-- ── Stat Cards ────────────────────────────────────────────────────────── -->
	<div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
		<!-- Total Users -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-xs font-medium uppercase tracking-wider">
						Total Users
					</p>
					<Users class="text-primary h-4 w-4 opacity-60" />
				</div>
				<p class="text-3xl font-bold">{overview.totalUsers.toLocaleString()}</p>
				<p class="text-base-content/50 text-xs">+{overview.newUsersThisWeek} this week</p>
			</div>
		</div>

		<!-- Active Users 7d -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-xs font-medium uppercase tracking-wider">
						Active (7d)
					</p>
					<TrendingUp class="text-success h-4 w-4 opacity-60" />
				</div>
				<p class="text-3xl font-bold">{overview.activeUsers7d.toLocaleString()}</p>
				<p class="text-base-content/50 text-xs">of {overview.totalUsers.toLocaleString()} total</p>
			</div>
		</div>

		<!-- Total Votes -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-xs font-medium uppercase tracking-wider">
						Total Votes
					</p>
					<Vote class="text-secondary h-4 w-4 opacity-60" />
				</div>
				<p class="text-3xl font-bold">{overview.totalVotes.toLocaleString()}</p>
				<p class="text-base-content/50 text-xs">
					{overview.activeUsers30d > 0
						? (overview.totalVotes / overview.activeUsers30d).toFixed(1) + ' avg / user'
						: 'No active users'}
				</p>
			</div>
		</div>

		<!-- Total Comments -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-xs font-medium uppercase tracking-wider">
						Comments
					</p>
					<MessageSquare class="text-accent h-4 w-4 opacity-60" />
				</div>
				<p class="text-3xl font-bold">{overview.totalComments.toLocaleString()}</p>
				<p class="text-base-content/50 text-xs">total platform comments</p>
			</div>
		</div>

		<!-- Quiz Completions -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p class="text-base-content/60 text-xs font-medium uppercase tracking-wider">
						Quizzes
					</p>
					<BookOpen class="text-info h-4 w-4 opacity-60" />
				</div>
				<p class="text-3xl font-bold">{overview.totalQuizCompletions.toLocaleString()}</p>
				<p class="text-base-content/50 text-xs">completions total</p>
			</div>
		</div>

		<!-- Banned Users -->
		<div
			class="card border shadow-sm {overview.totalBannedUsers > 0
				? 'border-error/30 bg-error/5'
				: 'bg-base-100 border-base-200'}"
		>
			<div class="card-body gap-1 p-4">
				<div class="flex items-center justify-between">
					<p
						class="text-xs font-medium uppercase tracking-wider {overview.totalBannedUsers > 0
							? 'text-error/70'
							: 'text-base-content/60'}"
					>
						Banned
					</p>
					<ShieldBan
						class="h-4 w-4 opacity-60 {overview.totalBannedUsers > 0
							? 'text-error'
							: 'text-base-content'}"
					/>
				</div>
				<p
					class="text-3xl font-bold {overview.totalBannedUsers > 0
						? 'text-error'
						: 'text-base-content'}"
				>
					{overview.totalBannedUsers}
				</p>
				<p
					class="text-xs {overview.totalBannedUsers > 0 ? 'text-error/60' : 'text-base-content/50'}"
				>
					{overview.totalBannedUsers > 0 ? 'requires attention' : 'no banned users'}
				</p>
			</div>
		</div>
	</div>

	<!-- ── Charts Grid ────────────────────────────────────────────────────────── -->
	<div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

		<!-- Chart A: User Growth Line Chart -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body p-5">
				<h2 class="card-title text-base">New User Registrations (30 days)</h2>
				{#if growthData.length === 0}
					<div class="flex h-40 items-center justify-center text-base-content/40 text-sm">
						No data available
					</div>
				{:else}
					<div class="mt-2 overflow-hidden">
						<svg
							viewBox="0 0 {chartW + chartPad} {chartH + 36}"
							width="100%"
							xmlns="http://www.w3.org/2000/svg"
							class="block"
						>
							<!-- Y-axis ticks -->
							{#each yTicks(growthData, (d) => d.count) as tick}
								<line
									x1={chartPad}
									y1={tick.y}
									x2={chartW + chartPad}
									y2={tick.y}
									stroke="currentColor"
									stroke-width="0.5"
									class="text-base-content/10"
								/>
								<text
									x={chartPad - 4}
									y={tick.y + 4}
									text-anchor="end"
									class="fill-base-content/50"
									style="font-size: 9px;">{tick.value}</text
								>
							{/each}

							<!-- Fill -->
							<path
								d={buildFillPath(growthData, chartW, chartH, (d) => d.count)}
								transform="translate({chartPad}, 0)"
								fill="oklch(var(--p))"
								fill-opacity="0.12"
							/>

							<!-- Line -->
							<path
								d={buildLinePath(growthData, chartW, chartH, (d) => d.count)}
								transform="translate({chartPad}, 0)"
								fill="none"
								stroke="oklch(var(--p))"
								stroke-width="2"
								stroke-linejoin="round"
								stroke-linecap="round"
							/>

							<!-- X-axis labels -->
							{#each xLabels(growthData, chartW) as lbl}
								<text
									x={lbl.x + chartPad}
									y={chartH + 16}
									text-anchor="middle"
									class="fill-base-content/50"
									style="font-size: 9px;">{lbl.label}</text
								>
							{/each}
						</svg>
					</div>
					<div class="mt-1 flex gap-4 text-xs text-base-content/50">
						<span>
							Peak: {Math.max(...growthData.map((d) => d.count))} new users/day
						</span>
						<span>+{overview.newUsersThisMonth} this month</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chart B: Engagement Trends (2 lines) -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body p-5">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<h2 class="card-title text-base">Daily Engagement (30 days)</h2>
					<div class="flex gap-3 text-xs">
						<span class="flex items-center gap-1">
							<span class="inline-block h-2 w-4 rounded-full bg-blue-500"></span>
							Votes
						</span>
						<span class="flex items-center gap-1">
							<span class="inline-block h-2 w-4 rounded-full bg-emerald-500"></span>
							Comments
						</span>
					</div>
				</div>
				{#if engagementData.length === 0}
					<div class="flex h-40 items-center justify-center text-base-content/40 text-sm">
						No data available
					</div>
				{:else}
					{@const maxVotes = Math.max(...engagementData.map((d) => d.votes), 1)}
					{@const maxComments = Math.max(...engagementData.map((d) => d.comments), 1)}
					{@const maxVal = Math.max(maxVotes, maxComments, 1)}
					<div class="mt-2 overflow-hidden">
						<svg
							viewBox="0 0 {chartW + chartPad} {chartH + 36}"
							width="100%"
							xmlns="http://www.w3.org/2000/svg"
							class="block"
						>
							<!-- Y-grid lines -->
							{#each yTicks(engagementData, (d) => Math.max(d.votes, d.comments)) as tick}
								<line
									x1={chartPad}
									y1={tick.y}
									x2={chartW + chartPad}
									y2={tick.y}
									stroke="currentColor"
									stroke-width="0.5"
									class="text-base-content/10"
								/>
								<text
									x={chartPad - 4}
									y={tick.y + 4}
									text-anchor="end"
									class="fill-base-content/50"
									style="font-size: 9px;">{tick.value}</text
								>
							{/each}

							<!-- Votes fill -->
							<path
								d={buildFillPath(engagementData, chartW, chartH, (d) => (d.votes / maxVal) * maxVal)}
								transform="translate({chartPad}, 0)"
								fill="#3b82f6"
								fill-opacity="0.08"
							/>

							<!-- Votes line -->
							<path
								d={buildLinePath(engagementData, chartW, chartH, (d) => (d.votes / maxVal) * maxVal)}
								transform="translate({chartPad}, 0)"
								fill="none"
								stroke="#3b82f6"
								stroke-width="2"
								stroke-linejoin="round"
								stroke-linecap="round"
							/>

							<!-- Comments fill -->
							<path
								d={buildFillPath(
									engagementData,
									chartW,
									chartH,
									(d) => (d.comments / maxVal) * maxVal
								)}
								transform="translate({chartPad}, 0)"
								fill="#10b981"
								fill-opacity="0.08"
							/>

							<!-- Comments line -->
							<path
								d={buildLinePath(
									engagementData,
									chartW,
									chartH,
									(d) => (d.comments / maxVal) * maxVal
								)}
								transform="translate({chartPad}, 0)"
								fill="none"
								stroke="#10b981"
								stroke-width="2"
								stroke-linejoin="round"
								stroke-linecap="round"
								stroke-dasharray="none"
							/>

							<!-- X-axis labels -->
							{#each xLabels(engagementData, chartW) as lbl}
								<text
									x={lbl.x + chartPad}
									y={chartH + 16}
									text-anchor="middle"
									class="fill-base-content/50"
									style="font-size: 9px;">{lbl.label}</text
								>
							{/each}
						</svg>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chart C: Donut — Resident vs Non-Resident -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body p-5">
				<h2 class="card-title text-base">Resident vs Non-Resident</h2>
				{#if overview.totalUsers === 0}
					<div class="flex h-40 items-center justify-center text-base-content/40 text-sm">
						No data available
					</div>
				{:else}
					{@const cx = 90}
					{@const cy = 90}
					{@const outerR = 70}
					{@const innerR = 44}
					{@const total = overview.totalUsers}
					{@const rAngle = (overview.residentCount / total) * 360}
					<div class="mt-2 flex flex-wrap items-center gap-6">
						<svg
							viewBox="0 0 180 180"
							width="180"
							height="180"
							xmlns="http://www.w3.org/2000/svg"
							class="shrink-0"
						>
							<!-- Resident arc -->
							<path
								d={donutArc(cx, cy, outerR, 0, rAngle)}
								fill="none"
								stroke="oklch(var(--p))"
								stroke-width={outerR - innerR}
								stroke-linecap="butt"
							/>
							<!-- Non-resident arc -->
							<path
								d={donutArc(cx, cy, outerR, rAngle, 360)}
								fill="none"
								stroke="oklch(var(--s))"
								stroke-width={outerR - innerR}
								stroke-linecap="butt"
							/>
							<!-- Center text -->
							<text
								x={cx}
								y={cy - 6}
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-base-content"
								style="font-size: 20px; font-weight: 700;">{total}</text
							>
							<text
								x={cx}
								y={cy + 14}
								text-anchor="middle"
								dominant-baseline="middle"
								class="fill-base-content/50"
								style="font-size: 9px;">total users</text
							>
						</svg>

						<!-- Legend -->
						<div class="flex flex-col gap-3 text-sm">
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-3 w-3 rounded-full"
									style="background: oklch(var(--p))"
								></span>
								<div>
									<div class="font-medium">Residents</div>
									<div class="text-base-content/60 text-xs">
										{overview.residentCount.toLocaleString()}
										({pct(overview.residentCount, total)})
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<span
									class="inline-block h-3 w-3 rounded-full"
									style="background: oklch(var(--s))"
								></span>
								<div>
									<div class="font-medium">Non-Residents</div>
									<div class="text-base-content/60 text-xs">
										{overview.nonResidentCount.toLocaleString()}
										({pct(overview.nonResidentCount, total)})
									</div>
								</div>
							</div>
							<div class="divider my-0"></div>
							<div class="text-base-content/60 text-xs">
								<div>Residents avg votes: {insights.engagementByResidency.residents.avgVotes.toFixed(1)}</div>
								<div>Non-residents avg votes: {insights.engagementByResidency.nonResidents.avgVotes.toFixed(1)}</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chart D: Drop-off Funnel -->
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body p-5">
				<h2 class="card-title text-base">User Engagement Funnel</h2>
				{#if insights}
					{@const funnel = insights.dropOffFunnel}
					{@const base = funnel.registered || 1}
					{@const steps = [
						{ label: 'Registered', count: funnel.registered, color: '#6366f1' },
						{ label: 'Quiz Attempted', count: funnel.quizAttempted, color: '#8b5cf6' },
						{ label: 'Quiz Passed', count: funnel.quizPassed, color: '#a78bfa' },
						{ label: 'Voted', count: funnel.voted, color: '#c4b5fd' }
					]}
					<div class="mt-3 flex flex-col gap-2">
						{#each steps as step, i}
							{@const barWidth = (step.count / base) * 100}
							<div class="flex flex-col gap-0.5">
								<div class="flex items-center justify-between text-xs">
									<span class="font-medium text-base-content/80">{step.label}</span>
									<span class="text-base-content/60">
										{step.count.toLocaleString()}
										{#if i > 0}
											<span class="text-base-content/40">({pct(step.count, base)})</span>
										{/if}
									</span>
								</div>
								<div class="bg-base-200 h-7 w-full overflow-hidden rounded">
									<div
										class="flex h-full items-center justify-end rounded pr-2 text-xs font-semibold text-white transition-all duration-500"
										style="width: {barWidth}%; background-color: {step.color}; min-width: {step.count > 0 ? '2rem' : '0'};"
									>
										{#if barWidth > 15}
											{pct(step.count, base)}
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-3 flex flex-wrap gap-3 text-xs text-base-content/50">
						<span>
							Quiz attempt rate: {pct(funnel.quizAttempted, base)}
						</span>
						<span>
							Quiz pass rate: {pct(funnel.quizPassed, funnel.quizAttempted || 1)}
						</span>
						<span>
							Voting conversion: {pct(funnel.voted, base)}
						</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- ── Top Contributors ───────────────────────────────────────────────────── -->
	<div class="card bg-base-100 border-base-200 mb-8 border shadow-sm">
		<div class="card-body p-5">
			<h2 class="card-title text-base">Top 10 Contributors</h2>
			{#if insights.topContributors.length === 0}
				<div class="flex h-32 items-center justify-center text-base-content/40 text-sm">
					No contributor data available
				</div>
			{:else}
				<div class="mt-2 overflow-x-auto">
					<table class="table w-full">
						<thead>
							<tr class="bg-base-200/60 text-xs text-base-content/60">
								<th class="w-10 py-2">#</th>
								<th class="py-2">User</th>
								<th class="py-2 text-center">Votes</th>
								<th class="py-2 text-center">Comments</th>
								<th class="py-2 text-center">Quizzes</th>
								<th class="py-2 text-center font-semibold">Total Score</th>
							</tr>
						</thead>
						<tbody>
							{#each insights.topContributors.slice(0, 10) as contributor, i}
								<!-- svelte-ignore a11y-click-events-have-key-events -->
								<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
								<tr
									class="cursor-pointer transition-colors hover:bg-base-200/50"
									onclick={() => goto(`/admin/users/${contributor.id}`)}
								>
									<td class="py-2.5 text-center">
										{#if i === 0}
											<span class="text-yellow-500 font-bold">1</span>
										{:else if i === 1}
											<span class="text-base-content/60 font-bold">2</span>
										{:else if i === 2}
											<span class="text-orange-400 font-bold">3</span>
										{:else}
											<span class="text-base-content/40">{i + 1}</span>
										{/if}
									</td>
									<td class="py-2.5">
										<div class="flex items-center gap-2">
											{#if contributor.avatarUrl}
												<div class="avatar">
													<div class="h-7 w-7 rounded-full">
														<img
															src={contributor.avatarUrl}
															alt="{contributor.firstName} {contributor.lastName}"
														/>
													</div>
												</div>
											{:else}
												<div class="avatar avatar-placeholder">
													<div
														class="bg-primary/20 text-primary h-7 w-7 rounded-full text-xs font-bold"
													>
														<span>{getInitials(contributor)}</span>
													</div>
												</div>
											{/if}
											<span class="whitespace-nowrap font-medium text-sm">
												{contributor.firstName}
												{contributor.lastName}
											</span>
										</div>
									</td>
									<td class="py-2.5 text-center text-sm">{contributor.votes.toLocaleString()}</td>
									<td class="py-2.5 text-center text-sm"
										>{contributor.comments.toLocaleString()}</td
									>
									<td class="py-2.5 text-center text-sm">{contributor.quizzes.toLocaleString()}</td>
									<td class="py-2.5 text-center">
										<span
											class="badge badge-primary badge-sm font-bold"
										>
											{contributor.total.toLocaleString()}
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Engagement Cohorts ─────────────────────────────────────────────────── -->
	<div class="card bg-base-100 border-base-200 mb-8 border shadow-sm">
		<div class="card-body p-5">
			<h2 class="card-title mb-3 text-base">User Engagement Breakdown</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				{#each cohorts as cohort}
					{@const cohortPct = cohortTotal > 0 ? ((cohort.count / cohortTotal) * 100).toFixed(1) : '0'}
					<div class="bg-base-200/40 rounded-xl p-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="badge badge-sm {cohort.badge}">{cohort.label}</span>
						</div>
						<p class="text-2xl font-bold {cohort.textColor}">{cohort.count.toLocaleString()}</p>
						<p class="text-base-content/60 text-xs">{cohortPct}% of users</p>
						<div class="bg-base-300 mt-2 h-1.5 w-full overflow-hidden rounded-full">
							<div
								class="h-full rounded-full transition-all duration-500 {cohort.color}"
								style="width: {cohortPct}%"
							></div>
						</div>
						<p class="mt-1.5 text-base-content/40 text-xs">{cohort.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- ── Quick Links ────────────────────────────────────────────────────────── -->
	<div class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body p-5">
			<h2 class="card-title mb-3 text-base">Quick Links</h2>
			<div class="flex flex-wrap gap-3">
				{#each quickLinks as link}
					<a href={link.href} class="btn btn-sm {link.color} btn-outline gap-2">
						<svelte:component this={link.icon} class="h-4 w-4" />
						{link.label}
						<ExternalLink class="h-3 w-3 opacity-60" />
					</a>
				{/each}
			</div>
		</div>
	</div>

{/if}
