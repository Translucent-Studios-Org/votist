<script lang="ts">
	export let heading: string;
	export let boldcontent: string;
	export let content: string;
	export let subContent: string = '';
	export let primaryButton: { text: string; href: string };
	export let secondaryButton: { text: string; href: string; icon?: string } | null = null;
</script>

<div class="flex flex-col items-center justify-center bg-gray-50 px-4 py-16 md:my-0 md:py-[20vh]">
	<div class="max-w-3xl text-center">
		<h1 class="text-votist-blue mb-6 text-2xl font-bold md:mb-8 md:text-4xl">{heading}</h1>
		<p class="mb-4 text-base text-gray-700 md:mb-6 md:text-lg">
			<span class="font-semibold">{boldcontent}</span>
			{content}
		</p>
		{#if subContent}
			<p class="mb-6 text-base font-semibold text-gray-700 md:mb-8 md:text-lg">{subContent}</p>
		{/if}
		<div class="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
			<a href={primaryButton.href}>
				<button
					class="btn btn-lg bg-votist w-full rounded-md px-6 py-4 text-base font-medium text-white hover:scale-105 sm:w-auto md:px-8 md:py-5 md:text-lg"
				>
					{primaryButton.text}
				</button>
			</a>
			{#if secondaryButton}
				<a href={secondaryButton.href}>
					<button
						class="btn btn-lg bg-votist-blue-dark flex w-full items-center justify-center gap-2 px-6 py-4 text-white hover:scale-105 sm:w-auto md:px-8 md:py-5"
					>
						{#if secondaryButton.icon}
							<img src={secondaryButton.icon} alt="" class="h-5 w-5 md:h-6 md:w-6" />
						{/if}
						{secondaryButton.text}
					</button>
				</a>
			{/if}
		</div>
	</div>
</div>
