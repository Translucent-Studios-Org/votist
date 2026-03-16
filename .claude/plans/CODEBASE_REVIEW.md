# Codebase Review

**Date:** 2026-03-11

**Reviewer:** Mike Fortney / Claude Code

**Branch:** main

**Estimated Phase 3 Hours:** 38–48

---

# 1. Architecture Summary

## Stack

| Layer      | Technology                                           |
|------------|------------------------------------------------------|
| Framework  | SvelteKit 2 + Svelte 5 (runes mode)                  |
| Language   | TypeScript 5 (strict mode)                           |
| Database   | PostgreSQL via Prisma 6                              |
| Auth       | Clerk (migration to custom session auth in progress) |
| Hosting    | Railway (Node adapter)                               |
| Email      | Resend                                               |
| AI chatbot | OpenRouter (OpenAI-compatible API)                   |
| CMS        | Headless WordPress (research content)                |
| Video      | Vimeo player                                         |
| Styling    | Tailwind CSS 4 + DaisyUI 5                           |

## Route Structure

| Route                                 | Purpose                                             |
|---------------------------------------|-----------------------------------------------------|
| `/`                                   | Homepage / post feed                                |
| `/vote`                               | Main voting feed (quiz-gated posts + polls)         |
| `/post/:id`                           | Individual post + comments                          |
| `/san-rafael/quiz/:quizId`            | Quiz flow (orientation → VOTIST → SCHOLAR → MENTOR) |
| `/research`                           | WordPress article index                             |
| `/research/:slug`                     | Individual research article                         |
| `/admin`                              | Admin panel (posts, users, quizzes, moderation)     |
| `/auth/linkedin`, `/auth/google`      | Custom OAuth routes (built, not yet active)         |
| `/dashboard`, `/profile`, `/settings` | User account pages                                  |

## Core User Flow

LinkedIn OAuth → Orientation video → VOTIST quiz → Vote on policy polls

Each step gates the next. `Quiz.difficulty` (`VOTIST < SCHOLAR < MENTOR`) controls access. Posts have a `quizGateType` (`NONE | DIFFICULTY | SPECIFIC_QUIZ`) enforced by `src/lib/server/quizPermissions.ts`.

## Data Model (key models)

`User` → `UserProgress` ← `Quiz` → `Question`

`Post` → `Poll` → `PollOption` → `Vote`

`Post` → `Comment`

`User` → `Session` + `Account` (custom auth, partially built)

`User` → `ModerationLog` (ban/warn/moderation trail)

## API Layer

All live API logic is **plain SvelteKit REST handlers** at `src/routes/api/`. tRPC (`@trpc/server`, `trpc-sveltekit`, `trpc-shield`) is installed as a dependency and referenced in [CLAUDE.md](http://CLAUDE.md) but **no tRPC routers exist** — the documented tRPC layer is fictional.

## Auth State

Clerk is the active auth layer (`svelte-clerk`, `hooks.server.ts` uses `withClerkHandler()`). A parallel custom session-based auth system (`src/lib/server/session.ts`, OAuth routes at `/auth/*`) is already built but not yet activated. The migration is described as an active P0 track in [CLAUDE.md](http://CLAUDE.md).

## Third-Party Dependencies

- **Clerk** — auth, user management, OAuth (LinkedIn, Google)
- **Railway** — hosting + managed PostgreSQL
- **Resend** — transactional email
- **OpenRouter** — AI chatbot inference
- **WordPress** — headless CMS (research section)
- **Vimeo** — orientation video

---

# 2. Code Quality Findings

## TypeScript

`npm run check` reports **30 errors and 38 warnings across 20 files**.

Key error categories:

| Category                 | Count | Notes                                                                                                          |                                           |
|--------------------------|-------|----------------------------------------------------------------------------------------------------------------|-------------------------------------------|
| Drizzle ORM dead imports | 3     | `drizzle-orm/libsql`, `drizzle-orm/pg-core`, `@libsql/client` — packages not installed, code is dead/abandoned |                                           |
| Prisma type mismatches   | 4     | Missing `include` clauses, wrong select shapes, `string \                                                      | undefined `passed where` string` required |
| Analytics `never` type   | 8     | All analytics chart properties resolve to `never` — analytics dashboard is effectively broken                  |                                           |
| Implicit `any`           | 5     | Parameters without types in components and chart files                                                         |                                           |
| Svelte component issues  | 6     | Missing required props, deprecated `<svelte:component>`, Svelte 4 `on:click` in runes files                    |                                           |
| Accessibility warnings   | 38    | Missing labels, missing keyboard handlers, dialog role issues                                                  |                                           |

## Testing

- **Unit tests**: Vitest is configured (`vitest.config.ts` present) but **no test files exist** (`*.test.ts` / `*.spec.ts` not found).
- **Integration tests**: Playwright is configured but test suite is minimal.
- **Coverage**: Effectively 0%.

## Error Handling

- Most API routes return appropriate JSON error responses.
- One server load (`admin/posts/[id]/edit`) throws `new Error()` instead of SvelteKit's `error()` helper, producing a 500 instead of a 401/redirect.
- No global unhandled rejection handler in entry points.

## Security Summary

3 critical security issues (see Bug List). No CORS configuration found (relies on SvelteKit defaults). No CSP headers configured.

## Code Consistency

- Mostly consistent Svelte 5 runes usage, with 5 components still on Svelte 4 patterns.
- Prisma singleton pattern is used in most files, with 3 exceptions that create raw `new PrismaClient()` instances.
- Author-formatting utility (`transformAuthor`) is copy-pasted across 5+ files.

---

# 3. Bug Inventory

## P0 — Critical

| # | Bug                                                                                                                      | File                                                   | Impact                                      |
|---|--------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|---------------------------------------------|
| 1 | **Quiz gate bypass** — any authenticated user can POST `{ isCompleted: true, quizScore: 100 }` to skip the quiz entirely | `src/routes/api/userProgress/+server.ts`               | Platform's core feature is defeatable       |
| 2 | **WordPress XSS** — all WordPress HTML rendered via `{@html}` with zero sanitization                                     | `src/routes/research/*.svelte`, `src/lib/wordpress.ts` | Arbitrary JS execution if WP is compromised |
| 3 | **Public debug endpoint** — `/api/test-polls` is unauthenticated and exposes DB row counts + full API route map          | `src/routes/api/test-polls/+server.ts`                 | Information disclosure                      |

## P1 — Should Fix Soon

| #  | Bug                                                                                                                      | File                                               | Impact                                                 |
|----|--------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------|--------------------------------------------------------|
| 4  | **Quiz results always empty** — results pages query `UserProgress` with Clerk ID instead of DB user CUID                 | `san-rafael/quiz/[quizId]/results/+page.server.ts` | Quiz results broken for all users                      |
| 5  | **Prisma connection exhaustion** — 3 files create `new PrismaClient()` instead of using the singleton                    | `api/quizzes/+server.ts` et al.                    | Connection pool warnings in dev, potential prod issues |
| 6  | **Email HTML injection** — admin-supplied email body and user messages interpolated raw into HTML templates              | `src/lib/server/email.ts`                          | Admin account compromise → XSS in emails               |
| 7  | **User enumeration** — `/api/check-email` is unauthenticated                                                             | `src/routes/api/check-email/+server.ts`            | Can enumerate registered emails                        |
| 8  | **No rate limiting** — AI assistant, vote, comment, and auth endpoints have no throttle                                  | Entire API layer                                   | Cost exposure on AI endpoint; abuse vectors            |
| 9  | **Inconsistent admin checks** — some routes use `requireAdmin()`, others do inline Clerk metadata checks that can desync | Multiple admin routes                              | Privilege escalation risk if Clerk/DB get out of sync  |
| 10 | **Wrong error type in admin page load** — `throw new Error('Unauthorized')` produces 500 instead of 401/redirect         | `admin/posts/[id]/edit/+page.server.ts`            | Poor UX; non-standard error behavior                   |

## P2 — Technical Debt

| #  | Issue                                                              | Impact                                           |
|----|--------------------------------------------------------------------|--------------------------------------------------|
| 11 | Mixed Svelte 4/5 patterns in 5 components                          | Inconsistency; will cause subtle reactivity bugs |
| 12 | `transformAuthor()` duplicated in 5+ files                         | Maintenance burden                               |
| 13 | N+1 queries on vote page (20–30 DB queries per load)               | Performance                                      |
| 14 | Optimistic UI comments not removed on error                        | UX: phantom comments appear on failure           |
| 15 | `any` types in multiple components                                 | TypeScript safety gap                            |
| 16 | tRPC documented in [CLAUDE.md](http://CLAUDE.md) but doesn't exist | Confusing for future developers                  |
| 17 | WordPress URL search param not URL-encoded                         | Potential query corruption                       |
| 18 | In-memory analytics cache (won't scale horizontally)               | Fine for now; flag for future                    |
| —  | Drizzle ORM dead code (not installed, still imported)              | Causes 3 TS errors; misleading                   |
| —  | Analytics dashboard broken (all props typed `never`)               | Admin analytics page non-functional              |
| —  | 0% test coverage                                                   | No regression safety net                         |

---

# 4. Phase 3 Hour Estimates

## Sprint 1 — P0 Critical (~11 hours)

| Task                                                              | Hours    |
|-------------------------------------------------------------------|----------|
| Delete `/api/test-polls` endpoint                                 | 0.5      |
| Fix Prisma singleton (3 files)                                    | 1        |
| Fix Clerk ID → DB user ID in quiz results                         | 2        |
| Server-side quiz grading (remove client-trusted score/completion) | 4        |
| WordPress XSS sanitization (`sanitize-html`)                      | 3        |
| **Sprint 1 Total**                                                | **10.5** |

## Sprint 2 — P1 Security & Auth (~15 hours)

| Task                                                 | Hours    |
|------------------------------------------------------|----------|
| Email HTML injection fix                             | 1.5      |
| Consolidate admin privilege checks (13 routes)       | 3        |
| Rate limiting middleware + apply to AI + check-email | 3        |
| Fix 30 TypeScript errors                             | 5        |
| Fix analytics dashboard (`never` type issue)         | 2        |
| **Sprint 2 Total**                                   | **14.5** |

## Sprint 3 — P2 Tech Debt (~12 hours)

| Task                                                            | Hours    |
|-----------------------------------------------------------------|----------|
| Extract `transformAuthor` to shared file                        | 1.5      |
| Fix N+1 queries on vote page                                    | 2.5      |
| Optimistic UI rollback on comment failure                       | 1.5      |
| Migrate 5 components Svelte 4 → Svelte 5                        | 4        |
| Fix `any` types in components                                   | 2        |
| Remove Drizzle dead code                                        | 0.5      |
| Clean up [CLAUDE.md](http://CLAUDE.md) (remove tRPC references) | 0.5      |
| **Sprint 3 Total**                                              | **12.5** |

## Verification (~5 hours)

| Task                                          | Hours |
|-----------------------------------------------|-------|
| `npm run check` clean (0 errors)              | 1     |
| `npm run build` succeeds                      | 0.5   |
| Manual smoke test of all critical flows       | 2     |
| Write basic unit tests for quiz grading logic | 1.5   |
| **Verification Total**                        | **5** |

## Total Refined Estimate

**38–48 hours** (most likely ~42 hours)

Recommended schedule: 3 focused work sprints over 2–3 weeks.

---

# 5. Recommendation

Proceed with Phase 3. The codebase is functional and well-structured overall — it's a real SvelteKit 5 app with a clear data model and a coherent user flow. The issues are fixable and well-understood.

**Prioritization guidance:**

1. **Start with Sprint 1** (P0s) — the quiz gate bypass and XSS issues are genuine security risks that should not be in production.
2. **Sprint 2** can run alongside other feature work since it's mostly isolated file-level fixes.
3. **Sprint 3** is optional in the near term but the Svelte 4/5 migration should happen before adding new components to the vote section.

**Watch-outs for Phase 3:**

- The custom auth migration (Clerk → sessions) is partially built but not activated. Clarify with Josh whether this is in Phase 3 scope before starting — it's a significant effort.
- The analytics dashboard is broken (typed as `never`). The fix depends on understanding the expected data shape from the server load function.