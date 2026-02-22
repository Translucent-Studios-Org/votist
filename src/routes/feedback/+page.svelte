<script lang="ts">
	let submitted = $state(false);
</script>

<div class="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
	<h1 class="mb-2 text-2xl font-bold text-votist-blue md:text-3xl">Your Feedback</h1>
	<p class="mb-8 text-gray-600">Help us improve Votist. We'd love to hear your thoughts, suggestions, and ideas for making our platform better.</p>

	{#if submitted}
		<div class="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
			<div class="mb-2 text-2xl">&#10003;</div>
			<h2 class="mb-2 text-lg font-semibold text-green-800">Thank you for your feedback!</h2>
			<p class="text-green-700">We appreciate you taking the time to share your thoughts. We'll review your feedback carefully.</p>
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
			action="https://public.herotofu.com/v1/375281f0-0886-11f1-b8b0-610c8f909331"
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
				<label for="message" class="mb-1 block text-sm font-medium text-gray-700">Message</label>
				<textarea
					id="message"
					name="message"
					required
					rows="5"
					class="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#167B9B] focus:ring-1 focus:ring-[#167B9B] focus:outline-none"
					placeholder="Share your thoughts, suggestions, or ideas..."
				></textarea>
			</div>
			<button
				type="submit"
				class="w-full rounded-lg bg-[#167B9B] px-6 py-3 font-medium text-white hover:bg-[#155E75] sm:w-auto"
			>
				Send Feedback
			</button>
		</form>
	{/if}
</div>
