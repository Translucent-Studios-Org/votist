Review the current changes against the main branch. Run `git diff main...HEAD` (or `git diff` for unstaged changes) to see what changed, then evaluate against each category below. Only flag real, concrete problems — not hypotheticals.

## Security

- **Auth bypass**: Every mutation endpoint (vote, comment, like, quiz, admin actions) must verify auth via `getUser(event)` or `requireAdmin(event)`. Check that new endpoints don't skip auth.
- **Quiz gate integrity**: Quiz scores and completion MUST be validated server-side. Any endpoint accepting client-supplied `isCompleted` or `quizScore` without server-side verification is a critical bug — the entire knowledge-gating system depends on this.
- **XSS via `{@html ...}`**: Any new `{@html}` usage must sanitize input first (especially WordPress content, user-generated content, or admin-supplied email bodies). Check for unsanitized HTML interpolation in email templates too.
- **User enumeration**: Unauthenticated endpoints that reveal whether a user/email exists (like `/api/check-email`).
- **Input validation**: POST/PATCH bodies should validate types, lengths, and allowed values server-side — not just rely on Prisma constraints. Watch for URL fields (`avatarUrl`, `imageUrl`) that accept arbitrary URLs without domain validation.
- **Admin privilege checks**: Admin routes must use `requireAdmin(event)` consistently — not inline `publicMetadata?.role` checks that could diverge from the DB.

## Database & Performance

- **Prisma singleton**: New files must import from `$lib/server/db/prisma.ts` — never `new PrismaClient()`. Multiple instances cause connection pool exhaustion in dev.
- **N+1 queries**: Watch for loops that call Prisma inside `Promise.all` or `for` loops (e.g., `userMeetsPostQuizGate()` called per-post). Suggest batching or `findMany` with `where: { id: { in: [...] } }`.
- **Denormalized counter sync**: `Poll.totalVotes`, `PollOption.votes`, and `Post.likes` are denormalized. Any code modifying votes/likes must update counters atomically inside a `prisma.$transaction`.
- **Missing `select`/`include` optimization**: Large queries returning full models when only a few fields are needed.

## Auth Consistency

- **Clerk vs DB user ID confusion**: `locals.auth().userId` returns the Clerk ID (string like `user_xxx`). The internal DB `User.id` is a CUID. These are NOT interchangeable. Any query against `UserProgress`, `Vote`, `Comment`, etc. must use the DB user ID, not the Clerk ID. This is a known bug in quiz results endpoints.
- **Auth pattern**: Prefer `getUser(event)` from `$lib/server/auth.ts` over raw `locals.auth()` — it returns both the Clerk identity and the DB user record.

## Svelte 5 & Frontend

- **Svelte 5 runes only**: No `export let` props — use `let { prop } = $props()`. No `createEventDispatcher` — use callback props. No `$:` reactive statements — use `$derived` or `$state`. No `on:click` — use `onclick`.
- **Optimistic UI**: If adding optimistic updates, ensure failed server calls roll back the optimistic state (existing code has bugs where failed optimistic comments aren't removed).
- **Type safety**: No `any` types. Use proper interfaces or Prisma-generated types. Check for `as any` casts that hide real type errors.

## Error Handling

- **SvelteKit error helpers**: Server-side errors should use `throw error(status, message)` or `throw redirect(status, url)` from `@sveltejs/kit` — not `throw new Error()` (which renders as a generic 500).
- **API responses**: REST endpoints should return proper HTTP status codes and JSON error bodies, not just crash.
- **WordPress fetch resilience**: WordPress fetches should have timeouts, check `res.ok`, and handle non-JSON responses gracefully.

## Code Quality

- **Duplicate code**: `transformAuthor()` is already duplicated in 5+ files. If new code needs it, import from a shared location rather than copying again.
- **tRPC references**: tRPC doesn't exist in this codebase yet (despite CLAUDE.md mentioning it). Don't add tRPC-related code unless that's the explicit goal.
- **Rate limiting**: Flag any new expensive endpoint (especially ones calling external APIs like OpenRouter) that lacks rate limiting.

## Output Format

For each issue found, report:
1. **Severity** (P0 critical / P1 should fix / P2 nice to have)
2. **File and line**
3. **What's wrong** (one sentence)
4. **Suggested fix** (one sentence)

If the diff is clean, say so. Don't invent problems.
