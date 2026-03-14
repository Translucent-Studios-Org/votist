# Votist Code Review Report

**Date**: 2026-03-04
**Branch**: main
**Reviewer**: Claude Code (automated)

---

## Summary

No new changes to review (working tree is clean against main). This report documents **pre-existing issues** discovered during a deep codebase audit, organized by severity.

---

## P0 — Critical (must fix before production)

### 1. Quiz score self-reporting allows full gate bypass

**File**: `src/routes/api/userProgress/+server.ts` (PATCH handler)

The `PATCH` endpoint accepts client-supplied `isCompleted` and `quizScore` values and writes them directly to the database. Any authenticated user can POST `{ isCompleted: true, quizScore: 100 }` for any quiz to bypass the entire knowledge-gating system — the core feature of the platform.

```ts
// Current: trusts client-supplied values
await prisma.userProgress.upsert({
  update: { quizScore, isCompleted, completedAt, materialId: materialId || '' },
  create: { quizId, quizScore: quizScore || 0, isCompleted: isCompleted || false, ... }
});
```

**Fix**: Remove client-supplied score/completion. Submit answers server-side, compute the score on the backend, and only mark completion if the score meets the threshold.

---

### 2. WordPress content rendered without sanitization (XSS)

**Files**: `src/routes/research/+page.svelte`, `src/routes/research/[slug]/+page.svelte`, `src/routes/research/+layout.svelte`

All WordPress HTML is rendered via `{@html post.content}`, `{@html post.title}`, `{@html post.excerpt}`, and `{@html post.meta}` with zero sanitization. If the WordPress instance is compromised, arbitrary JavaScript executes in users' browsers. The `{@html post.meta}` usage injects Yoast SEO HTML into `<svelte:head>`, which could include `<script>` tags.

`src/lib/wordpress.ts` `formatPost()` performs no sanitization — it returns `content.rendered` verbatim.

**Fix**: Install `isomorphic-dompurify` or `sanitize-html`. Sanitize all WordPress-sourced HTML before returning it from load functions.

---

### 3. `/api/test-polls` is publicly accessible

**File**: `src/routes/api/test-polls/+server.ts`

Unauthenticated endpoint that exposes database row counts (users, posts, polls, comments) and documents all API routes with descriptions.

**Fix**: Delete the endpoint or gate it behind `requireAdmin(event)`.

---

## P1 — Should fix soon

### 4. Clerk ID vs DB user ID confusion in quiz results

**Files**: `src/routes/san-rafael/quiz/[quizId]/results/+page.server.ts`, `src/routes/api/quiz/[quizId]/results/+server.ts`

These endpoints query `UserProgress` using `userId: user.id` where `user.id` is the Clerk ID (`user_xxx`), but the `UserProgress.userId` column stores the internal DB user CUID. The query never matches, so quiz results always appear empty.

**Fix**: Look up the DB user by Clerk ID first, then query `UserProgress` with the DB user's `id`.

---

### 5. Multiple `PrismaClient` instantiations

**Files**:
- `src/routes/api/quizzes/+server.ts`
- `src/routes/api/quizzes/[id]/+server.ts`
- `src/routes/api/test-polls/+server.ts`
- `src/routes/api/comments/+server.ts`

Each creates `new PrismaClient()` instead of importing from `$lib/server/db/prisma.ts`. In development, this causes the "too many Prisma clients" / connection pool exhaustion warning.

**Fix**: Replace all `new PrismaClient()` with `import { prisma } from '$lib/server/db/prisma'`.

---

### 6. HTML injection in admin email templates

**Files**: `src/routes/api/admin/users/[id]/email/+server.ts`, `src/lib/server/email.ts`

Admin-provided `emailBody` is interpolated into HTML with only `\n` → `<br>` conversion. Warning emails interpolate `params.message` directly into a `<blockquote>`. An admin (or a compromised admin account) could inject arbitrary HTML/JS into emails.

**Fix**: HTML-escape user/admin-supplied content before interpolation, or use a templating library with auto-escaping.

---

### 7. `/api/check-email` is unauthenticated

**File**: `src/routes/api/check-email/+server.ts`

Any anonymous request can check whether an email is registered in Clerk. This is a user enumeration vector.

**Fix**: Require authentication, add rate limiting, or remove the endpoint.

---

### 8. No rate limiting on any endpoint

No request rate limiting exists anywhere in the codebase. Notable risks:
- `/api/assistant` makes expensive OpenRouter API calls per request with no per-user throttle
- Vote, comment, and like endpoints can be spammed
- Auth endpoints have no brute-force protection

**Fix**: Add rate limiting middleware (e.g., `express-rate-limit` equivalent for SvelteKit, or a custom token-bucket in `hooks.server.ts`).

---

### 9. Admin routes use inconsistent privilege checks

Some admin API routes use `requireAdmin(event)` (which checks both Clerk metadata and DB role). Others check `user.publicMetadata?.role !== 'admin'` inline, which can diverge from the database if Clerk and the DB get out of sync.

**Files**: `src/routes/api/admin/moderation/+server.ts`, `src/routes/api/admin/users/[id]/ban/+server.ts`, `src/routes/api/admin/users/[id]/warn/+server.ts` (and others)

**Fix**: Use `requireAdmin(event)` consistently across all admin endpoints.

---

### 10. `throw new Error()` instead of SvelteKit error helpers

**File**: `src/routes/admin/posts/[id]/edit/+page.server.ts`

Uses `throw new Error('Unauthorized')` instead of `throw error(401, 'Unauthorized')` or `throw redirect(307, '/sign-in')`. This renders a generic 500 error page rather than a proper error or redirect.

**Fix**: Use `import { error, redirect } from '@sveltejs/kit'` and throw the appropriate helper.

---

## P2 — Technical debt

### 11. Mixed Svelte 4 and Svelte 5 patterns

**Files**: `Comment.svelte`, `CommentForm.svelte`, `DiscussionComment.svelte`, `VotingOption.svelte`, `DiscussionSection.svelte`

These components use Svelte 4 patterns (`export let`, `createEventDispatcher`, `on:click`, `$:` reactive statements) which the project's CLAUDE.md explicitly prohibits. The codebase should be fully on Svelte 5 runes.

**Fix**: Migrate to `$props()`, `$state`, `$derived`, callback props, and `onclick`.

---

### 12. `transformAuthor()` duplicated in 5+ files

**Files**: `api/posts/+server.ts`, `api/posts/[id]/+server.ts`, `api/posts/[id]/comments/+server.ts`, `vote/+page.server.ts`, `post/[id]/+page.server.ts`

The same author-formatting function is copy-pasted across multiple files.

**Fix**: Extract to `$lib/server/users.ts` and import everywhere.

---

### 13. N+1 queries on vote page load

**File**: `src/routes/vote/+page.server.ts`

Fetches up to 10 posts, then calls `userMeetsPostQuizGate()` per-post in `Promise.all`. Each call issues 2-3 DB queries, resulting in 20-30 sequential queries per page load.

**Fix**: Batch quiz-gate checks — fetch all relevant `UserProgress` records in a single query, then check in-memory.

---

### 14. Optimistic UI doesn't roll back on failure

**Files**: `CommentForm.svelte`, `Comment.svelte`

Optimistic comments (`temp-${Date.now()}`) are shown immediately but never removed from the UI if the server call fails.

**Fix**: On fetch error, filter out the temporary comment from the local state.

---

### 15. `any` types in components

Multiple components use `user: any`, `reply: any[]`, `(data.questions as any[])`, bypassing TypeScript safety.

**Fix**: Use proper interfaces or Prisma-generated Zod types.

---

### 16. tRPC references in CLAUDE.md are fictional

CLAUDE.md documents tRPC routers, `trpc-shield`, and path aliases (`$api`, `$tf`, `$tb`), but no tRPC code exists. The entire API layer is plain SvelteKit REST handlers.

**Fix**: Remove tRPC references from CLAUDE.md or implement tRPC.

---

### 17. WordPress URL parameter not encoded

**File**: `src/lib/wordpress.ts`

The `search` parameter is interpolated directly into the WordPress API URL without `encodeURIComponent()`.

**Fix**: `&search=${encodeURIComponent(search)}`

---

### 18. In-memory analytics cache won't scale

**File**: `src/lib/server/analyticsCache.ts`

Uses a module-level `Map` with 5-minute TTL. Works for single-instance Railway deployment but will break with horizontal scaling.

**Fix**: Acceptable for now. Switch to Redis if multi-instance deployment is ever needed.

---

## Stats

| Severity | Count |
|----------|-------|
| P0       | 3     |
| P1       | 7     |
| P2       | 8     |
| **Total**| **18**|
