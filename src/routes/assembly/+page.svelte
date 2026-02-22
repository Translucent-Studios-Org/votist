<script lang="ts">
	export let data: any;
</script>

<div class="mx-auto max-w-4xl px-4 py-8 md:py-12">
	<h1 class="mb-2 text-2xl font-bold text-[#155E75] md:text-3xl">Assemblies</h1>
	<p class="mb-8 text-gray-600">
		Join an assembly to participate in structured civic discussions in your community.
	</p>

	<div class="grid gap-6 md:grid-cols-2">
		{#each data.assemblies as assembly}
			<a
				href="/san-rafael"
				class="block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
			>
				<div class="mb-3 flex items-center gap-2">
					<span class="rounded-md bg-[#155E75] px-2.5 py-1 text-xs font-medium text-white">
						Active
					</span>
					{#if assembly.location}
						<span class="text-sm text-gray-500">{assembly.location}</span>
					{/if}
				</div>
				<h2 class="mb-1 text-xl font-bold text-gray-900">{assembly.title}</h2>
				<p class="mb-4 text-gray-600">{assembly.description}</p>
				<span class="text-sm font-semibold text-[#167B9B]">Join assembly &rarr;</span>
			</a>
		{/each}
	</div>
</div>
