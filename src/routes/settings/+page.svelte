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

<div class="mx-auto max-w-4xl px-4 py-6 md:p-8">
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

	<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-lg md:p-8">
		<h2 class="mb-4 text-base font-bold text-votist-blue md:mb-6 md:text-lg">Profile Information</h2>

		<form
			method="POST"
			action="?/updateProfile"
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
			<div class="space-y-6">
				<!-- Avatar Preview -->
				<div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
					{#if avatarUrl}
						<img
							src={avatarUrl}
							alt="Avatar preview"
							class="h-16 w-16 rounded-full object-cover ring-2 ring-[#167B9B]"
						/>
					{:else}
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full bg-[#167B9B] text-xl font-bold text-white"
						>
							{(firstName || 'A').charAt(0).toUpperCase()}
						</div>
					{/if}
					<div class="flex-1">
						<label for="avatarUrl" class="label">
							<span class="label-text font-medium">Avatar URL</span>
						</label>
						<input
							id="avatarUrl"
							name="avatarUrl"
							type="url"
							class="input input-bordered w-full"
							placeholder="https://example.com/avatar.jpg"
							bind:value={avatarUrl}
						/>
					</div>
				</div>

				<!-- Name Fields -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="form-control">
						<label for="firstName" class="label">
							<span class="label-text font-medium">First Name</span>
						</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							class="input input-bordered w-full"
							placeholder="First name"
							bind:value={firstName}
						/>
					</div>
					<div class="form-control">
						<label for="lastName" class="label">
							<span class="label-text font-medium">Last Name</span>
						</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							class="input input-bordered w-full"
							placeholder="Last name"
							bind:value={lastName}
						/>
					</div>
				</div>

				<!-- Display Name Toggle & Field -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							name="useDisplayName"
							class="toggle toggle-primary"
							bind:checked={useDisplayName}
						/>
						<span class="label-text font-medium">Use display name</span>
					</label>
					{#if useDisplayName}
						<div class="mt-2">
							<label for="displayName" class="label">
								<span class="label-text font-medium">Display Name</span>
							</label>
							<input
								id="displayName"
								name="displayName"
								type="text"
								class="input input-bordered w-full"
								placeholder="Your public display name"
								bind:value={displayName}
							/>
							<label for="displayName" class="label">
								<span class="label-text-alt text-gray-400"
									>This name will be shown instead of your first/last name</span
								>
							</label>
						</div>
					{/if}
				</div>

				<!-- Email (read-only) -->
				<div class="form-control">
					<label for="email" class="label">
						<span class="label-text font-medium">Email</span>
					</label>
					<input
						id="email"
						type="email"
						class="input input-bordered w-full bg-gray-50"
						value={data.settings.email || ''}
						disabled
					/>
					<label for="email" class="label">
						<span class="label-text-alt text-gray-400"
							>Email is managed by your sign-in provider</span
						>
					</label>
				</div>

				<!-- Residency Toggle -->
				<div class="form-control">
					<label class="label cursor-pointer justify-start gap-3">
						<input
							type="checkbox"
							name="isResident"
							class="toggle toggle-primary"
							bind:checked={isResident}
						/>
						<span class="label-text font-medium">I am a local resident</span>
					</label>
				</div>

				<!-- Submit -->
				<div class="flex justify-end">
					<button
						type="submit"
						class="btn bg-[#167B9B] text-white hover:bg-[#155E75]"
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
