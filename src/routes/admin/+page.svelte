<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/admin/dashboard', { replaceState: true });
	});
</script>

<div class="flex justify-center py-16">
	<span class="loading loading-spinner loading-lg"></span>
</div>
