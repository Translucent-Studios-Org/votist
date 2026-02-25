<script lang="ts">
	import { ChevronDown, Send, Check, RotateCcw } from 'lucide-svelte';
	import logoWhite from '$lib/assets/logo/logo-white.png';

	interface ChatMessage {
		role: 'user' | 'assistant';
		content: string;
	}

	const MAX_MESSAGES = 20;
	const WELCOME_MESSAGE =
		"I'm the Votist Assistant.\nAsk about San Rafael housing policy, the governing framework, the knowledge check, or how participation works here.\nResponses are grounded in official documents and the shared briefing materials.";

	let isOpen = $state(false);
	let inputText = $state('');
	let messages = $state<ChatMessage[]>([]);
	let isStreaming = $state(false);
	let chatContainer: HTMLDivElement | undefined = $state(undefined);

	let limitReached = $derived(messages.length >= MAX_MESSAGES);

	$effect(() => {
		if (messages.length && chatContainer) {
			queueMicrotask(() => {
				if (chatContainer) {
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			});
		}
	});

	function toggleChat() {
		isOpen = !isOpen;
	}

	function resetChat() {
		messages = [];
		inputText = '';
	}

	async function sendMessage() {
		if (!inputText.trim() || isStreaming || limitReached) return;

		const userMessage = inputText.trim();
		inputText = '';
		messages = [...messages, { role: 'user', content: userMessage }];

		isStreaming = true;
		messages = [...messages, { role: 'assistant', content: '' }];

		try {
			const response = await fetch('/api/assistant', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages
						.filter((m) => m.content)
						.map((m) => ({ role: m.role, content: m.content }))
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get response');
			}

			const reader = response.body!.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;
						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								messages = messages.map((m, i) =>
									i === messages.length - 1 ? { ...m, content: m.content + delta } : m
								);
							}
						} catch {
							/* skip non-JSON lines */
						}
					}
				}
			}
		} catch {
			messages = messages.map((m, i) =>
				i === messages.length - 1
					? { ...m, content: "Sorry, I couldn't process that request. Please try again." }
					: m
			);
		} finally {
			isStreaming = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

<!-- Floating button (closed state) -->
{#if !isOpen}
	<button
		onclick={toggleChat}
		class="fixed right-3 bottom-[4.5rem] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#167b9b] shadow-lg transition-transform hover:scale-105 sm:h-16 sm:w-16 md:right-6 md:bottom-6 md:h-20 md:w-20"
		aria-label="Open Votist Assistant"
	>
		<img src={logoWhite} alt="" class="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10" />
	</button>
{/if}

<!-- Chat panel (open state) -->
{#if isOpen}
	<div
		class="chat-panel fixed inset-x-0 bottom-0 z-50 flex w-full flex-col overflow-hidden rounded-none bg-white shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-20 sm:w-[420px] sm:rounded-2xl md:right-6 md:bottom-6 md:w-[480px]"
		style="height: min(800px, calc(100vh - 3.5rem));"
	>
		<!-- Header -->
		<div class="flex items-center justify-between bg-[#167b9b] px-4 py-3">
			<div class="flex items-center gap-2">
				<Check class="h-5 w-5 text-white" />
				<span class="text-sm font-semibold text-white sm:text-base">Votist Assistant</span>
			</div>
			<div class="flex items-center gap-1">
				<button
					onclick={resetChat}
					class="rounded p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
					aria-label="New chat"
					title="New chat"
				>
					<RotateCcw class="h-4 w-4" />
				</button>
				<button
					onclick={toggleChat}
					class="flex items-center gap-1 rounded-md px-2 py-1.5 text-white/80 hover:bg-white/20 hover:text-white"
					aria-label="Minimize assistant"
					title="Minimize"
				>
					<ChevronDown class="h-5 w-5" />
				</button>
			</div>
		</div>

		<!-- Messages area -->
		<div bind:this={chatContainer} class="flex-1 space-y-3 overflow-y-auto p-4">
			<!-- Welcome message -->
			<div class="rounded-lg bg-gray-100 px-3 py-2 text-sm whitespace-pre-line text-gray-700">
				{WELCOME_MESSAGE}
			</div>

			{#each messages as message, i}
				{#if message.role === 'user'}
					<div class="flex justify-end">
						<div class="max-w-[80%] rounded-lg bg-[#167b9b] px-3 py-2 text-sm text-white">
							{message.content}
						</div>
					</div>
				{:else}
					<div class="rounded-lg bg-white px-3 py-2 text-sm whitespace-pre-wrap text-gray-700">
						{message.content}{#if isStreaming && i === messages.length - 1}<span
								class="bg-gray-white ml-0.5 inline-block h-4 w-1 animate-pulse"
							></span>{/if}
					</div>
				{/if}
			{/each}

			{#if limitReached && !isStreaming}
				<div
					class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-700"
				>
					Conversation limit reached. Please
					<button onclick={resetChat} class="font-semibold underline hover:no-underline">
						start a new chat
					</button>.
				</div>
			{/if}
		</div>

		<!-- Input area -->
		<div class="border-t border-gray-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={inputText}
					onkeydown={handleKeydown}
					placeholder={limitReached ? 'Chat limit reached' : 'Type your question here...'}
					class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#167b9b] focus:ring-1 focus:ring-[#167b9b] focus:outline-none disabled:bg-gray-50"
					disabled={isStreaming || limitReached}
				/>
				<button
					onclick={sendMessage}
					disabled={!inputText.trim() || isStreaming || limitReached}
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#167b9b] text-white transition-colors hover:bg-[#155e75] disabled:opacity-50"
					aria-label="Send message"
				>
					<Send class="h-4 w-4" />
				</button>
			</div>
		</div>
	</div>
{/if}
