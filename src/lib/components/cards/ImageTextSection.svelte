<script lang="ts">
	export let heading: string;
	export let content: string;
	export let imageUrl: string;
	export let imageAlt: string;
	export let buttonText: string;
	export let buttonHref: string;
	export let imageOnLeft: boolean = true;
</script>

<div class="flex items-center bg-gray-50 px-4 py-12 md:min-h-[500px] md:px-8 md:py-[10vh]">
	<div class="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 md:flex-row md:gap-12">
		{#if imageOnLeft}
			<div class="w-full md:flex-1">
				<img src={imageUrl} alt={imageAlt} class="mx-auto w-full max-w-md rounded-lg shadow-lg md:max-w-xl" />
			</div>
		{/if}

		<div class="w-full space-y-4 md:flex-1 md:space-y-6">
			<h2 class="text-votist-blue text-2xl font-bold md:text-3xl">
				{heading}
			</h2>
			<p class="text-base text-gray-700 md:text-lg">
				{content}
			</p>
			<div>
				<a href={buttonHref}>
					<button
						class="bg-votist-blue hover:bg-votist-blue/90 btn btn-lg w-full rounded-md px-6 py-3 text-base font-medium text-white transition-colors sm:w-auto md:px-8 md:text-lg"
					>
						{buttonText}
					</button>
				</a>
			</div>
		</div>

		{#if !imageOnLeft}
			<div class="w-full md:flex-1">
				<img src={imageUrl} alt={imageAlt} class="mx-auto w-full max-w-md rounded-lg shadow-lg md:max-w-xl" />
			</div>
		{/if}
	</div>
</div>
