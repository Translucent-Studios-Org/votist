# Admin User Management & Analytics Dashboard - Specification

## Overview

Votist currently has admin pages for quiz management, post management, and moderation (ban/warn/unban) — but no way to browse the full user base, inspect individual user activity, manage roles, or contact users directly. This track builds a comprehensive admin user management dashboard alongside platform-wide engagement analytics, giving admins full visibility into who their users are and how they engage.

## Relationship to Existing Tracks

- **`platform_analytics_20260209`** focuses on aggregate analytics (poll response patterns, quiz funnels, civic signal quality). This track focuses on **per-user management and individual-level insights** plus a general platform overview dashboard.
- **`admin/moderation`** handles banning/warning. This track adds a broader user directory that links out to moderation actions where appropriate.
- The two tracks are complementary: platform analytics answers "how is the platform performing?" while this track answers "who are our users and what are they doing?"

## Available Data (No Schema Changes Required Initially)

### Per-User Activity (derivable from existing tables)
| Metric | Source |
|--------|--------|
| Votes cast | `Vote` count where `userId = X` |
| Posts authored | `Post` count where `authorId = X` |
| Comments made | `Comment` count where `authorId = X` |
| Post likes given | `PostLike` count where `userId = X` |
| Comment likes given | `CommentLike` count where `userId = X` |
| Quizzes attempted | `UserProgress` count where `userId = X` |
| Quizzes passed | `UserProgress` count where `userId = X AND isCompleted = true` |
| Highest quiz tier | Max `Quiz.difficulty` from completed `UserProgress` |
| Quiz scores | `UserProgress.quizScore` per quiz |
| Moderation history | `ModerationLog` where `targetId = X` |
| Account age | `User.createdAt` |
| Residency status | `User.isResident` |
| Admin status | `User.isAdmin` |
| Ban status | `User.isBanned`, `User.banType`, `User.banExpiresAt` |

### Platform-Wide Metrics (derivable from existing tables)
| Metric | Source |
|--------|--------|
| Total users | `User` count |
| Users by role | `User` group by `role` |
| Residents vs non-residents | `User` group by `isResident` |
| Total votes | `Vote` count |
| Total comments | `Comment` count |
| Total quiz completions | `UserProgress` count where `isCompleted = true` |
| Active users (7d/30d) | Users with `Vote`, `Comment`, or `UserProgress` in window |
| User growth over time | `User.createdAt` grouped by day/week/month |
| Engagement trends | `Vote.createdAt`, `Comment.createdAt` grouped over time |
| Moderation actions | `ModerationLog` count by type |
| Banned user count | `User` count where `isBanned = true` |

### Optional Schema Additions (Phase 7)
| Field | Model | Purpose |
|-------|-------|---------|
| `lastActiveAt DateTime?` | User | Track last platform activity |
| `adminNotes String?` | User | Private admin notes per user |

## Functional Requirements

### FR1: User Directory (Browse & Search)
A paginated, searchable, sortable list of all platform users:
- **Table columns**: Avatar, Name, Email, Role, Resident status, Join date, Activity summary (votes/comments/quizzes), Status (active/banned/suspended)
- **Search**: By name, email, or display name
- **Filters**: Role (admin/visitor), resident status, ban status, quiz tier achieved, registration date range
- **Sort**: By name, join date, total votes, total comments, quiz score
- **Pagination**: Server-side, 25 users per page
- **Bulk selection**: Select multiple users for bulk actions (future)

### FR2: User Detail / Profile View
Admin drill-down into any individual user:
- **Profile header**: Avatar, full name, display name, email, role badges, resident badge, join date, last active
- **Activity summary cards**: Total votes, comments, quizzes completed, post likes, comment likes
- **Activity timeline**: Chronological feed of user actions (voted on X, commented on Y, completed quiz Z) — most recent first, paginated
- **Quiz performance**: List of all attempted quizzes with scores, pass/fail status, completion dates
- **Voting history**: Which polls they voted on, which option they chose, when
- **Comment history**: All comments with links to parent posts
- **Moderation history**: All warnings, bans, suspensions from `ModerationLog`
- **Quick actions**: Warn, ban/suspend, unban, change role, contact via email

### FR3: User Role & Status Management
Admin actions on individual users:
- **Change role**: Toggle admin privileges (update both `User.isAdmin` and Clerk `publicMetadata.role`)
- **Set resident status**: Toggle `User.isResident`
- **Ban/suspend/warn**: Link to existing moderation endpoints (`/api/admin/users/[id]/ban`, `/warn`, `/unban`)
- **Reset quiz progress**: Reset specific or all quiz progress for a user (existing endpoint: `/api/admin/quiz-progress`)
- **Confirmation modals**: All destructive actions require confirmation

### FR4: Contact Users
Admin ability to communicate with users:
- **Email individual user**: Compose and send email to a user via Resend (existing email infrastructure in `$lib/server/email.ts`)
- **Email templates**: Pre-built templates for common communications (welcome, reminder to complete quiz, follow-up, custom)
- **Email log**: Track which emails were sent to which users and when (new `AdminEmail` log or extend `ModerationLog`)
- **Bulk email**: Select multiple users from directory and send same email (future consideration)

### FR5: Platform Overview Dashboard
A high-level admin dashboard showing platform health at a glance:
- **Stat cards**: Total users, active users (7d), total votes, total comments, total quiz completions, total banned users
- **User growth chart**: Line chart of new registrations over time (daily for last 30 days, weekly for last 90 days)
- **Engagement trend chart**: Line chart of daily votes + comments over time
- **Resident breakdown**: Pie/donut chart of residents vs non-residents
- **Quiz tier distribution**: Bar chart of users at each difficulty level (VOTIST/SCHOLAR/MENTOR/none)
- **Recent activity feed**: Last 20 platform-wide actions (new user, vote, comment, quiz completion, moderation action)
- **Quick links**: Jump to user directory, moderation, quiz management, post management

### FR6: User Engagement Insights
Deeper analytics about user behavior patterns:
- **Engagement cohorts**: Group users by engagement level (highly active, occasional, dormant, never engaged)
- **Top contributors**: Leaderboard of most active users by votes, comments, quiz completions
- **User retention**: What % of users who signed up in week X are still active in weeks X+1, X+2, etc.
- **Drop-off analysis**: How many users signed up but never took a quiz? Took a quiz but never voted?
- **Engagement by resident status**: Do residents engage more than non-residents?

### FR7: Export & Reporting
- **Export user list**: CSV download of filtered user directory
- **Export activity data**: CSV of user activity metrics
- **Exportable chart data**: Download chart data as CSV

## Technical Requirements

### New API Endpoints

```
GET  /api/admin/users                    → Paginated user list with activity counts, search, filter, sort
GET  /api/admin/users/[id]               → Full user detail with all activity data
PUT  /api/admin/users/[id]/role          → Update user role (admin toggle)
PUT  /api/admin/users/[id]/resident      → Update resident status
POST /api/admin/users/[id]/email         → Send email to user via Resend
GET  /api/admin/users/[id]/activity      → Paginated activity timeline
GET  /api/admin/users/[id]/votes         → User's voting history
GET  /api/admin/users/[id]/comments      → User's comment history
GET  /api/admin/users/[id]/quizzes       → User's quiz performance
GET  /api/admin/users/export             → CSV export of user directory
GET  /api/admin/dashboard/overview       → Platform overview stats
GET  /api/admin/dashboard/growth         → User growth time series
GET  /api/admin/dashboard/engagement     → Engagement trends time series
GET  /api/admin/dashboard/insights       → Cohort analysis, retention, top contributors
```

### Existing Endpoints to Reuse
```
GET  /api/admin/users/search             → Already exists — enhance with pagination and filters
POST /api/admin/users/[id]/ban           → Already exists
POST /api/admin/users/[id]/warn          → Already exists
POST /api/admin/users/[id]/unban         → Already exists
DELETE /api/admin/quiz-progress          → Already exists
GET  /api/admin/moderation               → Already exists — reuse for moderation history
```

### New Admin Pages
```
/admin/users                → User directory with search, filter, sort
/admin/users/[id]           → User detail view with activity tabs
/admin/dashboard            → Platform overview dashboard
```

### UI Approach
- Follow existing admin panel patterns: DaisyUI components, client-side data fetching in `onMount()`
- Add "Users" and "Dashboard" tabs to admin nav bar in `/admin/+layout.svelte`
- Use DaisyUI `stat`, `table`, `card`, `badge`, `modal`, `tabs` components
- Charts: Use Chart.js (same as recommended in `platform_analytics_20260209` track — share the dependency)
- Responsive: Desktop-first, functional on tablet

### Auth Pattern
All new endpoints follow the existing admin auth pattern:
```typescript
const { user } = await getUser(event);
if (!user || user.publicMetadata?.role !== 'admin') {
    return json({ error: 'Forbidden' }, { status: 403 });
}
```

### Performance Considerations
- Server-side pagination for user list and activity timelines (25-50 items per page)
- Use Prisma `_count` for activity summary instead of fetching full records
- Use `Promise.all()` for parallel queries (e.g., load user + activity counts simultaneously)
- Cache expensive aggregate queries (platform overview stats) with 5-min TTL
- Add database indexes if query performance is slow on the aggregation queries

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| User directory load | < 1s for paginated list |
| User detail load | < 2s with all activity tabs |
| Dashboard overview load | < 2s (cached) |
| Search responsiveness | < 500ms with debounce |
| Export generation | < 10s for full user list |
| Admin only | All endpoints require admin auth |
| Mobile | Functional (responsive tables), desktop-optimized |
