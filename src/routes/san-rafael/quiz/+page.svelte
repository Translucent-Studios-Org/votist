<script lang="ts">
	import { goto } from '$app/navigation';
	import QuizRoadmap from '$lib/components/quiz/QuizRoadmap.svelte';

	let { data } = $props();

	const quizzes: any[] = $derived(data.quizzes || []);
	const completedQuizIds = $derived(
		quizzes.filter((q: any) => q.status === 'COMPLETED').map((q: any) => q.id)
	);
	const userProgress = $derived(
		quizzes.reduce((acc: any, q: any) => {
			acc[q.id] = { isCompleted: q.status === 'COMPLETED', quizScore: q.score };
			return acc;
		}, {})
	);

	function nextAvailableQuiz() {
		const available = quizzes.find((q: any) => q.status === 'AVAILABLE');
		if (available) {
			goto(`/san-rafael/quiz/${available.id}`);
		}
	}
</script>

<div class="bg-base-100 flex min-h-screen flex-col items-center px-4 py-8 md:px-6 md:py-12">
	<div class="mx-auto mb-6 w-full max-w-4xl md:mb-8">
		<!-- Header -->
		<div class="mb-6 flex items-center gap-3">
			<svg class="h-7 w-7 text-[#167B9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
				/>
			</svg>
			<h1 class="text-2xl font-bold text-votist-blue md:text-3xl">Knowledge Check</h1>
		</div>
		<span
			class="bg-votist-gold mb-4 inline-block rounded-full px-3 py-1 text-sm font-medium text-white"
		>
			Step 2 of 3
		</span>
		<p class="mt-3 text-base leading-relaxed text-gray-700 md:text-lg">
			Establish shared context by completing a short 5-question knowledge check.
		</p>

		<!-- Start button -->
		<div class="mt-6">
			<button
				type="button"
				class="btn btn-primary btn-md md:btn-lg px-8 text-base font-bold text-white md:px-10 md:text-lg"
				onclick={nextAvailableQuiz}
				aria-label="Start next available knowledge check"
			>
				Start Knowledge Check
			</button>
		</div>
	</div>

	<!-- Knowledge Check Roadmap -->
	<div class="mx-auto w-full max-w-4xl">
		<QuizRoadmap {quizzes} {completedQuizIds} {userProgress} />
	</div>
</div>
