# Admin User Management & Analytics Dashboard - Implementation Plan

## Phase 1: API Foundation — User Directory & Detail
> Build the core API endpoints for browsing, searching, and inspecting users.

- [ ] 1.1 Create shared `requireAdmin(event)` helper in `$lib/server/admin.ts` — extracts the repeated admin auth check pattern into a reusable function; returns `{ user, dbUser }` or throws 403
- [ ] 1.2 Create `GET /api/admin/users` endpoint — paginated user list (25/page) with `_count` for votes, comments, quizzes completed; supports `?q=` search (name/email), `?role=`, `?resident=`, `?banned=`, `?sort=`, `?page=` params
- [ ] 1.3 Create `GET /api/admin/users/[id]` endpoint — full user detail with activity counts (`votes`, `comments`, `postLikes`, `commentLikes`, `userProgress`), quiz performance summary, moderation history, all loaded in parallel with `Promise.all()`
- [ ] 1.4 Create `GET /api/admin/users/[id]/activity` endpoint — paginated activity timeline combining votes, comments, quiz completions, likes into a single chronological feed (most recent first, 20/page)
- [ ] 1.5 Create `GET /api/admin/users/[id]/votes` endpoint — user's voting history with poll question, chosen option, and post title (paginated)
- [ ] 1.6 Create `GET /api/admin/users/[id]/comments` endpoint — user's comments with parent post title and creation date (paginated)
- [ ] 1.7 Create `GET /api/admin/users/[id]/quizzes` endpoint — user's quiz attempts with quiz title, difficulty, score, pass/fail status, completion date

## Phase 2: User Directory Page
> Build the admin UI for browsing and searching users.

- [ ] 2.1 Add "Users" and "Dashboard" tabs to admin nav bar in `/admin/+layout.svelte`
- [ ] 2.2 Create `/admin/users/+page.svelte` — user directory page with DaisyUI table: avatar, name, email, role badge, resident badge, join date, activity summary (votes/comments/quizzes), status badge (active/banned)
- [ ] 2.3 Add search input with debounced server-side search (300ms debounce, fetches from `GET /api/admin/users?q=`)
- [ ] 2.4 Add filter dropdowns: role (all/admin/visitor), resident status (all/resident/non-resident), ban status (all/active/banned/suspended), quiz tier (all/none/VOTIST/SCHOLAR/MENTOR)
- [ ] 2.5 Add sort controls: name, join date, total votes, total comments, quiz completions (asc/desc toggle)
- [ ] 2.6 Add pagination controls (prev/next, page indicator, total count)
- [ ] 2.7 Add row click to navigate to `/admin/users/[id]` for user detail

## Phase 3: User Detail Page
> Build the admin view for inspecting individual user activity and taking actions.

- [ ] 3.1 Create `/admin/users/[id]/+page.svelte` — user detail page with profile header: avatar, full name, display name, email, role/resident/ban badges, join date
- [ ] 3.2 Add activity summary stat cards: total votes, comments, quizzes passed, post likes, comment likes — displayed as DaisyUI `stat` components
- [ ] 3.3 Add tabbed content area with tabs: Activity Timeline, Voting History, Comments, Quiz Performance, Moderation History
- [ ] 3.4 Build Activity Timeline tab — chronological feed of all user actions fetched from `/api/admin/users/[id]/activity`, with infinite scroll or load-more pagination
- [ ] 3.5 Build Voting History tab — table of polls voted on, chosen option, date, link to post
- [ ] 3.6 Build Comments tab — list of comments with post title, content preview, date, link to post
- [ ] 3.7 Build Quiz Performance tab — table of quiz attempts with quiz title, difficulty tier badge, score, pass/fail badge, completion date
- [ ] 3.8 Build Moderation History tab — list of moderation actions (warnings, bans, suspensions) from `ModerationLog` with action type badge, admin name, reason, date

## Phase 4: User Management Actions
> Add admin capabilities to manage user roles, status, and contact users.

- [ ] 4.1 Create `PUT /api/admin/users/[id]/role` endpoint — toggle `User.isAdmin` and sync with Clerk `publicMetadata.role` via Clerk API; requires confirmation
- [ ] 4.2 Create `PUT /api/admin/users/[id]/resident` endpoint — toggle `User.isResident`
- [ ] 4.3 Add quick action buttons to user detail page header: "Change Role", "Set Resident Status", "Warn", "Ban/Suspend", "Unban" (conditional on current status)
- [ ] 4.4 Build role management modal — confirm admin promotion/demotion with clear warning about permissions granted
- [ ] 4.5 Build resident status toggle — simple confirmation modal for toggling `isResident`
- [ ] 4.6 Wire existing moderation endpoints (ban, warn, unban) into user detail page with the same modals used in `/admin/moderation`

## Phase 5: Contact Users via Email
> Add admin ability to email individual users using existing Resend infrastructure.

- [ ] 5.1 Create `POST /api/admin/users/[id]/email` endpoint — send email via Resend using `$lib/server/email.ts`; accepts subject, body, optional template name; logs to `ModerationLog` with action type or new email log
- [ ] 5.2 Build "Contact User" modal on user detail page — form with subject, message body (textarea), and optional template selector
- [ ] 5.3 Create email templates: "Welcome / Getting Started", "Quiz Reminder", "Engagement Follow-up", "Custom" (free-form)
- [ ] 5.4 Add email history section to user detail page — show previous admin-sent emails (from log) with subject, date, admin who sent

## Phase 6: Platform Overview Dashboard
> Build the admin dashboard with platform-wide stats and engagement trends.

- [ ] 6.1 Create `GET /api/admin/dashboard/overview` endpoint — total users, active users (7d/30d), total votes, total comments, total quiz completions, total banned users, resident count, new users this week/month
- [ ] 6.2 Create `GET /api/admin/dashboard/growth` endpoint — user registration time series (daily last 30d, weekly last 90d); vote and comment time series
- [ ] 6.3 Create `GET /api/admin/dashboard/insights` endpoint — top 10 contributors (by votes+comments+quizzes), engagement cohorts (active/occasional/dormant), engagement by resident status, drop-off funnel (registered → quizzed → voted)
- [ ] 6.4 Install Chart.js and `svelte-chartjs` (or equivalent lightweight charting library)
- [ ] 6.5 Create `/admin/dashboard/+page.svelte` — overview page with stat cards: total users, active users (7d), total votes, total comments, quizzes completed, banned users
- [ ] 6.6 Add user growth line chart (new registrations per day/week)
- [ ] 6.7 Add engagement trends line chart (daily votes + comments over time)
- [ ] 6.8 Add resident vs non-resident donut chart
- [ ] 6.9 Add quiz tier distribution bar chart (users at each difficulty level)
- [ ] 6.10 Add top contributors leaderboard (top 10 most active users with links to user detail)
- [ ] 6.11 Add recent platform activity feed (last 20 actions: signups, votes, comments, quiz completions, moderation)
- [ ] 6.12 Add engagement drop-off funnel visualization: Registered → Quiz Attempted → Quiz Passed → Voted
- [ ] 6.13 Add cache layer (in-memory Map with 5-min TTL) to dashboard overview and growth endpoints

## Phase 7: Export, Polish & Enhancements
> Add data export, optional schema additions, and final refinements.

- [ ] 7.1 Create `GET /api/admin/users/export` endpoint — generate CSV of filtered user directory (name, email, role, resident, join date, votes, comments, quizzes, status)
- [ ] 7.2 Add "Export CSV" button to user directory page (triggers download)
- [ ] 7.3 Add optional schema migration: `User.lastActiveAt` (DateTime?) and `User.adminNotes` (String?) fields
- [ ] 7.4 Update vote, comment, and quiz completion handlers to set `User.lastActiveAt` on activity
- [ ] 7.5 Add "Admin Notes" textarea to user detail page — private notes visible only to admins, saved to `User.adminNotes`
- [ ] 7.6 Add "Last Active" column to user directory and sort option
- [ ] 7.7 Update admin landing page (`/admin/+page.svelte`) to redirect to or embed the dashboard overview
