<script lang="ts">
	export let totalComments: number = 0;
</script>

<div class="mb-6 border-b border-gray-200 pb-4">
	<h2 class="mb-2 flex items-center gap-2 text-xl font-bold text-votist-blue">
		<span class="text-[#167b9b]">💬</span>
		Assembly Discussion
	</h2>
	<p class="text-sm text-gray-600">
		Join the discussion and help shape the solution. Your contributions can earn additional voting
		power in the assembly.
	</p>
	<div class="mt-2 text-sm text-gray-500">
		{totalComments}
		{totalComments === 1 ? 'comment' : 'comments'}
	</div>
</div>
