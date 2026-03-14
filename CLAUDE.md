# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build (runs svelte-kit sync + prisma generate + vite build)
npm run check            # TypeScript type checking
npm run lint             # Prettier + ESLint checks
npm run format           # Auto-format with Prettier
npm run test:unit        # Vitest unit tests
npm run test:integration # Playwright E2E tests

# Database
npx prisma migrate dev   # Run pending migrations
npx prisma generate      # Regenerate Prisma client + Zod types
npm run db:seed          # Seed database (tsx prisma/seed.ts)
npm run db:reset         # Reset database and re-seed
npm run generate:prisma  # Generate Prisma schema from DBML (scripts/dbml-to-prisma.ts)
```

## Architecture

Votist is a civic participation platform: users sign in via LinkedIn, watch an orientation video, pass a knowledge quiz, then vote on policy polls. Each step gates the next.

**Full-stack SvelteKit 5** with Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`). No `createEventDispatcher` — use callback props. Server-side data via `+page.server.ts` load functions.

### Path Aliases (svelte.config.js)

| Alias     | Path                                     |
|-----------|------------------------------------------|
| `$com`    | `src/lib/components`                     |
| `$api`    | `src/lib/server/trpc/api`                |
| `$tf`     | `src/lib/trpc`                           |
| `$tb`     | `src/lib/server/trpc`                    |
| `$tIn`    | `prisma/generated/zod/inputTypeSchemas`  |
| `$tOut`   | `prisma/generated/zod/outputTypeSchemas` |
| `$tModel` | `prisma/generated/zod/modelSchema`       |
| `$util`   | `src/util`                               |
| `$z`      | `src/lib/types/zod`                      |

### Authentication (in transition)

**Current state**: Clerk (`svelte-clerk`) — `hooks.server.ts` uses `withClerkHandler()`, `locals.auth()` returns `{ userId }`, and `$lib/server/auth.ts` calls `clerkClient` to sync users into the local DB by `clerkId`.

**Custom auth infrastructure is already built** in `$lib/server/session.ts` (session creation/validation with hashed tokens) and OAuth routes at `/auth/linkedin`, `/auth/google`. The migration from Clerk to custom session-based auth is an active P0 track. Do not assume Clerk will always be present.

### Database

Prisma 6 singleton in `$lib/server/db/prisma.ts`. Schema defined in `prisma/schema.prisma`. Zod types are auto-generated into `prisma/generated/zod/` — do not edit these manually.

**If schema changes are needed**, update via DBML + `npm run generate:prisma`, then `npx prisma migrate dev`.

Key models: `User`, `Session`, `Account`, `Quiz`, `Question`, `UserProgress`, `Post`, `Poll`, `PollOption`, `Vote`, `Comment`, `Assembly`, `ModerationLog`.

Quiz gating: `Quiz.difficulty` is `VOTIST < SCHOLAR < MENTOR`. Posts have `quizGateType` (`NONE | DIFFICULTY | SPECIFIC_QUIZ`) checked by `$lib/server/quizPermissions.ts`. Polls have `requiredDifficulty`.

### API Layer

Two API styles coexist:
- **REST**: `src/routes/api/` — posts, comments, quiz submission, analytics, auth endpoints
- **tRPC**: `trpc-sveltekit` for type-safe internal calls; routers in `src/lib/server/trpc/`; `trpc-shield` for authorization middleware

### Content

Research articles come from a headless WordPress instance via `$lib/wordpress.ts`. Content is fetched server-side with Basic Auth, HTML is sanitized before `@html` rendering, and WordPress CSS is scoped under `.wp-content`. Quizzes, polls, and posts are managed in the Votist admin panel at `/admin`.

### Styling

Tailwind CSS 4 + DaisyUI 5. Component-specific styles in scoped `<style>` blocks. Icons from `lucide-svelte` and custom SVG components in `$com/icons/`.

### Deployment

Railway with `@sveltejs/adapter-node`. PostgreSQL also on Railway. Environment variables set in Railway dashboard (see `.env.example` for the full list including `DATABASE_URL`, `CLERK_*`, `LINKEDIN_*`, `GOOGLE_*`, `WP_*`, `RESEND_API_KEY`).
