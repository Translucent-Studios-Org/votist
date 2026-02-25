<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-4xl px-4 py-6 md:p-8">
	<h1 class="mb-6 text-xl font-bold text-votist-blue md:mb-8 md:text-2xl">My Profile</h1>

	<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6 md:p-8">
		<!-- Avatar + Name Header -->
		<div class="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
			{#if data.profile.avatarUrl}
				<img
					src={data.profile.avatarUrl}
					alt="Avatar"
					class="h-20 w-20 flex-shrink-0 rounded-full object-cover ring-4 ring-[#167B9B] md:h-24 md:w-24"
				/>
			{:else}
				<div
					class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-[#167B9B] text-2xl font-bold text-white md:h-24 md:w-24 md:text-3xl"
				>
					{(data.profile.firstName || 'A').charAt(0).toUpperCase()}
				</div>
			{/if}
			<div>
				<h2 class="text-lg font-bold text-votist-blue md:text-xl">
					{data.profile.firstName || ''} {data.profile.lastName || ''}
				</h2>
				<p class="text-sm text-gray-500">{data.profile.email}</p>
				<div class="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
					<span class="rounded-full bg-[#167B9B]/10 px-3 py-1 text-xs font-medium capitalize text-[#167B9B]">
						{data.profile.role}
					</span>
					{#if data.profile.isAdmin}
						<span class="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
							Admin
						</span>
					{/if}
					{#if data.profile.isResident}
						<span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
							Resident
						</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="my-6 border-t border-gray-200"></div>

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-2 text-center sm:gap-4">
			<div class="rounded-lg bg-gray-50 p-3 sm:p-4">
				<p class="text-xl font-bold text-[#167B9B] sm:text-2xl">{data.profile._count.posts}</p>
				<p class="text-xs text-gray-500 sm:text-sm">Posts</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-3 sm:p-4">
				<p class="text-xl font-bold text-[#167B9B] sm:text-2xl">{data.profile._count.comments}</p>
				<p class="text-xs text-gray-500 sm:text-sm">Comments</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-3 sm:p-4">
				<p class="text-xl font-bold text-[#167B9B] sm:text-2xl">{data.profile._count.votes}</p>
				<p class="text-xs text-gray-500 sm:text-sm">Votes</p>
			</div>
		</div>

		<div class="my-6 border-t border-gray-200"></div>

		<!-- Member since -->
		<p class="text-sm text-gray-500">
			Member since {new Date(data.profile.createdAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</p>

		<!-- Edit link -->
		<div class="mt-6">
			<a href="/settings" class="btn w-full bg-[#167B9B] text-white hover:bg-[#155E75] sm:w-auto">
				Edit Profile
			</a>
		</div>
	</div>
</div>
