<script lang="ts">
	import QuizPassedIcon from '$lib/components/icons/QuizPassedIcon.svelte';
	import QuizAvailableIcon from '$lib/components/icons/QuizAvailableIcon.svelte';
	import QuizLockedIcon from '$lib/components/icons/QuizLockedIcon.svelte';
	import type { Quiz } from '$lib/types';

	interface Level {
		id: 'VOTIST' | 'SCHOLAR' | 'MENTOR';
		label: string;
		letter: string;
		bgColor: string;
		textColor: string;
	}

	export let quiz: Quiz;
	export let level: Level;
	export let canTakeQuiz: boolean;
	export let onClick: () => void;
	export let status: 'completed' | 'available' | 'locked';
	export let isNext: boolean = false;
	export let userProgress: Record<string, any>;
</script>

<div class="relative flex items-center gap-6">
	<div class="tooltip tooltip-top tooltip-primary" class:tooltip={isNext} data-tip="Next knowledge check">
		<button
			type="button"
			on:click={canTakeQuiz ? onClick : undefined}
			disabled={!canTakeQuiz}
			aria-label={status === 'completed'
				? `View results for ${quiz.title}`
				: status === 'available'
					? `Start: ${quiz.title}`
					: `Locked: ${quiz.title}`}
			class="transition-colors {canTakeQuiz
				? 'cursor-pointer hover:opacity-80'
				: 'cursor-not-allowed'}"
		>
			{#if status === 'completed'}
				<QuizPassedIcon />
			{:else if status === 'available'}
				<QuizAvailableIcon bgColor={level.bgColor} />
			{:else}
				<QuizLockedIcon />
			{/if}
		</button>
	</div>
	<div class="text-base-content text-base leading-relaxed">{quiz.title}</div>
</div>
