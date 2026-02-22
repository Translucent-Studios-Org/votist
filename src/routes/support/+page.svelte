<script lang="ts">
	let submitted = $state(false);
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
	<h1 class="mb-2 text-2xl font-bold text-votist-blue md:text-3xl">Support</h1>
	<p class="mb-8 text-gray-600">Need help with something? Have a question about Votist? Reach out and we'll get back to you as soon as possible.</p>

	{#if submitted}
		<div class="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
			<div class="mb-2 text-2xl">&#10003;</div>
			<h2 class="mb-2 text-lg font-semibold text-green-800">Message Received!</h2>
			<p class="text-green-700">Thank you for reaching out. Our team will review your message and respond as soon as possible.</p>
			<button
				type="button"
				class="mt-4 rounded-lg bg-[#167B9B] px-6 py-2 text-white hover:bg-[#155E75]"
				onclick={() => (submitted = false)}
			>
				Send Another
			</button>
		</div>
	{:else}
		<form
			action="https://public.herotofu.com/v1/fe67e780-3073-11f0-9486-b3bf4f299ad0"
			method="POST"
			class="space-y-5"
			onsubmit={() => {
				setTimeout(() => (submitted = true), 100);
			}}
		>
			<div>
				<label for="name" class="mb-1 block text-sm font-medium text-gray-700">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
					placeholder="Your name"
				/>
			</div>
			<div>
				<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
					placeholder="you@example.com"
				/>
			</div>
			<div>
				<label for="message" class="mb-1 block text-sm font-medium text-gray-700">How can we help?</label>
				<textarea
					id="message"
					name="message"
					required
					rows="5"
					class="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
					placeholder="Describe your issue or question..."
				></textarea>
			</div>
			<button
				type="submit"
				class="w-full rounded-lg bg-[#167B9B] px-6 py-3 font-medium text-white hover:bg-[#155E75] sm:w-auto"
			>
				Submit Request
			</button>
		</form>
	{/if}
</div>
