--
-- PostgreSQL database dump
--

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ModerationAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ModerationAction" AS ENUM (
    'WARN',
    'BAN',
    'SUSPEND',
    'UNBAN',
    'DELETE_COMMENT'
);


--
-- Name: QuizDifficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuizDifficulty" AS ENUM (
    'VOTIST',
    'SCHOLAR',
    'MENTOR'
);


--
-- Name: QuizGateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuizGateType" AS ENUM (
    'NONE',
    'DIFFICULTY',
    'SPECIFIC_QUIZ'
);


--
-- Name: QuizStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuizStatus" AS ENUM (
    'LOCKED',
    'AVAILABLE',
    'IN_PROGRESS',
    'COMPLETED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Assembly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Assembly" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    topic text NOT NULL,
    location text,
    votes integer DEFAULT 0 NOT NULL
);


--
-- Name: Comment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    "postId" text NOT NULL,
    "parentId" text,
    "rootCommentId" text,
    likes integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CommentLike; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommentLike" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "commentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ModerationLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ModerationLog" (
    id text NOT NULL,
    action public."ModerationAction" NOT NULL,
    "targetId" text NOT NULL,
    "adminId" text NOT NULL,
    reason text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Poll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Poll" (
    id text NOT NULL,
    "postId" text NOT NULL,
    question text NOT NULL,
    "requiredDifficulty" public."QuizDifficulty",
    "totalVotes" integer DEFAULT 0 NOT NULL,
    "endsAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PollOption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PollOption" (
    id text NOT NULL,
    "pollId" text NOT NULL,
    text text NOT NULL,
    votes integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Post; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Post" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "authorId" text NOT NULL,
    category text NOT NULL,
    tags text[],
    likes integer DEFAULT 0 NOT NULL,
    "isBookmarked" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "quizGateDifficulty" public."QuizDifficulty",
    "quizGateQuizId" text,
    "quizGateType" public."QuizGateType" DEFAULT 'NONE'::public."QuizGateType" NOT NULL,
    "showContent" boolean DEFAULT true NOT NULL,
    "showTitle" boolean DEFAULT true NOT NULL,
    "imageUrl" text,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: PostLike; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PostLike" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Question" (
    id text NOT NULL,
    "quizId" text NOT NULL,
    text text NOT NULL,
    type text NOT NULL,
    "imageUrl" text,
    "imageAlt" text,
    "videoUrl" text,
    options jsonb NOT NULL,
    "correctAnswer" jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Quiz; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Quiz" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "passingScore" integer NOT NULL,
    difficulty public."QuizDifficulty" DEFAULT 'VOTIST'::public."QuizDifficulty",
    "associatedMaterialId" text,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Session" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "clerkId" text,
    email text,
    "passwordHash" text,
    "firstName" text,
    "lastName" text,
    "avatarUrl" text,
    role text DEFAULT 'visitor'::text NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "isResident" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "displayName" text,
    "useDisplayName" boolean DEFAULT false NOT NULL,
    "banExpiresAt" timestamp(3) without time zone,
    "banReason" text,
    "banType" text,
    "bannedAt" timestamp(3) without time zone,
    "bannedById" text,
    "isBanned" boolean DEFAULT false NOT NULL
);


--
-- Name: UserProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "materialId" text NOT NULL,
    "quizId" text NOT NULL,
    "quizScore" integer NOT NULL,
    answers jsonb,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Vote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Vote" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "optionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: Account; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Account" (id, "userId", provider, "providerAccountId", "accessToken", "refreshToken", "createdAt") FROM stdin;
\.


--
-- Data for Name: Assembly; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Assembly" (id, title, description, "createdAt", "updatedAt", status, topic, location, votes) FROM stdin;
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Comment" (id, content, "authorId", "postId", "parentId", "rootCommentId", likes, "createdAt", "updatedAt") FROM stdin;
cmlzmy5730005oy01r1pb3sku	This is a very tricky issue. We do need housing in San Rafael, but I'm not sure this building is as beautiful as it could be considering it will be the first thing visitors see when coming into San Rafael.	cmljvuu0c0000qk01f6iefi4x	cmlzhc20i001dpg01zvn68zju	\N	\N	0	2026-02-23 20:34:59.92	2026-02-23 20:34:59.92
\.


--
-- Data for Name: CommentLike; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CommentLike" (id, "userId", "commentId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ModerationLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ModerationLog" (id, action, "targetId", "adminId", reason, metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: Poll; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Poll" (id, "postId", question, "requiredDifficulty", "totalVotes", "endsAt", "createdAt", "updatedAt") FROM stdin;
cmlzh7mun000ypg0191av8bxa	cmlzh7mun000xpg016m3yeuae	Given current housing law, where do you believe civic effort is most likely to influence outcomes?	VOTIST	0	2026-03-23 16:53:00	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzha7590017pg01rbv57enm	cmlzha7590016pg01mykjsvxg	Which statement comes closest to your instinct right now?	VOTIST	0	2026-03-23 16:56:00	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621
cmlzhc20i001epg012hh66vlo	cmlzhc20i001dpg01zvn68zju	How do you feel about the proposed 17-story development at 700 Irwin St.?	\N	2	2026-03-23 16:57:00	2026-02-23 17:57:51.282	2026-02-23 20:18:23.649
\.


--
-- Data for Name: PollOption; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PollOption" (id, "pollId", text, votes, "createdAt", "updatedAt") FROM stdin;
cmlzh7mun000zpg01dxhinbka	cmlzh7mun000ypg0191av8bxa	Shaping local zoning and design standards	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzh7mun0010pg01qbzbmmof	cmlzh7mun000ypg0191av8bxa	Reforming state housing policy	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzh7mun0011pg01968ayf37	cmlzh7mun000ypg0191av8bxa	Supporting individual proposals	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzh7mun0012pg015i7smygu	cmlzh7mun000ypg0191av8bxa	Challenging individual proposals	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzh7mun0013pg019cvdzbe3	cmlzh7mun000ypg0191av8bxa	Developing a shared long-term housing strategy	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzh7mun0014pg01d6sbl9mo	cmlzh7mun000ypg0191av8bxa	Still deciding	0	2026-02-23 17:54:25.007	2026-02-23 17:54:25.007
cmlzha7590018pg01azdcxaik	cmlzha7590017pg01rbv57enm	Resist state mandates and slow growth as much as possible	0	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621
cmlzha7590019pg01nkzbn31u	cmlzha7590017pg01rbv57enm	Build significantly more housing, even if the city changes	0	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621
cmlzha759001apg019roq0o85	cmlzha7590017pg01rbv57enm	Follow state law but shape growth carefully	0	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621
cmlzha759001bpg01pxacfiri	cmlzha7590017pg01rbv57enm	Sill deciding	0	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621
cmlzhc20i001fpg01bq1l0co3	cmlzhc20i001epg012hh66vlo	I support this needed housing.	1	2026-02-23 17:57:51.282	2026-02-23 20:18:30.123
cmlzhc20i001gpg01a2sh3h0z	cmlzhc20i001epg012hh66vlo	This does not fit in San Rafael.	1	2026-02-23 17:57:51.282	2026-02-23 20:18:30.128
\.


--
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Post" (id, title, content, "authorId", category, tags, likes, "isBookmarked", "createdAt", "updatedAt", "quizGateDifficulty", "quizGateQuizId", "quizGateType", "showContent", "showTitle", "imageUrl", "sortOrder") FROM stdin;
cmlzha7590016pg01mykjsvxg	Initial Response	Which statement comes closest to your instinct right now?	cmljvuu0c0000qk01f6iefi4x	Housing	{}	0	f	2026-02-23 17:56:24.621	2026-02-23 17:56:24.621	VOTIST	\N	DIFFICULTY	f	f	\N	0
cmlzh7mun000xpg016m3yeuae	Where Civic Effort Matters Most	Under current California housing law, local discretion is more limited once projects meet state requirements. That raises an important strategic question: where is civic energy most likely to influence outcomes? Within today’s legal framework, does community effort matter most when shaping local zoning and design rules before projects are proposed, organizing for change at the state level, engaging proposal by proposal as they arise, or building broader community alignment around a long-term housing vision?	cmljvuu0c0000qk01f6iefi4x	Housing	{}	1	f	2026-02-23 17:54:25.007	2026-02-23 18:55:07.075	VOTIST	\N	DIFFICULTY	t	t	\N	0
cmlzhc20i001dpg01zvn68zju	How do you feel about the proposed 17-story development at 700 Irwin St.?	How do you feel about the proposed 17-story development at 700 Irwin St.?	cmljvuu0c0000qk01f6iefi4x	Housing	{}	1	f	2026-02-23 17:57:51.282	2026-02-23 18:55:19.468	\N	\N	NONE	f	f	\N	0
\.


--
-- Data for Name: PostLike; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PostLike" (id, "userId", "postId", "createdAt") FROM stdin;
cmlzjdoyw0001pe4g6x4l0x19	cmlitnu1n0000pepg7owqvnk7	cmlzh7mun000xpg016m3yeuae	2026-02-23 18:55:06.919
cmlzjdyj40003pe4gl06oc95o	cmlitnu1n0000pepg7owqvnk7	cmlzhc20i001dpg01zvn68zju	2026-02-23 18:55:19.312
\.


--
-- Data for Name: Question; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Question" (id, "quizId", text, type, "imageUrl", "imageAlt", "videoUrl", options, "correctAnswer", "createdAt", "updatedAt") FROM stdin;
cmliugj750009pepge82zj69l	cmliugj750007pepgmpphvune	What does the Regional Housing Needs Allocation (RHNA) require San Rafael to do?	single-choice			\N	[{"text": "Build a specific number of housing units with city funds", "isCorrect": false, "isNoOpinion": false}, {"text": "Approve every project that is proposed", "isCorrect": false, "isNoOpinion": false}, {"text": "Plan and zone enough land where housing could legally be built", "isCorrect": true, "isNoOpinion": false}, {"text": "Eliminate local zoning rules", "isCorrect": false, "isNoOpinion": false}]	{"text": "Plan and zone enough land where housing could legally be built", "isCorrect": true, "isNoOpinion": false}	2026-02-12 02:33:09.048	2026-02-17 20:20:19.027
cmliugj75000apepgoem0dh07	cmliugj750007pepgmpphvune	Under current state housing law, what happens when a housing proposal meets required affordability and objective standards?	single-choice			\N	[{"text": "The city can freely deny it", "isCorrect": false, "isNoOpinion": false}, {"text": "The state automatically builds it with State funding", "isCorrect": false, "isNoOpinion": false}, {"text": "The project bypasses all public hearings", "isCorrect": false, "isNoOpinion": false}, {"text": "The city is often legally required to approve it", "isCorrect": true, "isNoOpinion": false}]	{"text": "The city is often legally required to approve it", "isCorrect": true, "isNoOpinion": false}	2026-02-12 02:33:09.048	2026-02-17 20:20:19.022
cmliugj750008pepg23fpsh0f	cmliugj750007pepgmpphvune	What most distinguishes San Rafael’s current housing situation from past growth?	single-choice			\N	[{"text": "Population growth is happening for the first time", "isCorrect": false, "isNoOpinion": false}, {"text": "Decision-making authority has shifted partly from the city to the state", "isCorrect": true, "isNoOpinion": false}, {"text": "Downtown development has slowed", "isCorrect": false, "isNoOpinion": false}, {"text": "Housing demand has slowed", "isCorrect": false, "isNoOpinion": false}]	{"text": "Decision-making authority has shifted partly from the city to the state", "isCorrect": true, "isNoOpinion": false}	2026-02-12 02:33:09.048	2026-02-17 20:20:19.03
cmlr1oq8c000tqw01lftfsssp	cmliugj750007pepgmpphvune	Where does San Rafael retain the most influence over housing outcomes today?	single	\N	\N	\N	[{"text": "Blocking projects one by one after they are proposed", "isCorrect": false, "isNoOpinion": false}, {"text": "Setting clear, objective rules and standards in advance", "isCorrect": true, "isNoOpinion": false}, {"text": "Ignoring state mandates", "isCorrect": false, "isNoOpinion": false}, {"text": "Holding advisory-only public votes", "isCorrect": false, "isNoOpinion": false}]	{"text": "Setting clear, objective rules and standards in advance", "isCorrect": true, "isNoOpinion": false}	2026-02-17 20:17:39.277	2026-02-17 20:20:19.033
cmlr1oq8e000vqw01hanh2iub	cmliugj750007pepgmpphvune	If residents want to change California’s housing laws themselves, where must that change occur?	single	\N	\N	\N	[{"text": "At local planning commission meetings", "isCorrect": false, "isNoOpinion": false}, {"text": "Through neighborhood petitions alone", "isCorrect": false, "isNoOpinion": false}, {"text": "At the state legislative level", "isCorrect": true, "isNoOpinion": false}, {"text": "Through individual project appeals", "isCorrect": false, "isNoOpinion": false}]	{"text": "At the state legislative level", "isCorrect": true, "isNoOpinion": false}	2026-02-17 20:17:39.279	2026-02-17 20:20:19.035
\.


--
-- Data for Name: Quiz; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Quiz" (id, title, description, "passingScore", difficulty, "associatedMaterialId", "order", "createdAt", "updatedAt") FROM stdin;
cmliugj750007pepgmpphvune	Constraints and Power	Establish shared context by completing a short 5-question check.	3	VOTIST	\N	1	2026-02-12 02:33:09.048	2026-02-17 20:20:19.011
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Session" (id, "userId", token, "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "clerkId", email, "passwordHash", "firstName", "lastName", "avatarUrl", role, "isAdmin", "isResident", "createdAt", "updatedAt", "displayName", "useDisplayName", "banExpiresAt", "banReason", "banType", "bannedAt", "bannedById", "isBanned") FROM stdin;
cmljvuu0c0000qk01f6iefi4x	user_39aFhRlBYMsp7lQ0BbyuQMvnZEG	contactjoshmehler@gmail.com	\N	Josh	Mehler	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfbGlua2VkaW5fb2lkYy9pbWdfMzlhRmhYMnhRcXVFUEFvOXVMMXhkaWM0WkVnIn0	visitor	f	t	2026-02-12 20:00:03.181	2026-02-22 00:57:35.343	Josh Translucent Mehler	t	\N	\N	\N	\N	\N	f
cmlitnu1n0000pepg7owqvnk7	user_39Y9gwMNgDx4pfGHJOP2eUtfaJR	contact@ahmedzaher.net	\N	Ahmed	Zaher	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfbGlua2VkaW5fb2lkYy9pbWdfMzlZOWdzYndWN0VuM05DOW5MZ2x1QXU5UTA1In0	visitor	f	t	2026-02-12 02:10:51.228	2026-02-22 01:25:46.145	memagedon	t	\N	\N	\N	\N	\N	f
cmlzhfl9n001hpg01vty8q33l	user_3A55Y6f5hGEDvvdFDLxj5geMlHA	margotvanriper@gmail.com	\N	Margot	Van Riper	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfbGlua2VkaW5fb2lkYy9pbWdfM0E1NVk4ODZjQ00wUzZIbDVVOU9PcEZTUG1aIn0	visitor	f	f	2026-02-23 18:00:36.203	2026-02-23 18:00:36.203	\N	f	\N	\N	\N	\N	\N	f
\.


--
-- Data for Name: UserProgress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."UserProgress" (id, "userId", "materialId", "quizId", "quizScore", answers, "isCompleted", "completedAt", "createdAt", "updatedAt") FROM stdin;
cmly2cbh30007l301lp1k9axg	cmlitnu1n0000pepg7owqvnk7		cmliugj750007pepgmpphvune	4	{"cmliugj750008pepg23fpsh0f": "Population growth is happening for the first time", "cmliugj750009pepge82zj69l": "Plan and zone enough land where housing could legally be built", "cmliugj75000apepgoem0dh07": "The city is often legally required to approve it", "cmlr1oq8c000tqw01lftfsssp": "Setting clear, objective rules and standards in advance", "cmlr1oq8e000vqw01hanh2iub": "At the state legislative level"}	t	2026-02-22 18:10:19.842	2026-02-22 18:10:23.128	2026-02-22 18:10:23.128
cmlzmcjwb0001oy01vvqz8f4v	cmljvuu0c0000qk01f6iefi4x		cmliugj750007pepgmpphvune	5	{"cmliugj750008pepg23fpsh0f": "Decision-making authority has shifted partly from the city to the state", "cmliugj750009pepge82zj69l": "Plan and zone enough land where housing could legally be built", "cmliugj75000apepgoem0dh07": "The city is often legally required to approve it", "cmlr1oq8c000tqw01lftfsssp": "Setting clear, objective rules and standards in advance", "cmlr1oq8e000vqw01hanh2iub": "At the state legislative level"}	t	2026-02-23 20:18:11.535	2026-02-23 20:18:12.539	2026-02-23 20:18:12.539
\.


--
-- Data for Name: Vote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Vote" (id, "userId", "postId", "optionId", "createdAt") FROM stdin;
cmlzjt5id0001pe70mzm4kozs	cmlitnu1n0000pepg7owqvnk7	cmlzhc20i001dpg01zvn68zju	cmlzhc20i001fpg01bq1l0co3	2026-02-23 19:07:08.196
cmlzmcsgm0003oy0180uuus2f	cmljvuu0c0000qk01f6iefi4x	cmlzhc20i001dpg01zvn68zju	cmlzhc20i001gpg01a2sh3h0z	2026-02-23 20:18:23.639
\.


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Assembly Assembly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Assembly"
    ADD CONSTRAINT "Assembly_pkey" PRIMARY KEY (id);


--
-- Name: CommentLike CommentLike_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentLike"
    ADD CONSTRAINT "CommentLike_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: ModerationLog ModerationLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ModerationLog"
    ADD CONSTRAINT "ModerationLog_pkey" PRIMARY KEY (id);


--
-- Name: PollOption PollOption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pkey" PRIMARY KEY (id);


--
-- Name: Poll Poll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_pkey" PRIMARY KEY (id);


--
-- Name: PostLike PostLike_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostLike"
    ADD CONSTRAINT "PostLike_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- Name: Quiz Quiz_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Quiz"
    ADD CONSTRAINT "Quiz_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: UserProgress UserProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProgress"
    ADD CONSTRAINT "UserProgress_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vote Vote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vote"
    ADD CONSTRAINT "Vote_pkey" PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Account_userId_idx" ON public."Account" USING btree ("userId");


--
-- Name: CommentLike_commentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentLike_commentId_idx" ON public."CommentLike" USING btree ("commentId");


--
-- Name: CommentLike_userId_commentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CommentLike_userId_commentId_key" ON public."CommentLike" USING btree ("userId", "commentId");


--
-- Name: CommentLike_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommentLike_userId_idx" ON public."CommentLike" USING btree ("userId");


--
-- Name: Comment_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_authorId_idx" ON public."Comment" USING btree ("authorId");


--
-- Name: Comment_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_parentId_idx" ON public."Comment" USING btree ("parentId");


--
-- Name: Comment_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_postId_idx" ON public."Comment" USING btree ("postId");


--
-- Name: Comment_rootCommentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Comment_rootCommentId_idx" ON public."Comment" USING btree ("rootCommentId");


--
-- Name: ModerationLog_adminId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ModerationLog_adminId_idx" ON public."ModerationLog" USING btree ("adminId");


--
-- Name: ModerationLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ModerationLog_createdAt_idx" ON public."ModerationLog" USING btree ("createdAt");


--
-- Name: ModerationLog_targetId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ModerationLog_targetId_idx" ON public."ModerationLog" USING btree ("targetId");


--
-- Name: PollOption_pollId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PollOption_pollId_idx" ON public."PollOption" USING btree ("pollId");


--
-- Name: Poll_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Poll_postId_key" ON public."Poll" USING btree ("postId");


--
-- Name: PostLike_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostLike_postId_idx" ON public."PostLike" USING btree ("postId");


--
-- Name: PostLike_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PostLike_userId_idx" ON public."PostLike" USING btree ("userId");


--
-- Name: PostLike_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PostLike_userId_postId_key" ON public."PostLike" USING btree ("userId", "postId");


--
-- Name: Post_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_authorId_idx" ON public."Post" USING btree ("authorId");


--
-- Name: Post_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_category_idx" ON public."Post" USING btree (category);


--
-- Name: Post_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Post_createdAt_idx" ON public."Post" USING btree ("createdAt");


--
-- Name: Quiz_difficulty_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Quiz_difficulty_order_idx" ON public."Quiz" USING btree (difficulty, "order");


--
-- Name: Session_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_token_idx" ON public."Session" USING btree (token);


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: UserProgress_userId_quizId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserProgress_userId_quizId_key" ON public."UserProgress" USING btree ("userId", "quizId");


--
-- Name: User_clerkId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_clerkId_key" ON public."User" USING btree ("clerkId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Vote_optionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vote_optionId_idx" ON public."Vote" USING btree ("optionId");


--
-- Name: Vote_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vote_postId_idx" ON public."Vote" USING btree ("postId");


--
-- Name: Vote_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Vote_userId_idx" ON public."Vote" USING btree ("userId");


--
-- Name: Vote_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Vote_userId_postId_key" ON public."Vote" USING btree ("userId", "postId");


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommentLike CommentLike_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentLike"
    ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommentLike CommentLike_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommentLike"
    ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comment Comment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Comment Comment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_rootCommentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_rootCommentId_fkey" FOREIGN KEY ("rootCommentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ModerationLog ModerationLog_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ModerationLog"
    ADD CONSTRAINT "ModerationLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ModerationLog ModerationLog_targetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ModerationLog"
    ADD CONSTRAINT "ModerationLog_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PollOption PollOption_pollId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PollOption"
    ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES public."Poll"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Poll Poll_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Poll"
    ADD CONSTRAINT "Poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PostLike PostLike_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostLike"
    ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PostLike PostLike_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PostLike"
    ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Post Post_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Post Post_quizGateQuizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_quizGateQuizId_fkey" FOREIGN KEY ("quizGateQuizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Question Question_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserProgress UserProgress_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProgress"
    ADD CONSTRAINT "UserProgress_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public."Quiz"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserProgress UserProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserProgress"
    ADD CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vote Vote_optionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vote"
    ADD CONSTRAINT "Vote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES public."PollOption"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vote Vote_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vote"
    ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vote Vote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Vote"
    ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

