<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="min-h-screen">
	<div class="navbar bg-base-200">
		<div class="flex-1">
			<a href="/admin" class="btn btn-ghost text-xl">Admin Panel</a>
		</div>
		<div class="flex-none">
			<ul class="menu menu-horizontal px-1">
				<li>
					<a href="/admin/dashboard" class:active={$page.url.pathname.includes('/dashboard')}>Dashboard</a>
				</li>
				<li>
					<a href="/admin/users" class:active={$page.url.pathname.includes('/users')}>Users</a>
				</li>
				<li>
					<a href="/admin/quizzes" class:active={$page.url.pathname.includes('/quizzes')}>Quizzes</a
					>
				</li>
				<li>
					<a href="/admin/posts" class:active={$page.url.pathname.includes('/posts')}>Posts</a>
				</li>
				<li>
					<a href="/admin/moderation" class:active={$page.url.pathname.includes('/moderation')}>Moderation</a>
				</li>
			</ul>
		</div>
	</div>

	<div class="container mx-auto max-w-7xl p-4">
		<slot />
	</div>
</div>
