<script lang="ts">
	import VideoCard from '$lib/components/cards/VideoCard.svelte';
</script>

<div class="bg-base-100 flex min-h-screen flex-col items-center px-4 py-8 md:px-6 md:py-12">
	<div class="mx-auto w-full max-w-4xl">
		<!-- Header -->
		<div class="mb-6 md:mb-8">
			<p class="mb-1 text-sm font-medium tracking-wide text-gray-500 uppercase">Assembly</p>
			<h1 class="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
				San Rafael Housing and the Future
			</h1>
			<p class="mb-3 text-base leading-relaxed text-gray-700 md:text-lg">
				A brief orientation to the legal and structural constraints shaping housing decisions in San
				Rafael.
			</p>
			<span
				class="bg-votist-gold inline-block rounded-full px-3 py-1 text-sm font-medium text-white"
			>
				Step 1 of 3
			</span>
		</div>

		<!-- Watch the Orientation -->
		<div class="mb-6 md:mb-8">
			<h2 class="mb-3 text-lg font-semibold text-gray-900 md:text-xl">
				Watch the Orientation (3 min)
			</h2>
			<div class="overflow-hidden rounded-lg shadow-md">
				<VideoCard videoId="1069291539" service="Vimeo" />
			</div>
		</div>

		<!-- Start Knowledge Check CTA -->
		<div class="mb-8 md:mb-10">
			<a
				href="/san-rafael/quiz/cmliugj750007pepgmpphvune"
				class="btn btn-primary btn-md md:btn-lg px-8 text-base font-bold text-white md:px-10 md:text-lg"
			>
				Start Knowledge Check
			</a>
		</div>

		<!-- Go Deeper Section -->
		<div class="mb-8 md:mb-10">
			<h2 class="mb-1 text-lg font-semibold text-gray-900 md:text-xl">
				Go Deeper <span class="text-sm font-normal text-gray-500">(optional but recommended)</span>
			</h2>
			<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
				<!-- Full Background Brief Card -->
				<a
					href="/san-rafael/background-brief"
					class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
				>
					<h3 class="mb-1 text-base font-bold text-gray-900 italic">Full Background Brief</h3>
					<p class="mb-2 text-xs font-medium text-gray-500">10 min Read</p>
					<p class="text-sm leading-relaxed text-gray-600">
						A structured explanation of housing policies and state power.
					</p>
				</a>
				<!-- Plain-Language Study Guide Card -->
				<a
					href="/san-rafael/study-guide"
					class="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
				>
					<h3 class="mb-1 text-base font-bold text-gray-900 italic">Plain-Language Study Guide</h3>
					<p class="mb-2 text-xs font-medium text-gray-500">5 min Read</p>
					<p class="text-sm leading-relaxed text-gray-600">
						Key facts summarized. A clear prep for the Knowledge Check.
					</p>
				</a>
			</div>
		</div>

		<!-- Primary Sources & References -->
		<div class="mb-8 md:mb-10">
			<h2 class="mb-4 text-lg font-semibold text-gray-900 md:text-xl">
				Primary Sources & References
			</h2>
			<div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
				<h3 class="mb-4 text-base font-bold text-gray-900">
					City & Local Government Sources (Core)
				</h3>
				<div class="space-y-5">
					<div>
						<p class="text-sm font-semibold text-gray-900">
							San Rafael 2023-2031 Housing Element (Certified)
						</p>
						<p class="text-xs text-gray-600">
							Official plan showing how the city must plan for housing, including targets and
							strategies.
						</p>
						<a
							href="https://www.cityofsanrafael.org/housing-element/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[#167B9B] hover:underline"
						>
							https://www.cityofsanrafael.org/housing-element/
						</a>
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">
							San Rafael Housing Element Document Library
						</p>
						<p class="text-xs text-gray-600">Direct access to the full plan and related files.</p>
						<a
							href="https://www.cityofsanrafael.org/housing-element-document-library/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[#167B9B] hover:underline"
						>
							https://www.cityofsanrafael.org/housing-element-document-library/
						</a>
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">
							General Plan 2040 / Housing Element Overview
						</p>
						<p class="text-xs text-gray-600">
							San Rafael's long-range planning framework that includes housing policies.
						</p>
						<a
							href="https://www.cityofsanrafael.org/generalplan-2040/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[#167B9B] hover:underline"
						>
							https://www.cityofsanrafael.org/generalplan-2040/
						</a>
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">
							General Plan 2040 Document Library (Full PDFs)
						</p>
						<p class="text-xs text-gray-600">
							Full General Plan (including housing chapters and background materials).
						</p>
						<a
							href="https://www.cityofsanrafael.org/gp-2040-document-library/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[#167B9B] hover:underline"
						>
							https://www.cityofsanrafael.org/gp-2040-document-library/
						</a>
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-900">
							San Rafael Annual Housing Progress Report (APR)
						</p>
						<p class="text-xs text-gray-600">
							Latest progress toward housing goals and permit activity.
						</p>
						<a
							href="https://www.cityofsanrafael.org/housing-element-annual-progress-reports/"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-[#167B9B] hover:underline"
						>
							https://www.cityofsanrafael.org/housing-element-annual-progress-reports/
						</a>
					</div>
				</div>
			</div>
		</div>

		<!-- Bottom CTA -->
		<div class="mb-8">
			<a
				href="/san-rafael/quiz/cmliugj750007pepgmpphvune"
				class="btn btn-primary btn-md md:btn-lg px-8 text-base font-bold text-white md:px-10 md:text-lg"
			>
				Start Knowledge Check
			</a>
		</div>
	</div>
</div>
