<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import QuizSuccessIcon from '$lib/components/icons/QuizSuccessIcon.svelte';
	import DiscussionIcon from '$com/icons/DiscussionIcon.svelte';
	import KnowledgeIcon from '$com/icons/KnowledgeIcon.svelte';
	import CoffeeMugIcon from '$com/icons/CoffeeMugIcon.svelte';

	interface Completion {
		isCompleted: boolean;
		quizScore: number;
		answers: Record<string, string>;
	}

	interface NextQuiz {
		id: string;
		title: string;
		difficulty?: string;
	}

	interface PageData {
		quiz: any;
		completion: Completion;
		nextQuiz?: NextQuiz;
	}

	let { data }: { data: PageData } = $props();

	// Use $derived for pass/fail logic
	const passed = $derived(() => {
		const answers = data.completion?.answers ?? {};
		const questions = data.quiz?.questions ?? [];
		const passingScore = data.quiz?.passingScore ?? 1;
		let correctAnswers = 0;
		for (const question of questions) {
			const userAnswer = answers[question.id];
			if (userAnswer) {
				const selectedOption = question.options.find((option: any) => option.text === userAnswer);
				if (selectedOption && selectedOption.isNoOpinion) {
					continue;
				} else if (selectedOption && selectedOption.isCorrect) {
					correctAnswers++;
				}
			}
		}
		const isCompleted = data.completion?.isCompleted ?? false;
		return isCompleted && correctAnswers >= passingScore;
	});

	async function handleBackToRoadmap() {
		await invalidateAll();
		goto('/san-rafael/quiz'); // Go to knowledge check page
	}

	async function handleRetakeQuiz() {
		let quizId = data?.quiz?.id;
		const pageParams = (globalThis as any).$page?.params;
		if (!quizId && pageParams?.quizId) {
			quizId = pageParams.quizId;
		}
		if (quizId) {
			goto(`/san-rafael/quiz/${quizId}?retake=${Date.now()}`);
		}
	}

	function handleNextQuiz() {
		if (data.nextQuiz) {
			goto(`/san-rafael/quiz/${data.nextQuiz.id}`); // Go to next quiz
		}
	}

	function handleVoteNow() {
		goto('/vote'); // Go to proposals for voting
	}

	function handleLearnMore() {
		goto('/san-rafael/learn-more'); // Go to learn more page
	}
</script>

{#if passed()}
	<div class="min-h-screen bg-white px-4 py-8 md:py-16">
		<div class="mx-auto flex w-full max-w-3xl flex-col items-center">
			<!-- Main Title -->
			<h1 class="mb-6 text-center text-2xl font-bold text-cyan-600 md:mb-8 md:text-5xl">
				Completed! {data.quiz.title}
			</h1>

			<!-- You Gain Section -->
			<div class="mb-6 w-full md:mb-8">
				<h2 class="mb-4 text-xl font-bold text-amber-400 md:mb-6 md:text-3xl">You gain:</h2>
				<div class="flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
					<div class="flex flex-1 flex-col gap-4 md:gap-6">
						<div class="flex items-center gap-3">
							<QuizSuccessIcon size="w-6 h-6" />
							<span class="text-base font-medium text-amber-400 md:text-xl">+1</span>
							<span class="text-base font-medium text-cyan-800 md:text-xl">
								Vote {data.quiz.title.includes(':') ? data.quiz.title.split(':')[0] : 'San Rafael'} Housing
							</span>
						</div>
						<div class="flex items-center gap-3">
							<KnowledgeIcon size="w-8 h-8" />
							<span class="text-base font-medium text-amber-400 md:text-xl">+1</span>
							<span class="text-base font-medium text-cyan-800 md:text-xl">Knowledge</span>
						</div>
					</div>
					<div class="flex flex-1 flex-col gap-4 md:gap-6">
						<div class="flex items-center gap-3">
							<DiscussionIcon size="w-6 h-6" />
							<span class="text-base font-medium text-cyan-800 md:text-xl">Join the discussions</span>
						</div>
						<div class="flex items-center gap-3">
							<span
								class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-400"
							>
								<span class="text-xs font-semibold text-white">V</span>
							</span>
							<span class="text-base font-medium text-cyan-800 md:text-xl">Votist status</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Action Buttons + Description Row -->
			<div class="mb-6 flex w-full flex-col items-start gap-6 md:mb-8 md:flex-row md:gap-8">
				<div class="flex w-full flex-col gap-3 md:w-auto md:gap-4">
					<button
						onclick={handleVoteNow}
						class="btn btn-primary btn-md flex items-center gap-3 px-6 text-lg font-medium shadow md:btn-lg md:gap-4 md:px-10 md:text-4xl"
					>
						<QuizSuccessIcon size="w-6 h-6" />
						Vote
					</button>
					{#if data.nextQuiz}
						<button
							onclick={handleNextQuiz}
							class="btn btn-primary btn-md px-6 text-lg font-medium shadow md:btn-lg md:px-10 md:text-4xl"
						>
							Next Knowledge Check
						</button>
					{/if}
				</div>
				<div class="flex flex-1 flex-col justify-center gap-2 md:gap-4">
					<div class="text-xl font-medium text-yellow-500 md:text-4xl">Vote Now</div>
					<div class="text-xl font-medium text-cyan-800 md:text-4xl">
						Or, keep going to get more voting power.
					</div>
				</div>
			</div>

			<!-- Back to Roadmap Button -->
			<div class="mt-8 text-center md:mt-16">
				<button
					class="btn btn-outline border-cyan-600 px-6 text-base text-cyan-600 hover:bg-cyan-600 hover:text-white md:px-8 md:text-lg"
					onclick={handleBackToRoadmap}
				>
					Back to Knowledge Check
				</button>
			</div>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-white px-4 py-8 md:py-16">
		<div class="mx-auto flex w-full max-w-3xl flex-col items-start">
			<div class="flex w-full flex-col items-start gap-6 md:flex-row md:gap-12">
				<!-- Coffee Mug Icon (hidden on mobile) -->
				<div class="hidden flex-shrink-0 md:block">
					<CoffeeMugIcon size="w-28 h-32" />
				</div>
				<!-- Main Content -->
				<div class="flex flex-1 flex-col gap-6 md:gap-8">
					<div class="flex flex-col gap-2">
						<div class="text-3xl leading-tight font-medium text-black md:text-5xl">Good effort</div>
						<div class="text-xl font-medium text-cyan-600 md:text-4xl">
							Learn more about this topic in the Research Tab
						</div>
					</div>
					<!-- Try again -->
					<div class="flex flex-col gap-3">
						<div class="text-2xl font-medium text-cyan-600 italic md:text-4xl">
							Try again!
						</div>
						<div class="flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-6">
							<button
								onclick={handleRetakeQuiz}
								class="btn btn-primary btn-md rounded-lg px-8 text-xl font-bold shadow md:btn-lg md:text-3xl"
							>
								Start
							</button>
							<span class="text-xl font-medium text-cyan-800 md:text-3xl">
								{data.quiz.title}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
