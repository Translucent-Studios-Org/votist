<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let firstName = $state(data.settings.firstName || '');
	let lastName = $state(data.settings.lastName || '');
	let displayName = $state(data.settings.displayName || '');
	let useDisplayName = $state(data.settings.useDisplayName);
	let avatarUrl = $state(data.settings.avatarUrl || '');
	let isResident = $state(data.settings.isResident);
	let saving = $state(false);
</script>

<div class="mx-auto box-border max-w-4xl px-4 py-6 md:p-8">
	<h1 class="mb-6 text-xl font-bold text-votist-blue md:mb-8 md:text-2xl">Settings</h1>

	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
			<span class="font-medium text-green-800">Profile updated successfully!</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
			<span class="font-medium text-red-800">{form.error}</span>
		</div>
	{/if}

	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6 md:p-8">
		<h2 class="mb-4 text-base font-bold text-votist-blue md:mb-6 md:text-lg">Profile Information</h2>

		<form
			method="POST"
			action="?/updateProfile"
			class="min-w-0"
			use:enhance={() => {
				saving = true;
				return async ({ update, result }) => {
					await update();
					saving = false;
					if (result.type === 'success') {
						firstName = data.settings.firstName || '';
						lastName = data.settings.lastName || '';
						displayName = data.settings.displayName || '';
						useDisplayName = data.settings.useDisplayName;
						avatarUrl = data.settings.avatarUrl || '';
						isResident = data.settings.isResident;
					}
				};
			}}
		>
			<div class="min-w-0 space-y-6">
				<!-- Avatar Preview -->
				<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
					{#if avatarUrl}
						<img
							src={avatarUrl}
							alt="Avatar preview"
							class="h-16 w-16 flex-shrink-0 rounded-full object-cover ring-2 ring-[#167B9B]"
						/>
					{:else}
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#167B9B] text-xl font-bold text-white"
						>
							{(firstName || 'A').charAt(0).toUpperCase()}
						</div>
					{/if}
					<div class="min-w-0 w-full">
						<label for="avatarUrl" class="mb-1 block text-sm font-medium text-gray-700">
							Avatar URL
						</label>
						<input
							id="avatarUrl"
							name="avatarUrl"
							type="url"
							class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
							placeholder="https://example.com/avatar.jpg"
							bind:value={avatarUrl}
						/>
					</div>
				</div>

				<!-- Name Fields -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="firstName" class="mb-1 block text-sm font-medium text-gray-700">
							First Name
						</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
							placeholder="First name"
							bind:value={firstName}
						/>
					</div>
					<div>
						<label for="lastName" class="mb-1 block text-sm font-medium text-gray-700">
							Last Name
						</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
							placeholder="Last name"
							bind:value={lastName}
						/>
					</div>
				</div>

				<!-- Display Name Toggle & Field -->
				<div>
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							name="useDisplayName"
							class="toggle toggle-primary"
							bind:checked={useDisplayName}
						/>
						<span class="text-sm font-medium text-gray-700">Use display name</span>
					</label>
					{#if useDisplayName}
						<div class="mt-3">
							<label for="displayName" class="mb-1 block text-sm font-medium text-gray-700">
								Display Name
							</label>
							<input
								id="displayName"
								name="displayName"
								type="text"
								class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
								placeholder="Your public display name"
								bind:value={displayName}
							/>
							<p class="mt-1 text-xs text-gray-400">
								This name will be shown instead of your first/last name
							</p>
						</div>
					{/if}
				</div>

				<!-- Email (read-only) -->
				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-700">
						Email
					</label>
					<input
						id="email"
						type="email"
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
						value={data.settings.email || ''}
						disabled
					/>
					<p class="mt-1 text-xs text-gray-400">
						Email is managed by your sign-in provider
					</p>
				</div>

				<!-- Residency Toggle -->
				<div>
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							name="isResident"
							class="toggle toggle-primary"
							bind:checked={isResident}
						/>
						<span class="text-sm font-medium text-gray-700">I am a local resident</span>
					</label>
				</div>

				<!-- Submit -->
				<div class="flex justify-end pt-2">
					<button
						type="submit"
						class="btn w-full bg-[#167B9B] text-white hover:bg-[#155E75] sm:w-auto"
						disabled={saving}
					>
						{#if saving}
							<span class="loading loading-spinner loading-sm"></span>
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			</div>
		</form>
	</div>
</div>
