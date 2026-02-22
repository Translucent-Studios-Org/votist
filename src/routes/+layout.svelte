<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import logo from '$lib/assets/logo/logo-header.png';
	import { browser } from '$app/environment';
	import { ClerkProvider, SignedIn, SignedOut } from 'svelte-clerk';
	import type { LayoutData } from './$types';
	import Footer from '$lib/components/Footer.svelte';
	import VotistAssistant from '$lib/components/assistant/VotistAssistant.svelte';

	import homeOutline from '$lib/assets/icons/home-outline.png';
	import homeFilled from '$lib/assets/icons/home-filled.png';
	import researchOutline from '$lib/assets/icons/research-outline.png';
	import researchFilled from '$lib/assets/icons/research-filled.png';
	import voteOutline from '$lib/assets/icons/vote-outline.png';
	import voteFilled from '$lib/assets/icons/vote-filled.png';
	import profileOutline from '$lib/assets/icons/profile-outline.png';
	import profileFilled from '$lib/assets/icons/profile-filled.png';
	import settingsOutline from '$lib/assets/icons/settings-outline.png';
	import settingsFilled from '$lib/assets/icons/settings-filled.png';

	interface NavItem {
		name: string;
		path: string;
		icon: string;
		iconOutline: string;
		iconFilled: string;
		hasSubItems?: boolean;
		notification?: number;
	}

	const navItems: NavItem[] = [
		{
			name: 'Home',
			path: '/',
			icon: 'home',
			iconOutline: homeOutline,
			iconFilled: homeFilled
		},
		{
			name: 'Assembly',
			path: '/san-rafael',
			icon: 'assembly',
			iconOutline: researchOutline,
			iconFilled: researchFilled,
			hasSubItems: true
		},
		{
			name: 'Knowledge Check',
			path: '/san-rafael/quiz/cmliugj750007pepgmpphvune',
			icon: 'knowledge',
			iconOutline: researchOutline,
			iconFilled: researchFilled
		},
		{
			name: 'Vote and Discuss',
			path: '/vote',
			icon: 'vote',
			iconOutline: voteOutline,
			iconFilled: voteFilled
		}
	];

	const bottomNavItems: NavItem[] = [
		{
			name: 'Profile',
			path: '/profile',
			icon: 'profile',
			iconOutline: profileOutline,
			iconFilled: profileFilled
		},
		{
			name: 'Settings',
			path: '/settings',
			icon: 'settings',
			iconOutline: settingsOutline,
			iconFilled: settingsFilled
		}
	];

	let { children, data }: { children: any; data: LayoutData } = $props();

	let userMenuOpen = $state(false);
	let collapsed = $state(false);

	async function handleSignOut() {
		if (!browser) return;
		const clerk = (window as any).Clerk;
		if (clerk) {
			await clerk.signOut();
		}
		window.location.href = '/sign-in';
	}
</script>

<svelte:window
	onclick={() => {
		if (userMenuOpen) userMenuOpen = false;
	}}
/>

<ClerkProvider {...data.clerk}>
	<SignedIn>
		<div class="flex bg-white">
			<aside
				class="fixed hidden h-screen border-r border-blue-200 bg-white shadow-lg transition-all duration-300 md:block {collapsed
					? 'w-[4.5rem]'
					: 'w-64'}"
			>
				<div class="flex h-full flex-col overflow-hidden">
					<div
						class="flex items-center border-b border-blue-200 {collapsed
							? 'justify-center p-4'
							: 'justify-between p-6'}"
					>
						{#if !collapsed}
							<a href="/">
								<img class="w-32" src={logo} alt="votist logo" />
							</a>
						{/if}
						<button
							onclick={() => (collapsed = !collapsed)}
							class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
							aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
						>
							<svg
								class="h-5 w-5 transition-transform duration-300 {collapsed
									? 'rotate-180'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
								/>
							</svg>
						</button>
					</div>

					<div
						class="border-b border-blue-200 p-4 {collapsed
							? 'flex justify-center'
							: ''}"
					>
						<div class="relative">
							<button
								class="flex w-full items-center rounded-lg p-2 hover:bg-gray-50 {collapsed
									? 'justify-center'
									: 'gap-3'}"
								onclick={(e: MouseEvent) => {
									e.stopPropagation();
									userMenuOpen = !userMenuOpen;
								}}
							>
								{#if data.user?.avatarUrl}
									<img
										src={data.user.avatarUrl}
										alt="Profile"
										class="flex-shrink-0 rounded-full object-cover ring-2 ring-[#167B9B] {collapsed
											? 'h-9 w-9'
											: 'h-12 w-12'}"
									/>
								{:else}
									<div
										class="flex flex-shrink-0 items-center justify-center rounded-full bg-[#167B9B] font-bold text-white {collapsed
											? 'h-9 w-9 text-sm'
											: 'h-12 w-12 text-lg'}"
									>
										{(data.user?.fullName || 'A').charAt(0).toUpperCase()}
									</div>
								{/if}
								{#if !collapsed}
									<div class="flex-1 text-left">
										<h2 class="text-sm font-bold text-votist-blue">
											{data.user?.fullName || 'Anonymous'}
										</h2>
										<p class="text-xs capitalize text-gray-500">
											{data.user?.role || 'visitor'}
										</p>
									</div>
									<svg
										class="h-4 w-4 text-gray-400 transition-transform {userMenuOpen
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								{/if}
							</button>

							{#if userMenuOpen}
								<div
									class="absolute z-50 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg {collapsed
										? 'left-full top-0 ml-2 w-48'
										: 'left-0 w-full'}"
								>
									<a
										href="/profile"
										class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
										onclick={() => (userMenuOpen = false)}
									>
										View Profile
									</a>
									<a
										href="/settings"
										class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
										onclick={() => (userMenuOpen = false)}
									>
										Settings
									</a>
									<div class="my-1 border-t border-gray-200"></div>
									<button
										class="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
										onclick={handleSignOut}
									>
										Sign Out
									</button>
								</div>
							{/if}
						</div>
					</div>

					<nav class="flex-1 space-y-1 {collapsed ? 'p-2' : 'p-4'}">
						{#each navItems as item}
							{#if item.hasSubItems}
								{#if !collapsed}
									<div class="mb-1 mt-2">
										<p class="px-3 py-1 text-xs font-medium tracking-wide uppercase text-gray-400">
											{item.name}
										</p>
										<a
											href="/san-rafael"
											class="flex flex-col rounded-md px-3 py-2 bg-gray-50 hover:bg-gray-100"
										>
											<span class="text-sm font-bold text-[#155E75]">San Rafael, CA</span>
											<span class="text-xs text-[#167B9B]">Housing and the Future</span>
										</a>
									</div>
								{/if}
							{:else}
								<a
									href={item.path}
									class="flex items-center rounded-lg hover:bg-gray-50 {collapsed
										? 'justify-center p-3'
										: 'p-3'} {page.url.pathname === item.path ||
									page.url.pathname.startsWith(item.path + '/')
										? 'bg-gray-50 font-bold text-[#155E75]'
										: 'text-gray-700'}"
									title={collapsed ? item.name : undefined}
								>
									<img
										src={page.url.pathname === item.path ||
										page.url.pathname.startsWith(item.path + '/')
											? item.iconFilled
											: item.iconOutline}
										alt={item.name}
										class="h-5 w-5 flex-shrink-0 {collapsed ? '' : 'mr-3'}"
									/>
									{#if !collapsed}
										<span class="flex-1">{item.name}</span>
										{#if item.notification}
											<span
												class="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700"
											>
												{item.notification}
											</span>
										{/if}
									{/if}
								</a>
							{/if}
						{/each}
					</nav>

					<div class="border-t border-gray-200 {collapsed ? 'p-2' : 'p-4'}">
						<nav class="space-y-1">
							{#each bottomNavItems as item}
								<a
									href={item.path}
									class="flex items-center rounded-lg hover:bg-gray-50 {collapsed
										? 'justify-center p-3'
										: 'p-3'} {page.url.pathname === item.path
										? 'bg-gray-50 font-bold text-teal-600'
										: 'text-gray-700'}"
									title={collapsed ? item.name : undefined}
								>
									<img
										src={page.url.pathname === item.path
											? item.iconFilled
											: item.iconOutline}
										alt={item.name}
										class="h-5 w-5 flex-shrink-0 {collapsed ? '' : 'mr-3'}"
									/>
									{#if !collapsed}
										<span class="flex-1">{item.name}</span>
										{#if item.notification}
											<span
												class="rounded-full bg-gray-200 px-2 py-1 text-xs text-gray-700"
											>
												{item.notification}
											</span>
										{/if}
									{/if}
								</a>
							{/each}
						</nav>
					</div>
				</div>
			</aside>

			<div
				class="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-white/95 px-4 py-2 backdrop-blur-sm md:hidden"
			>
				<a href="/">
					<img class="h-7" src={logo} alt="votist logo" />
				</a>
				<a href="/profile" class="flex-shrink-0">
					{#if data.user?.avatarUrl}
						<img
							src={data.user.avatarUrl}
							alt="Profile"
							class="h-9 w-9 rounded-full object-cover ring-2 ring-[#167B9B]"
						/>
					{:else}
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-[#167B9B] text-sm font-bold text-white"
						>
							{(data.user?.fullName || 'A').charAt(0).toUpperCase()}
						</div>
					{/if}
				</a>
			</div>

			<nav
				class="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden"
			>
				{#each navItems as item}
					{#if item.hasSubItems}
						<a
							href="/san-rafael"
							class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 {page.url.pathname === '/san-rafael' || page.url.pathname.startsWith('/san-rafael/')
								? 'text-[#155E75]'
								: 'text-gray-400'}"
						>
							<span class="text-base font-extrabold leading-none text-[#167B9B]">SR</span>
							<span class="text-[10px] font-medium leading-tight text-[#167B9B]">San Rafael</span>
						</a>
					{:else}
						<a
							href={item.path}
							class="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 {page.url.pathname === item.path || page.url.pathname.startsWith(item.path + '/')
								? 'text-[#155E75]'
								: 'text-gray-400'}"
						>
							<img
								src={page.url.pathname === item.path || page.url.pathname.startsWith(item.path + '/')
									? item.iconFilled
									: item.iconOutline}
								alt={item.name}
								class="h-6 w-6"
							/>
							<span class="text-[10px] leading-tight">{item.name}</span>
							{#if item.notification}
								<span
									class="absolute right-2 top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[9px] font-bold text-white"
								>
									{item.notification}
								</span>
							{/if}
						</a>
					{/if}
				{/each}
			</nav>

			<main
				class="flex min-h-screen flex-1 flex-col pt-14 pb-16 transition-all duration-300 md:pt-0 md:pb-0 {collapsed
					? 'md:ml-[4.5rem]'
					: 'md:ml-[16rem]'}"
			>
				<div class="flex-1">
					{@render children?.()}
				</div>
				<Footer />
			</main>

			<VotistAssistant />
		</div>
	</SignedIn>

	<SignedOut>
		<div class="flex min-h-screen flex-col">
			<div class="navbar bg-base-100">
				<div class="navbar-start">
					<a href="/">
						<img class="m-5 w-32" src={logo} alt="votist logo" />
					</a>
				</div>
				<div class="navbar-end">
					<a href="/san-rafael" class="text-votist-blue mx-5 font-semibold">
						San Rafael Project
					</a>
					<a href="/sign-up" class="btn btn-primary">Register</a>
					<a href="/sign-in" class="btn btn-ghost">Sign in</a>
				</div>
			</div>
			<div class="flex-1">
				{@render children?.()}
			</div>
			<Footer />
		</div>
	</SignedOut>
</ClerkProvider>
