# Plan: Fix All 18 Code Review Issues

## Context

A deep codebase audit found 18 issues (3 P0, 7 P1, 8 P2). The most critical: quiz scores can be faked by any user (bypassing the platform's core gating), WordPress HTML is rendered unsanitized (XSS), and a debug endpoint leaks DB stats publicly. This plan fixes all 18 issues in dependency order across 3 phases.

---

## Phase 1: Foundational (do first — other fixes depend on these)

### 1A. Fix Prisma singleton (Issue #5)
Replace `new PrismaClient()` with `import { prisma } from '$lib/server/db/prisma'` in:
- `src/routes/api/quizzes/+server.ts`
- `src/routes/api/quizzes/[id]/+server.ts`
- `src/routes/api/comments/+server.ts`

### 1B. Delete test endpoint (Issue #3)
Delete `src/routes/api/test-polls/+server.ts` entirely.

### 1C. Fix `getUser` to return `dbUser` (Issue #4)
**File**: `src/lib/server/auth.ts`

The function already fetches `existingUser` from Prisma but discards it. Change return to include `dbUser`:
- Unauthenticated return: `{ user: null, dbUser: null, isAuthenticated: false }`
- Authenticated return: `{ user: clerkUser, dbUser, isAuthenticated: true }`
- After the sync/create logic, re-fetch `dbUser = await prisma.user.findUnique({ where: { clerkId: userId } })`

Then fix the two callers that use `user.id` where they need `dbUser.id`:
- `src/routes/san-rafael/quiz/[quizId]/results/+page.server.ts` — use `dbUser.id` in `userProgress.findUnique`
- `src/routes/api/quiz/[quizId]/results/+server.ts` — same fix

**Note**: `requireAdmin` in `src/lib/server/admin.ts` calls `getUser` then does its own `findUnique`. After this change, it can use the returned `dbUser` directly (optional optimization).

---

## Phase 2: Security Fixes (P0 + P1)

### 2A. Server-side quiz grading (Issue #1) — P0
**File**: `src/routes/api/userProgress/+server.ts`

Current: PATCH accepts `quizScore`, `isCompleted` from client.
Fix: Accept only `quizId` + `answers` (a `Record<questionId, answerText>`), then grade server-side.

Grading logic (matches existing client-side logic in `san-rafael/quiz/[quizId]/+page.svelte:88-106`):
```
1. Fetch quiz with questions: prisma.quiz.findUnique({ where: { id: quizId }, include: { questions: true } })
2. For each question, find the user's answer text in the answers record
3. Find the matching option by text, skip if option.isNoOpinion
4. Count correct (option.isCorrect === true)
5. passed = correctCount >= quiz.passingScore (passingScore is a count, not percentage)
6. Upsert UserProgress with server-computed values
```

Also update the client caller in `src/routes/san-rafael/quiz/[quizId]/+page.svelte` `completeQuiz()` to send only `{ quizId, answers: userAnswers }` (remove `quizScore`, `isCompleted`, `completedAt` from the body).

### 2B. WordPress XSS sanitization (Issue #2) — P0
**Install**: `npm install sanitize-html && npm install -D @types/sanitize-html`

**File**: `src/lib/wordpress.ts`
- Add `import sanitizeHtml from 'sanitize-html'`
- In `formatPost()`: sanitize `content` (permissive allowlist for article HTML), strip all HTML from `title`/`excerpt`/`tag` (plain text), and restrict `meta` (yoast_head) to safe meta/link tags only (no script)
- Also fix URL encoding: `encodeURIComponent(search ?? '')` and `encodeURIComponent(category ?? '')` in `fetchPosts` (Issue #17)
- Add `res.ok` check before `res.json()` in fetch functions

### 2C. HTML injection in emails (Issue #6)
**File**: `src/lib/server/email.ts`
- Add `escapeHtml()` utility (replaces `& < > " '` with entities)
- Wrap all interpolated values: `params.userName`, `params.message`, `params.reason`, `params.adminName`

**File**: `src/routes/api/admin/users/[id]/email/+server.ts`
- Import and use `escapeHtml` on `emailBody` and `userName`
- Apply escaping before the `\n` → `<br>` replacement

### 2D. Consolidate admin privilege checks (Issues #9, #10)
Replace inline `user.publicMetadata?.role !== 'admin'` with `requireAdmin(event)` from `$lib/server/admin.ts` in these files:

**Admin API routes** (replace inline check pattern → try/catch `requireAdmin`):
1. `src/routes/api/admin/users/search/+server.ts`
2. `src/routes/api/admin/users/[id]/unban/+server.ts`
3. `src/routes/api/admin/users/[id]/warn/+server.ts`
4. `src/routes/api/admin/users/[id]/ban/+server.ts`
5. `src/routes/api/admin/quiz-progress/+server.ts`
6. `src/routes/api/admin/moderation/+server.ts`
7. `src/routes/api/posts/reorder/+server.ts`
8. `src/routes/api/posts/+server.ts` (POST handler)
9. `src/routes/api/quizzes/+server.ts` (POST handler)
10. `src/routes/api/quizzes/search/+server.ts`
11. `src/routes/api/quizzes/[id]/+server.ts` (DELETE + PUT)

**Page server loads** (use SvelteKit `error()`/`redirect()` + `requireAdmin`):
12. `src/routes/admin/posts/[id]/edit/+page.server.ts` — replace `throw new Error()` with `throw error()`/`throw redirect()`
13. `src/routes/admin/+layout.server.ts` — replace inline check

### 2E. Rate limiting (Issues #7, #8)
**New file**: `src/lib/server/rateLimit.ts`
- Simple sliding-window in-memory counter (Map-based, single process)
- `checkRateLimit(key, limit, windowMs)` → `{ allowed, remaining }`
- Periodic cleanup of expired entries

Apply to:
- `src/routes/api/assistant/+server.ts` — 20 requests/hour per userId
- `src/routes/api/check-email/+server.ts` — 10 requests/minute per IP

---

## Phase 3: Tech Debt (P2)

### 3A. Extract `transformAuthor` (Issue #12)
**New file**: `src/lib/server/transformers.ts` — export `transformAuthor()` and `authorSelect`

Remove local copies from 6 files:
- `src/routes/vote/+page.server.ts`
- `src/routes/+page.server.ts`
- `src/routes/post/[id]/+page.server.ts`
- `src/routes/api/posts/+server.ts`
- `src/routes/api/posts/[id]/comments/+server.ts`
- `src/routes/api/posts/[id]/+server.ts`

### 3B. Fix N+1 queries on vote page (Issue #13)
**File**: `src/routes/vote/+page.server.ts`

Pre-fetch all `UserProgress` for the user in the initial parallel query batch, then check quiz gates in-memory instead of calling `userMeetsPostQuizGate()` per-post.

**File**: `src/lib/server/quizPermissions.ts`
- Add `userMeetsPostQuizGateBatched()` that accepts pre-fetched progress array instead of userId

### 3C. Optimistic UI rollback (Issue #14)
**Files**: `src/lib/components/vote/CommentForm.svelte`, `src/lib/components/vote/Comment.svelte`

On fetch error in comment/reply submission, remove the temp comment from local state. Add `onRemoveComment`/`onRemoveReply` callback props and call them in the catch block.

### 3D. Migrate Svelte 4 → Svelte 5 (Issue #11)
Migrate these 5 components to use `$props()`, `$derived`, `$state`, callback props, `onclick`:
1. `src/lib/components/vote/Comment.svelte` — `export let` → `$props()`, `$:` → `$derived`, `on:click` → `onclick`
2. `src/lib/components/vote/CommentForm.svelte` — same pattern
3. `src/lib/components/vote/VotingOption.svelte` — replace `createEventDispatcher` with `onVote` callback prop
4. `src/lib/components/vote/DiscussionComment.svelte` — replace `createEventDispatcher` with callback props
5. `src/lib/components/vote/DiscussionSection.svelte` — migrate to Svelte 5 runes (keep for future use despite being currently unused with mock data)

### 3E. Fix `any` types (Issue #15)
Define proper interfaces for Clerk user props in components and quiz question types in server files. Replace all `any` casts.

### 3F. Analytics cache improvements (Issue #18)
**File**: `src/lib/server/analyticsCache.ts`
- Add `MAX_ENTRIES = 500` cap with FIFO eviction
- Export `invalidate(key)` and `invalidateAll()`

### 3G. Clean up CLAUDE.md (Issue #16)
**File**: `CLAUDE.md`
- Remove tRPC references (no tRPC code exists)
- Remove `$api`, `$tf`, `$tb` from path aliases table
- Update "API Layer" section to describe REST-only architecture

---

## Verification

After all changes:
1. `npm run check` — no TypeScript errors
2. `npm run lint` — passes
3. `npm run build` — builds successfully
4. `npm run test:unit` — all tests pass
5. Manual tests:
   - Complete a quiz → results page shows correct completion status (Issue #4 fix)
   - Attempt to PATCH `/api/userProgress` with fake scores → rejected (Issue #1 fix)
   - View research page → no `<script>` tags from WordPress (Issue #2 fix)
   - Hit `/api/test-polls` → 404 (Issue #3 fix)
   - Spam `/api/assistant` > 20 times → 429 (Issue #8 fix)
   - Non-admin hits admin endpoints → 403 (Issue #9 fix)
6. `grep -r "new PrismaClient()" src/` → 0 results
7. `grep -r "function transformAuthor" src/` → 1 result (shared file only)
