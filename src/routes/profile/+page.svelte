<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-4xl p-8">
	<h1 class="mb-8 text-2xl font-bold text-votist-blue">My Profile</h1>

	<div class="rounded-xl border border-gray-200 bg-white p-8 shadow-lg">
		<!-- Avatar + Name Header -->
		<div class="flex items-center gap-6">
			{#if data.profile.avatarUrl}
				<img
					src={data.profile.avatarUrl}
					alt="Avatar"
					class="h-24 w-24 rounded-full object-cover ring-4 ring-[#167B9B]"
				/>
			{:else}
				<div
					class="flex h-24 w-24 items-center justify-center rounded-full bg-[#167B9B] text-3xl font-bold text-white"
				>
					{(data.profile.firstName || 'A').charAt(0).toUpperCase()}
				</div>
			{/if}
			<div>
				<h2 class="text-xl font-bold text-votist-blue">
					{data.profile.firstName || ''} {data.profile.lastName || ''}
				</h2>
				<p class="text-sm text-gray-500">{data.profile.email}</p>
				<div class="mt-2 flex items-center gap-2">
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
		<div class="grid grid-cols-3 gap-4 text-center">
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-2xl font-bold text-[#167B9B]">{data.profile._count.posts}</p>
				<p class="text-sm text-gray-500">Posts</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-2xl font-bold text-[#167B9B]">{data.profile._count.comments}</p>
				<p class="text-sm text-gray-500">Comments</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-2xl font-bold text-[#167B9B]">{data.profile._count.votes}</p>
				<p class="text-sm text-gray-500">Votes</p>
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
			<a href="/settings" class="btn bg-[#167B9B] text-white hover:bg-[#155E75]">
				Edit Profile
			</a>
		</div>
	</div>
</div>
