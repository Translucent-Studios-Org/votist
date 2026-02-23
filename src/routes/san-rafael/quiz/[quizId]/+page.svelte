<script lang="ts">
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { dev } from '$app/environment';
	import QuizAnswerCorrectIcon from '$lib/components/icons/QuizAnswerCorrectIcon.svelte';
	import QuizAnswerIncorrectIcon from '$lib/components/icons/QuizAnswerIncorrectIcon.svelte';
	import VideoCard from '$lib/components/cards/VideoCard.svelte';
	import { parseVideoUrl } from '$lib/util/videoUtils';
	import type { Quiz, Option } from '$lib/types';

	interface PageData {
		quiz: Quiz;
		alreadyCompleted: boolean;
	}

	let { data }: { data: PageData } = $props();

	let showCompletedModal = $state(false);

	// If user already completed this quiz, show modal
	$effect(() => {
		if (data.alreadyCompleted) {
			showCompletedModal = true;
		}
	});

	function goToVoteAndDiscuss() {
		showCompletedModal = false;
		goto('/vote');
	}

	let currentQuestionIndex = $state(0);
	let selectedAnswer = $state<string | null>(null);
	let userAnswers = $state<Record<string, string>>({});
	let showFeedback = $state(false);
	let isAnswerCorrect = $state<boolean | null>(false);
	let imageLoadError = $state(false);

	const currentQuestion = $derived(data.quiz.questions[currentQuestionIndex]);
	const isLastQuestion = $derived(currentQuestionIndex === data.quiz.questions.length - 1);
	const progressPercentage = $derived(
		((currentQuestionIndex + 1) / data.quiz.questions.length) * 100
	);

	// Parse video URL for current question if available
	const currentVideoInfo = $derived(() => {
		if (!currentQuestion?.videoUrl) return null;
		return parseVideoUrl(currentQuestion.videoUrl);
	});

	function selectAnswer(answer: string) {
		if (!showFeedback) {
			selectedAnswer = answer;
		}
	}

	function checkAnswer() {
		if (!selectedAnswer || !currentQuestion) return;

		const selectedOption = currentQuestion.options.find(
			(option: Option) => option.text === selectedAnswer
		);

		const isNoOpinion = selectedOption?.isNoOpinion || false;

		if (isNoOpinion) {
			isAnswerCorrect = null;
		} else {
			isAnswerCorrect = selectedOption?.isCorrect || false;
		}

		userAnswers[currentQuestion.id] = selectedAnswer;
		showFeedback = true;
	}

	function nextQuestion() {
		if (isLastQuestion) {
			completeQuiz();
		} else {
			currentQuestionIndex++;
			selectedAnswer = null;
			showFeedback = false;
		}
	}

	async function completeQuiz() {
		try {
			let correctAnswers = 0;
			const totalQuestions = data.quiz.questions.length;

			for (const question of data.quiz.questions) {
				const userAnswer = userAnswers[question.id];
				if (userAnswer) {
					const selectedOption = question.options.find(
						(option: Option) => option.text === userAnswer
					);
					if (selectedOption && selectedOption.isNoOpinion) {
						// skip "no opinion" in scoring
					} else if (selectedOption && selectedOption.isCorrect) {
						correctAnswers++;
					}
				}
			}

			// Passing score is the number of correct answers required
			const passed = correctAnswers >= (data.quiz.passingScore || 1);

			if (dev) {
				console.log('=== SCORING SUMMARY ===');
				console.log(`Total questions: ${totalQuestions}`);
				console.log(`Correct answers: ${correctAnswers}`);
				console.log(`Passing score (number correct): ${data.quiz.passingScore}`);
				console.log(`Passed: ${passed}`);
				console.log('======================');
			}

			const response = await fetch(`/api/userProgress/${data.quiz.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					quizId: data.quiz.id,
					quizScore: correctAnswers,
					isCompleted: passed,
					completedAt: passed ? new Date().toISOString() : null,
					answers: userAnswers
				})
			});

			if (!response.ok) {
				throw new Error(`Quiz completion failed: ${response.status}`);
			}

			await invalidateAll();
			goto('/san-rafael');
		} catch (error) {
			if (dev) console.error('Failed to complete quiz:', error);
			//goto('/san-rafael/quizzes');
		}
	}

	function getCorrectAnswer() {
		if (!currentQuestion) return '';
		const correctOption = currentQuestion.options.find((option: Option) => option.isCorrect);
		return correctOption?.text || '';
	}

	function handleImageError() {
		imageLoadError = true;
	}

	$effect(() => {
		if (currentQuestion) {
			imageLoadError = false;
		}
	});
</script>

<!-- Already completed modal -->
{#if showCompletedModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
		<div class="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl md:p-8">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
			>
				<svg class="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>
			<h2 class="text-votist-blue mb-2 text-xl font-bold md:text-2xl">Knowledge Check Passed!</h2>
			<p class="mb-6 text-base text-gray-600">
				You have already passed the knowledge check. Feel free to vote and discuss!
			</p>
			<button
				type="button"
				class="btn btn-primary btn-md md:btn-lg w-full px-8 text-base font-bold text-white"
				onclick={goToVoteAndDiscuss}
			>
				Go to Vote & Discuss
			</button>
		</div>
	</div>
{/if}

<div class="bg-base-100 min-h-screen px-4 py-6 md:py-8">
	<div class="mx-auto w-full max-w-3xl">
		<div class="flex flex-col items-center justify-center">
			<!-- Progress Bar -->
			<div class="mb-6 w-full">
				<div class="text-base-content mb-2 flex justify-between text-sm">
					<span>Question {currentQuestionIndex + 1} of {data.quiz.questions.length}</span>
					<span>{Math.round(progressPercentage)}%</span>
				</div>
				<progress class="progress progress-primary w-full" value={progressPercentage} max="100"
				></progress>
			</div>

			<!-- Quiz Card -->
			<div
				class="card bg-base-100 w-full p-4 shadow-xl md:p-8"
				style="font-family: Arial, Raleway, sans-serif;"
			>
				<div class="flex w-full flex-col items-center justify-center gap-6">
					<!-- Question Title -->
					<div
						class="text-votist-blue w-full text-left text-lg leading-7 font-bold md:text-2xl md:leading-10"
					>
						{currentQuestion?.text}
					</div>

					<!-- Question Video (if present) -->
					{#if currentVideoInfo()}
						{@const videoInfo = currentVideoInfo()!}
						<div class="w-full">
							<VideoCard videoId={videoInfo.videoId} service={videoInfo.service} />
						</div>
					{/if}

					<!-- Question Image (if present) -->
					{#if currentQuestion?.imageUrl && !imageLoadError}
						<div class="w-full">
							<figure class="w-full">
								<img
									src={currentQuestion.imageUrl}
									alt={currentQuestion.imageAlt ||
										`Illustration for question ${currentQuestionIndex + 1}`}
									class="h-auto max-h-64 w-full rounded-lg object-contain shadow-md md:max-h-80"
									loading="lazy"
									onerror={handleImageError}
								/>
							</figure>
						</div>
					{/if}

					<!-- Quiz Description -->
					<div
						class="w-full text-left text-sm leading-relaxed font-normal text-neutral-600 md:text-base"
					>
						{data.quiz.description}
					</div>

					<!-- Answer Options -->
					<div class="flex w-full flex-col gap-3">
						{#each currentQuestion?.options || [] as option, index}
							{#if showFeedback}
								<!-- Feedback state: show correct/incorrect styling -->
								<div
									class="flex w-full gap-3 rounded-md px-3 py-3 text-left outline outline-offset-[-1px] md:gap-6 md:px-6"
									class:bg-cyan-100={option.isCorrect}
									class:outline-cyan-600={option.isCorrect}
									class:bg-gray-200={selectedAnswer === option.text && !option.isCorrect}
									class:outline-neutral-400={selectedAnswer !== option.text || option.isCorrect}
									class:bg-white={selectedAnswer !== option.text && !option.isCorrect}
								>
									{#if option.isCorrect}
										<QuizAnswerCorrectIcon />
									{:else if selectedAnswer === option.text}
										<QuizAnswerIncorrectIcon />
									{/if}
									<div class="flex-1 text-sm leading-tight font-normal text-stone-900 md:text-base">
										{option.text}
										{#if option.isNoOpinion}
											<span class="text-neutral-content/70 ml-2 text-xs md:text-sm"
												>(No Opinion)</span
											>
										{/if}
									</div>
								</div>
							{:else}
								<!-- Default state: interactive buttons -->
								<button
									type="button"
									class="w-full rounded-md px-3 py-4 text-left text-sm leading-tight font-normal text-stone-900 outline-1 outline-offset-[-1px] transition-all duration-150 md:px-6 md:py-5 md:text-base"
									class:bg-white={selectedAnswer !== option.text}
									class:bg-primary-10={selectedAnswer === option.text}
									class:outline-neutral-400={selectedAnswer !== option.text}
									class:outline-primary={selectedAnswer === option.text}
									onclick={() => selectAnswer(option.text)}
									disabled={showFeedback}
								>
									{option.text}
									{#if option.isNoOpinion}
										<span class="text-neutral-content/70 ml-2 text-xs md:text-sm">(No Opinion)</span
										>
									{/if}
								</button>
							{/if}
						{/each}
					</div>

					<!-- Continue/Submit Button -->
					<div class="flex w-full justify-center pt-2">
						{#if !showFeedback}
							<button
								class="btn btn-primary w-full rounded-md px-8 py-2 text-base font-bold text-white md:w-auto"
								onclick={checkAnswer}
								disabled={!selectedAnswer}
								type="button"
							>
								Continue
							</button>
						{:else}
							<button
								class="btn btn-primary w-full rounded-md px-8 py-2 text-base font-bold text-white md:w-auto"
								onclick={nextQuestion}
								type="button"
							>
								{isLastQuestion ? 'Complete Knowledge Check' : 'Continue'}
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
