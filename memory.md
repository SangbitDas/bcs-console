# BCS Console — migration memory (maintained, newest first)

## 2026-09-19 — Roadmap Phase 2: Supabase Auth (Google OAuth), Cloud Sync & Schema Refinements
- **User Request**:
  - Implement User Login and Cloud Synchronization into Supabase Postgres database (NO Firebase/Firestore).
  - Database schema matching exact Roadmap Phase 2 requirements:
    1. `profiles`: Linked to `auth.users` (id, full_name, email, phone, avatar_url, created_at, updated_at).
    2. `user_bookmarks`: `user_id`, `question_id`, `created_at`, `custom_notes`.
    3. `user_mistakes`: `user_id`, `question_id`, `wrong_count`, `last_wrong_at`, `revision_count`, `spaced_repetition_stage`, `next_review_at`, `is_resolved`.
    4. `exam_attempts` & `attempt_answers`: Detailed marksheet, negative marking, time spent, question-level answers (`user_answer`, `correct_answer`, `is_correct`).
    5. `user_subject_performance`: Subject-wise accuracy and tracking for radar charts and progress analytics.
- **Database Execution & Schema Updates**:
  - Created and applied migration `supabase/migrations/20260919000000_phase2_user_tables.sql` against live Supabase Postgres database.
  - Verified created tables: `profiles`, `user_bookmarks`, `user_mistakes`, `exam_attempts`, `attempt_answers`, `user_subject_performance`.
  - Enforced Row-Level Security (RLS) policies scoped to `auth.uid() = user_id`.
  - Created `handle_new_user()` trigger on `auth.users` to automatically populate `public.profiles`.
  - Executed `alter table public.profiles drop column if exists target_bcs_batch;` on live database and added migration `supabase/migrations/20260919000001_drop_target_bcs_batch.sql`.
  - Added CLI database inspector script `scripts/inspect_db.py` for instant schema, column, and row-count verification.
- **Application Implementation (`apps/web`)**:
  - `src/lib/supabase.ts`: Configured Supabase client with SSR-safe storage adapter (`ssrStorage` on Node, `AsyncStorage` on browser) preventing `window is not defined` during Expo Router SSR.
  - `src/lib/auth.ts`: Zustand auth store with Google OAuth (`db.auth.signInWithOAuth`), profile management, and automatic cloud sync invocation on authentication.
  - `src/app/+html.tsx`: Injected `<meta name="referrer" content="no-referrer" />` so Google user profile pictures (`lh3.googleusercontent.com`) load without being blocked by Google referrer policies.
  - `src/components/avatar.tsx`: Created reusable `UserAvatar` component with explicit `referrerPolicy="no-referrer"` on web and graceful single-letter fallback.
  - `src/components/auth-modal.tsx`: Swiss-editorial authentication dialog with Google OAuth button. Cleaned up redundant target batch selector and manual sync button (sync is 100% automatic). Fixed modal close/abort button with proper `zIndex` and backdrop click handling.
  - `src/components/ui.tsx`: TopBar updated with sleek login trigger button and profile avatar.
  - `src/lib/library.ts`: Extended with two-way cloud sync (`syncCloud`), bookmark upsert/delete, mistake bank tracking, and comprehensive exam attempt recorder (`saveExamAttempt`).
  - `src/components/practice-screen.tsx`: Wired `saveExamAttempt` into `finishSession`.
  - `src/app/exam.tsx`: Wired `saveExamAttempt` into `doSubmit`.
- **Verification**:
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Metro bundler tested with `HTTP 200 OK`.
  - Verified live Postgres tables and data ingestion via `scripts/inspect_db.py`.



## 2026-09-19 — Simplified header TopBar: removed subtitle and redundant navigation links
- **User request**: Remove `[10TH-50TH BANK]` and remove the navigation tab buttons (`[হোম]`, `[অনুশীলন]`, `[মক এক্সাম]`, `[কাস্টম এক্সাম]`, `[বুকমার্ক]`, `[ভুলসমূহ]`) from the header navbar.
- **Changes in `apps/web/src/components/ui.tsx`**:
  - Removed `| 10TH-50TH BANK` subtitle next to the brand logo, leaving clean `বিসিএস • কনসোল`.
  - Removed the `navs` array, active route underlines, and top link buttons.
  - Kept the live exam countdown badge (`fmtTime(remain)`) when a mock exam is running.
  - Removed unused `usePathname` import.
- **Verification**:
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Committed locally on `dev` (`c2d21c6`). Remote NOT pushed per user constraint.

## 2026-09-19 — Fixed blank Custom Exam screen on `/custom`
- **Problem**: Navigating to `http://localhost:8081/custom` resulted in an empty main content area where only the NotesCard ("লক্ষণীয়"), breadcrumb (`হোম › অনুশীলন ›`), and red accent bar rendered, while the entire custom exam configuration builder (BCS range picker, subject grid, question count picker, timer settings, and CTA button) was missing.
- **Root cause**:
  1. **Background `<Tabs>` state conflict**: `PracticeIndexRoute` (`/practice`) mounts `<PracticeScreen initialMode={null} />`, which stays mounted in memory. When `/custom` was opened, the background `/practice` screen re-rendered. Its `useEffect` had `if (targetMode === null) s.backToHub();`. Because its own `targetMode` was statically `null`, it immediately reset `s.mode` to `null` in the shared Zustand store, canceling out `s.setMode('custom')`.
  2. **`ConfigureView` prop omission**: `ConfigureView` read `s.mode` directly instead of being informed which mode it was configuring. When `s.mode` was `null`, all mode conditionals (`s.mode === 'custom'`, `s.mode === 'exam'`, etc.) evaluated to `false`, causing `ConfigureView` to render `null` for the main content.
- **Fix in `apps/web/src/components/practice-screen.tsx`**:
  - Added route active check `isCurrentRouteActive` matching `pathname` against the specific screen route (`/custom`, `/practice`, etc.). Non-active background tab screens now immediately exit `useEffect` without mutating the store or calling `s.backToHub()`.
  - Scoped Hub reset strictly to `if (isPracticeHub)` rather than `if (targetMode === null)`.
  - Updated `ConfigureView` to accept `mode?: PracticeMode` and resolve `effectiveMode` synchronously from `mode ?? s.mode ?? 'custom'`.
  - Rewrote all mode checks inside `ConfigureView` (breadcrumb, sidebar, SummaryCard, NotesCard, and main builder) to use `effectiveMode`.
- **User requirement: No default exam selection**:
  - Removed auto-selection of all exams upon entering Custom Exam mode. User explicitly controls their exam selection: opens with clean slate ("কোনোটি নির্বাচিত নয়"), allowing individual exam selection or optional "সব নির্বাচন করুন" on-demand.
- **Verification**:
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Committed locally on `dev` (`1b75892`). Remote NOT pushed per user constraint.

## 2026-09-19 — Fixed cross-route state leak from Custom Exam to Practice Hub
- **Problem**: When a user started a custom exam on `/custom` without submitting/finishing, navigated to Home (`/`), and clicked "অনুশীলন" (`/practice`), the browser URL changed to `http://localhost:8081/practice` but the screen remained stuck displaying the custom exam runner from `/custom`.
- **Root cause**:
  1. React Navigation `<Tabs>` keeps tab routes mounted in memory. When `/custom` was started, the shared Zustand store `usePracticeStore` updated `mode = 'custom'` and `started = true`.
  2. The hidden `/practice` tab re-rendered in the background. Because `isVirtualList` checked only `s.started && (s.mode === 'exam' || s.mode === 'subject' || s.mode === 'custom')` without verifying whether `s.mode` matched the route's intended mode, it mounted the custom runner inside `/practice`.
  3. The route sync `useEffect` had only `[initialMode, params...]` in its dependency array without `pathname`. Because `initialMode` was `null` before and after navigation, the `useEffect` never re-triggered upon switching tabs, leaving the store stuck on `custom`.
- **Fix in `apps/web/src/components/practice-screen.tsx`**:
  - Added `usePathname()` from `expo-router` into the route synchronization `useEffect` dependency array.
  - Introduced explicit `targetMode` resolution (`params.mode === 'bookmarks' || params.mode === 'wrong' ? params.mode : initialMode ?? null`).
  - Scoped `isVirtualList` to require `targetMode !== null && s.mode === targetMode && s.started`.
  - Scoped main view rendering so that whenever `targetMode === null`, it unconditionally renders `HubView` and resets the store via `s.backToHub()`.
  - Updated `poolArgs` to stay disabled (`enabled: false`) when `targetMode === null` or `s.mode !== targetMode`, preventing redundant API calls.
- **Verification**:
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Committed locally on `dev` (`19dc154`). Remote NOT pushed per user constraint.

## 2026-09-17 — Refactored Practice and Exam Result UI (Clean, Neat, Swiss-Editorial)
- **User feedback**: Discarded generic AI-template elements (pastel alert boxes, floating exclamation pills, nested answer cards) in favor of the app's authentic editorial design language.
- **Craft Principles Applied**:
  - Honored incumbent design system tokens: `bg-paper` (#F6F5F1), `bg-surface` (#FFFFFF), `border-black/10`, `ink` (#0A0A0A), `accent` (#EA0000), `ok` (#0A7A3D).
  - Eliminated nested cards and loud pastel containers (`bg-rose-50`, `bg-emerald-50`, `bg-amber-50`).
  - Strict typography hierarchy: `FONT.displayBlack`, `FONT.uiBold`, `FONT.uiSemi`, `FONT.ui`, and `FONT.digitsBold`.
- **Changes in `apps/web/src/components/practice-screen.tsx` & `apps/web/src/app/exam.tsx`**:
  - **Unified Scoreboard**:
    - Clean, authoritative card container (`rounded-xl border border-black/10 bg-surface p-6 sm:p-7`).
    - Left column: prominent score display (`FONT.displayBlack`) with total questions, accuracy subtitle, and a slim, crisp 8px progress bar with forest green (`bg-ok`) and red (`bg-accent`).
    - Right column: clean, minimalist metric columns (সঠিক উত্তর, ভুল উত্তর, দেখা হয়নি / ফাঁকা) with pure typography, no neon borders.
  - **Wrong Questions & Review (`WrongQuestionCard` / `ExamReviewCard`)**:
    - Restored the app's authentic `QuestionCard` layout.
    - Header: ink numeral badge (`toBn(idx + 1)`), `<Tag warn>ভুল উত্তর</Tag>`, subject and exam tags, and clean bookmark button.
    - Question options: rendered in context with authentic A/B/C/D option bars. Correct answer highlighted with `border-ok bg-ok/5` and green status tag; user's wrong answer highlighted with `border-accent bg-accent/5` and red status tag; unchosen options subtle.
    - Solution note: cleanly integrated in a neutral `bg-paper` container matching `QuestionCard`, avoiding loud amber backgrounds.
  - **Action Controls**:
    - Clean `bg-ink` primary button and `border-black` secondary buttons matching the app's standard `Btn` component.
- **Verification**:
  - `pnpm exec tsc --noEmit` passed with 0 errors.
  - Committed locally on `dev` (`f63a7f1`). Remote NOT pushed per user constraint.

## 2026-09-17 — Discarded multi-option selection in Subject Mode (`/practice/subject`)
- **User request**: "Here i dont need multiple option selection feature anymore. Discard it"
- **Changes in `apps/web/src/components/practice-screen.tsx`**:
  - Discarded multi-select checkboxes `[ ]` from all 10 subject cards.
  - Discarded the header action button ("সব নির্বাচন করুন" / "সব মুছুন").
  - Discarded the bottom action bar ("অন্তত একটি বিষয় বেছে নিন" / "অনুশীলনে প্রবেশ করুন >").
  - Transformed each subject card into a direct action card: clicking any card now immediately navigates to `/practice/subject/${sub.id}` via `router.push`, seamlessly mounting the virtualized question bank for that subject (matching the single-click exam card behavior of `/practice/exam`).
  - Updated the `SummaryCard` in `configSidebar` for `subject` mode to remove the inactive "অনুশীলনে প্রবেশ করুন →" CTA button and show a clean informational summary.
- **Verification**:
  - `pnpm tsc --noEmit` passed with 0 errors.
  - Both `/practice/subject` and `/practice/subject/1` respond with HTTP 200 OK.
  - Committed locally on `dev` (`03e5945`). Remote NOT pushed per user instruction.

## 2026-09-17 — Fixed browser back button state synchronization (Runner → Picker → Hub)
- **Problem**: When navigating back in the browser from an active exam runner (`/practice/exam`), the browser URL changed back to `/practice` (or `/practice/exam`), but the screen remained frozen on the active question runner instead of returning to the Practice Hub.
- **Root cause**:
  1. In `apps/web/src/components/practice-screen.tsx`, the route synchronization `useEffect` checked `!s.started` before calling `s.setMode(initialMode)`. Because `s.started` was `true` during an active practice session, returning to `/practice` (where `initialMode = null`) was completely ignored, leaving the Zustand store in `started: true` and `mode: 'exam'`, so `PracticeScreen` continued rendering `ExamAllQuestionsView`.
  2. Selecting an exam chip previously only called `s.start()` in memory without pushing a URL state to browser history, causing browser Back to jump straight from runner to Hub rather than stepping back to the exam selection list.
- **Fix**:
  - Rewrote the route synchronization `useEffect` in `practice-screen.tsx`:
    - When navigating to the Hub (`initialMode === null`), it calls `s.backToHub()` if `s.mode !== null || s.started`, immediately rendering `HubView`.
    - When navigating to an exam route without `params.exam` while `s.started` is true, it calls `s.backToPicker()`, cleanly returning to the 41-exam selection grid.
    - Added query param synchronization on exam selection: clicking an exam pushes `/practice/exam?exam=${e.slug}`, giving the runner its own browser history entry.
    - Updated breadcrumb and "অন্য পরীক্ষা বেছে নিন" buttons to cleanly synchronize route state.
- **Verification**:
  - `pnpm tsc --noEmit` passed with 0 errors.
  - End-to-end browser subagent test: `/practice` ➔ `/practice/exam` ➔ clicked ৫০তম (loaded runner at `/practice/exam?exam=50th_bcs`) ➔ browser Back (restored 41-exam list at `/practice/exam`) ➔ browser Back (restored Practice Hub at `/practice`). Screenshot captured.
  - Committed locally on `dev` (`d075966`). Remote NOT pushed per user instruction.

## 2026-09-17 — Fixed unmatched route on subjectwise button click
- **Problem**: Clicking the "বিষয়ভিত্তিক" ("১০টি বিষয়") button on `/practice` navigated to `/practice/subject` and failed with an "Unmatched Route" error in the browser.
- **Root cause**:
  1. In Expo Router, when a nested directory (`apps/web/src/app/practice/subject/`) contains both an `index.tsx` and dynamic `[id].tsx` without its own `_layout.tsx`, Expo Router treats `index.tsx` as a leaf route named `/practice/subject/index` rather than a directory index route `/practice/subject`. Consequently, `router.push('/practice/subject')` failed to find a match.
  2. Additionally, the running Metro process on Windows had accumulated 61,000+ files in `%TEMP%\metro-cache` and 18,000+ file handles, throwing `EMFILE: too many open files` on bundle requests.
- **Fix**:
  - Created `apps/web/src/app/practice/subject/_layout.tsx` returning `<Slot />`, establishing `subject` as a formal route layout that maps `/practice/subject` to `index.tsx` and `/practice/subject/:id` to `[id].tsx`.
  - Cleared `%TEMP%\metro-cache` and restarted Metro with `expo start --web -c`.
- **Verification**:
  - `pnpm tsc --noEmit` passed with 0 errors.
  - End-to-end browser agent test: navigated to `/practice`, clicked "বিষয়ভিত্তিক", successfully loaded `/practice/subject` with all 10 BCS subject cards, 0 errors, and captured screenshot.
  - Committed locally on `dev` (`a2637ab`). Remote NOT pushed per user instruction.

## 2026-09-17 — Dynamic `/practice/subject/[id]` route implemented & homepage linked
- **User goal**: Support direct dynamic routing by subject ID (`/practice/subject/[id]`) for subject-wise practice, while preserving the subject selection hub at `/practice/subject` and retaining 100% of the verified UI and virtualized FlashList runner.
- **Route restructuring**:
  - Replaced `apps/web/src/app/practice/subject.tsx` with directory `apps/web/src/app/practice/subject/`:
    - `index.tsx`: Subject selection hub showing all 10 taxonomy subject cards with question counts and multi-select checkboxes.
    - `[id].tsx`: Dynamic route catching subject ID parameters (1..10), immediately mounting the question bank for that subject (e.g., `/practice/subject/1` for Bangla with 1,008 questions, `/practice/subject/2` for English with 977 questions).
- **Zustand store enhancement (`apps/web/src/store/practice.ts`)**:
  - Added `setSubjects: (ids: number[]) => void` to `PracticeState` interface and `usePracticeStore` implementation, enabling clean, single-call bulk/single subject selection without relying on repetitive `toggleSubject` calls.
- **Parameter resolution & auto-start (`apps/web/src/components/practice-screen.tsx`)**:
  - `useLocalSearchParams<{ id?: string; subject?: string; exam?: string; mode?: string }>()` extracts `params.id` alongside query fallback `params.subject`.
  - When an ID is present, it validates the numeric ID, invokes `s.setMode('subject')`, `s.setSubjects([id])`, and immediately executes `s.start()`, bypassing the manual configuration step.
  - **Hook safety constraint**: Kept store instance `s` strictly out of the `useEffect` dependency array (`[params.id, params.subject, params.exam, params.mode]`), preventing React's `Maximum update depth exceeded` infinite loop while ensuring smooth client-side transitions.
- **Home page integration (`apps/web/src/app/index.tsx`)**:
  - Updated the 10 subject preview cards on the landing page (`/`) to navigate directly via `router.push(('/practice/subject/' + s.id) as any)`.
- **Git status & safety policy**:
  - Committed locally on active branch `dev` (`d4b4f40`: *"feat(routes): add dynamic /practice/subject/[id] route and link homepage cards"*).
  - **CRITICAL POLICY**: Per explicit user constraint ("Dont push if we i dont say"), changes are strictly preserved locally and NEVER pushed to origin without direct user instruction.
- **Verification**:
  - `pnpm tsc --noEmit` passed with 0 errors.
  - Development server (`http://localhost:8081`) verified serving all routes with HTTP 200:
    - `/` (Home / Landing)
    - `/practice` (Practice Hub with mode cards and recent sessions)
    - `/practice/exam` (BCS question paper picker 10th–50th)
    - `/practice/subject` (10-subject picker hub)
    - `/practice/subject/1` (Bangla - 1,008 questions continuous FlashList)
    - `/practice/subject/2` (English - 977 questions continuous FlashList)
    - `/practice/custom` (Custom range/subject/count generator)
  - End-to-end browser agent test validated URL navigation, subject auto-selection, and question rendering.

## 2026-09-17 — Dedicated routes for Practice modes (`/practice/exam`, `/practice/subject`, `/practice/custom`) with 100% UI preservation
- User goal: Provide distinct, bookmarkable URLs for practice modes without changing a single pixel of the verified UI.
- Architecture:
  - Consolidated complete 2,179-line practice runner into single reusable source of truth: `apps/web/src/components/practice-screen.tsx`.
  - Converted `apps/web/src/app/practice` into an Expo Router directory:
    - `_layout.tsx`: minimal `<Slot />` layout preventing nested stack navigator header collisions and infinite loops.
    - `index.tsx`: renders `PracticeScreen` with `initialMode={null}` (HubView with 3 mode cards + recent practice rows).
    - `exam.tsx`: renders `PracticeScreen` with `initialMode="exam"` (BCS question papers list 10th–50th).
    - `custom.tsx`: renders `PracticeScreen` with `initialMode="custom"` (Custom range slider, count, and order builder).
  - Mode selections in HubView and recent sessions navigate to their respective subroutes (`router.push('/practice/exam')`, etc.).
  - Breadcrumbs and back buttons smoothly route back to `/practice`.
- Updated `apps/web/src/app/bookmarks.tsx` and `wrong.tsx` to import `QuestionCard` and `DisplayItem` from `../components/practice-screen`.
- Verified: TypeScript clean (0 errors), end-to-end browser agent verified mode navigation and URL synchronization. Committed and pushed to `origin/dev` (`44b1b60`).

## 2026-09-17 — Expo SDK 57 dependency alignment & security audit
- Diagnosed via `pnpm dlx expo install --check`:
  - `expo`: updated from `57.0.22` to `~57.0.23`.
  - `@react-native-async-storage/async-storage`: aligned from `3.1.1` to certified version `2.2.0`.
  - `react-native-svg`: aligned from `15.15.5` to certified version `15.15.4`.
- Verified: `expo install --check` reports "Dependencies are up to date", `tsc --noEmit` clean (0 errors). Committed and pushed to `main` (`2bb00a4`).

## 2026-09-17 — Landing page preparation sections unified into single concise section
- Problem: Section 3 ("কীভাবে শুরু করবেন / তিন ধাপে প্রস্তুতি") and Section 4 ("পথ বেছে নিন / দুটি মাধ্যম") overlapped heavily, repeating years (১০ম–৫০তম), subjects (১০টি বিষয়), untimed practice, and mock exam points.
- Fix:
  - Combined the two sections into a single cohesive section in `apps/web/src/app/index.tsx`:
    - Header: `<SectionHead kicker="কীভাবে প্রস্তুতি নেবেন" title="প্রস্তুতির দুটি শক্তিশালী মাধ্যম।" />`
    - Practice Card: Covers self-paced study, 10th–50th BCS filtering, 10 subjects, instant explanations, diagrams, and bookmark/mistake revision with direct CTA to `/practice`.
    - Mock Exam Card: Covers real examination environment, 120-minute countdown timer with auto-submit, digital OMR sheet & question palette, -0.25 negative marking, and score analysis with direct CTA to `/exam`.
  - Removed redundant `STEPS` array, `stepCols`, and unused icon imports (`Award`, `Calendar`, `FileText`, `Languages`, `Play`, `Sliders`).
- Verified: `tsc --noEmit` clean (0 errors), responsive on desktop (side-by-side 2-column) and mobile (stacked).

## 2026-09-17 — Git baseline preserved & fallback checkpoints created
- User goal: Lock down verified, working state in Git before further experimentation.
- Audited `.gitignore`:
  - Added rules to ignore loose root mock images (`/mock.png`, `/ChatGPT Image*.png`), build logs, and temporary files.
  - Deleted duplicate `apps/web/gitignore` (missing leading dot).
- Created annotated tag `stable-ui-baseline` and dedicated backup branch `backup/stable-ui-baseline`.
- Pushed tag and backup branch to GitHub (`https://github.com/SangbitDas/bcs-console.git`).
- Active feature development transitioned to `dev` branch (`git checkout -b dev`).

## 2026-09-16 — Reverted sub-route fragmentation & restored unified single-page runner
- Problem: An earlier refactor split practice into disjoint route folders and separate simplified files, which caused a `Maximum update depth exceeded` infinite loop during store synchronization, broke the unified runner, and degraded the UI layout.
- Fix:
  - Reverted sub-route directory fragmentation and restored the original, battle-tested single-page runners for practice (`practice.tsx`), exam (`exam.tsx`), bookmarks (`bookmarks.tsx`), and wrong questions (`wrong.tsx`).
  - Preserved critical bug fix: pressing "ব্যাখ্যা দেখুন" (`onToggleNote`) now evaluates `showAnswer = isAnswered || revealAll || expanded;` so the correct answer lights up green alongside the explanation note.
  - Preserved homepage typography fix ("দশটি বিষয়", "সরাসরি অনুশীলন করুন", and green tick marks on mock card).
- Verified: 0 TypeScript errors, bundle verified on dev server.

## 2026-09-15 — Vertical scrollbar (slider) enabled across web
- Root cause:
  1. `global.css` had `* { scrollbar-width: none; }` and `::-webkit-scrollbar { display: none; }` which wiped out all browser scrollbars universally.
  2. In React Native Web's `ScrollViewBase.js`, `const hideScrollbar = showsHorizontalScrollIndicator === false || showsVerticalScrollIndicator === false;` causes passing `showsHorizontalScrollIndicator={false}` to trigger `hideScrollbar = true`, injecting inline `scrollbar-width: none`.
- Fix:
  1. `+html.tsx`: injected `<style>` block in `<head>` ensuring `scrollbar-width: thin !important` and `::-webkit-scrollbar { display: block !important; width: 8px !important; }` with subtle, modern track/thumb styling.
  2. `global.css`: moved custom sleek scrollbar rules outside `@layer base` with `!important` to override React Native Web atomic CSS classes.
  3. `practice.tsx`, `exam.tsx`, `index.tsx`, `patterns.tsx`: enabled `showsVerticalScrollIndicator={true}` and removed `showsHorizontalScrollIndicator={false}` so React Native Web never triggers `hideScrollbar`.
- Verified: `tsc --noEmit` clean (0 errors), scroll slider visible and draggable on question lists, sidebars, mobile panels, and dropdowns.


## 2026-09-15 — Lifted 1000-row PostgREST cap in question pool (paginated .range)
- Root cause: Supabase/PostgREST enforces server-side `max-rows = 1000`. Single requests with `.limit(6000)` were silently capped at 1000 rows, truncating Bangla (1008 Qs -> 1000), multi-subject (e.g. Bangla+English 1985 Qs -> 1000), and all-subject practice (5350 Qs -> 1000).
- Fix in `apps/web/src/hooks/queries.ts`: `useQuestionPool` now loops over `.range(from, from + 999)` with `PAGE_SIZE = 1000` until fewer than 1000 rows are returned (with `MAX_PAGES = 10` safety guard).
- Total deterministic order: `.order('exam_slug').order('question_number').order('id')` ensures 0 duplicates and 0 missed questions across chunk boundaries.
- Cleaned up: removed unused `usePracticeQuestions`.
- Enhanced loading UI in `practice.tsx`: displays an `ActivityIndicator` and centered message while chunked pool query is in-flight.
- Verified: Bangla returns exactly 1008 questions, Bangla+English returns exactly 1985 questions, and all subjects return exactly 5,350 unique questions (`ids.size = 5350`). `tsc --noEmit` clean (0 errors).


## 2026-09-15 — Practice mobile layout: split into separate সারসংক্ষেপ (left) and ফিল্টার (right) buttons
- Replaced the single combined "সারসংক্ষেপ ও ফিল্টার" mobile collapsible toggle in
  both `SubjectAllQuestionsView` and `ExamAllQuestionsView` with two distinct side-by-side buttons:
  - **Left side**: "সারসংক্ষেপ" button with `FileText` icon, toggles summary & controls cards.
  - **Right side**: "ফিল্টার" button with `Filter` icon and active filter count badge, toggles subject/BCS filter cards.
- Modularized sidebar cards (`summaryCard`, `filterCard`, `controlsCard`) so each button cleanly toggles only its respective panel without overflowing or forcing long single scrolls.
- Active state styling: the opened button highlights in dark background (`bg-ink text-white`) with chevron indicator (`লুকান ↑` / `দেখুন ↓`).
- Preserved `FlashList` viewport height calculations (`narrowListH`) taking the collapsible panel expansion into account.
- Verified: `tsc --noEmit` clean (0 errors), responsive on both mobile and wide screens.


## 2026-09-15 — BCS filter side panel: 2-column equal-width cards with fixed 54dp height
- Replaced variable-size inline chips in `SubjectAllQuestionsView`'s BCS filter side
  panel with a responsive 2-column grid (`gap: 8`, `width: 'calc(50% - 4px)'`).
- Strict fixed height: all cards locked to `height: 54, minHeight: 54, maxHeight: 54, overflow: 'hidden'`
  (52–56dp range).
- Rigid geometry: `numberOfLines={1}` on both title (`[N]তম বিসিএস`) and question count (`[K]টি প্রশ্ন`)
  inside a flex-1 container (`min-w-0`), completely preventing individual cards from resizing
  based on their content.
- Added `numberOfLines?: number` prop support to `<Bn>` component in `ui.tsx`.
- Verified: `tsc --noEmit` clean (0 errors), responsive on desktop sidebar and mobile collapsible panel.

## 2026-09-15 — Single font: Noto Sans Bengali everywhere (Hind Siliguri removed)
- User call: Noto Sans Bengali for all Bangla text + numerals, no other fonts.
- `lib/fonts.ts`: all 11 `FONT` keys remapped 1:1 by weight to
  `NotoSansBengali_300Light/400Regular/500Medium/600SemiBold/700Bold`
  (`display*` stay Bold 700 as before); `useAppFonts` loads only those 5 faces.
- All 11 `fontFamily: 'monospace'` usages replaced with Noto weights (TopBar,
  timers, `Chip` sub, OMR keys, tick counts, kickers, card ids, exam score) —
  zero `monospace` left. Known tradeoff: proportional figures make `HH:MM:SS`
  width wobble slightly (accepted per user: no exceptions).
- `Bn` digit-guard retargeted to `NotoSansBengali`; `+html.tsx`, `global.css`,
  `tailwind.config.js` stacks switched to Noto (+ dead `IBMPlexMono_500` entry
  deleted); uninstalled `@expo-google-fonts/hind-siliguri` +
  `@expo-google-fonts/noto-serif-bengali`.
- Verified: 0 hits for Hind/Siliguri/monospace/NotoSerif in src+config,
  `tsc --noEmit` clean (0 errors).

## 2026-09-15 — Practice list layout restored + FlashList scroll fixed
- Restored the previous `SidebarLayout` look (sidebar cards + list header above the
  questions) while keeping the FlashList/memo/selector architecture — no pagination.
- Scroll fix: the split-pane row used `alignItems: flex-start` with an unbounded
  flex chain, so FlashList never got a real height on web and wouldn't scroll.
  Both list views now measure real pixels via `onLayout` (viewport + breadcrumb
  chrome + mobile toggle) and give the sidebar `ScrollView` and the FlashList
  explicit heights (`listH`/`narrowListH`, window-height-seeded to avoid a flash).
- Mobile (<860px) keeps a collapsible filter panel above the list — a stacked
  full-page scroll can't virtualize.
- Verified: `tsc --noEmit` clean (0 errors).

## 2026-09-15 — Practice lag fixed via FlashList virtualization (no pagination)
- Problem: `/practice?subject=1` (Bangla = 1008 Qs) lagged on every tap — all cards
  mounted in one `ScrollView` and every answer re-rendered the whole list via a
  whole-store `usePracticeStore()` subscription. No API issue (pool fetches once).
- Fix in `apps/web/src/app/practice.tsx` (continuous scroll kept, per user):
  installed `@shopify/flash-list@2.0.2` (v2 auto-measures, no `estimatedItemSize`);
  new shared `QuestionsFlashList` + `DisplayItem` rows feed `ExamAllQuestionsView`
  and `SubjectAllQuestionsView`, so only ~20–30 cards mount while scrolling 1→1008.
- `QuestionCard` is `React.memo` with primitive-only props (`indexLabel`,
  `subjectLabel`, `examBadge`) and granular selectors (`done[qid]`, per-card
  bookmark) — answering Q500 re-renders only Q500. Display data (`toBn`,
  `subjectName`, `examLabel`) normalized ONCE per filter change; `subjectName`
  stabilized with `useCallback` so normalization isn't redone per tap.
- Layout: list modes render in a `flex:1` container (no outer `ScrollView`);
  sidebar scrolls independently on desktop (≥860px), collapsible filter panel on
  mobile. An earlier pagination approach was replaced per user direction.
- Verified: `tsc --noEmit` clean (0 errors).

## 2026-09-15 — Bengali numerics restricted to Hind Siliguri
- `Bn` (`apps/web/src/components/ui.tsx`) now forces ০-৯ digit runs into a Hind
  Siliguri family even when the caller passes `monospace` (previously leaked through
  via `flatStyle.fontFamily`); weight preserved when base is already Hind Siliguri.
- Direct fixes: practice result score (`practice.tsx`) and RULES ids ০১/০২/০৩
  (`index.tsx`) switched from `monospace` to Hind Siliguri.
- Remaining `monospace` usages are Latin-only (timers, A–D keys, raw counts) — left alone.
- Verified: `tsc --noEmit` clean (0 errors).

## 2026-09-12 — Mock Exam and Onushilon UI overhauled to match mockups
- Mock Exam (`/exam`): Rebuilt to match `mock.png` 1:1. Centered 680px container,
  red accent line, single unified card with sections 1–6 (radio pills, range dropdowns,
  question count dropdown, time dropdown, tickbox subject dropdown, order radio circle
  buttons), full-width black CTA button, and bottom meta strip.
- Onushilon (`/practice`): Rebuilt to match Screen 1 & Screen 3. Centered 720px hub,
  2x2 mode cards (`বিসিএস পরীক্ষা`, `বিষয়`, `টপিক`, `কাস্টম অনুশীলন`), recent practice
  card section with progress bars and score metrics, and bottom quote block.
  Custom/subject config builder ("নিজের পরীক্ষা তৈরি করুন") adopts clean 2-column layout.
- TopBar: Branded `বিসিএস • কনসোল | 10TH-50TH BANK` with active tab red underline.
- Primitives added: `DropdownSelect`, `RadioPill`, `RadioCircleOption`, `RecentPracticeRow`, `QuoteCard`.
- Verified: `tsc --noEmit` clean (0 errors), `expo export --platform web` clean (0 errors),
  browser visual screenshots captured and verified.

## 2026-09-11 — Subject picker is a tickbox dropdown too
- New `SubjectDropdown` mirrors the exam dropdown (count button, tick rows with
  per-subject counts, সব/মুছুন/সম্পন্ন, selected-names preview). Exam config
  card ৩ uses it; subject chips removed from mock flow.
- Verified: `tsc` clean, export OK.

## 2026-09-11 — Dropdown tickbox picker + left-rail mock layout
- `ExamMultiPicker` is now a dropdown: closed button shows count ("Nটি নির্বাচিত" /
  "সব (৪১টি)"), opens era-grouped tick-box rows (custom checkbox + label + count),
  সব/মুছুন/সম্পন্ন actions, 320px scroll list, selected numbers preview below.
- Mock config uses a left rail (hero + recents) with cards in the wide main
  column; page widened to 1400px. Fixed lucide `style.transform` typing via
  wrapper View.
- Verified: `tsc` clean, export OK, pages serve 200.

## 2026-09-11 — OMR dots go compact (hitSlop keeps taps easy)
- Bubbles shrunk 44px → 24px with `hitSlop={12}` (small-sheet look, ~48px tap
  area preserved), tighter columns/gaps. Verified: `tsc` clean, export OK.

## 2026-09-11 — Space-filling multi-column layouts (web)
- New `Cols` (flex-wrap, min-basis, optional weights) + `Card` primitives.
- Landing: steps + feature cards + subjects now flow in responsive columns.
- Practice/exam config: count/time/order and summary/notes sit side by side;
  runners are 2:1 (reader + score/palette column) on desktop, stacked on mobile.
- Fixed a JSX nesting slip from the runner restructure (extra close tag).
- Verified: `tsc` clean, export OK, pages serve 200.

## 2026-09-11 — Exam picker goes OMR bubble-table, দশক labels dropped
- `ExamMultiPicker` rewritten: era rows as bordered table (label cell + 44px
  circular bubbles, filled-black when picked) instead of capsules. Era labels now
  সাম্প্রতিক / ৪১–৪৫তম / ৩১–৪০তম / ২১–৩০তম / ১০–২০তম — "N-এর দশক" phrasing gone.
- Verified: `tsc` clean, export OK, pages serve 200.

## 2026-09-11 — Mock config per Image 1 + free custom picks
- `ExamMultiPicker` (patterns): any-exam multi-select grouped by era + সব/মুছুন,
  empty = all exams. No fixed ranges in custom/subject mock.
- Exam store + `MockRerunConfig` carry `exams[]`; pool = picked (sorted) or all.
- ConfigView restyled into numbered bordered cards (১ উৎস / ২ পরীক্ষা-বাছাই /
  ৩ বিষয় / count / সময় / ধরন) + SummaryCard + icon meta row
  (Clock/FileText/BookOpen: সময়·প্রশ্ন·উৎস) like the suggestion panel. 4 sources
  only — no টপিক.
- Verified: `tsc` clean, export OK, pages serve 200.

## 2026-09-11 — Bangla numerals switched to Noto Sans Bengali
- User pick: Noto Sans Bengali for all ০-৯ digits (was Hind Siliguri/system fallback).
- Installed `@expo-google-fonts/noto-sans-bengali`, load 400/500/600/700 in
  `useAppFonts`; `FONT.digits/digitsBold/digitsReg` added.
- New `Bn` component (`ui.tsx`): splits Bangla-digit runs into nested Text in the
  digits font — Latin text/punctuation untouched. Wired through Chip, Tag, Btn,
  OptBtn options, Feedback, SectionHead, TimerBar, Palette, ScorePanel, SegControl,
  ModeCard, SummaryCard, NotesCard, GoRow, RecentRow, Range/Count pickers, all
  screens' counters/scores/reviews/DB question text.
- Verified: `tsc` clean, export OK, font name + pages serve 200.

## 2026-09-11 — Breadcrumb same-route fix
- Bug: crumbs pointing at the current route (অনুশীলন, মক পরীক্ষা) appeared dead —
  router had nothing to change and flow state never reset.
- Fix: `Breadcrumb` trail items are now `{label, href?, onPress?}`; same-route
  crumbs call `backToHub()` (practice) / `backToPicker()` (exam) to reset the flow.
- Verified: `tsc` clean, web export rebuilt.

## 2026-09-11 — PRD.md created (PRD + roadmap with done/not-done)
- New `PRD.md`: product, fixed taxonomy (no topics), feature status (§3.1–§3.6
  with ticked DONE vs NOT DONE), phased roadmap (0-data DONE, 1-web MVP DONE,
  2-accounts NEXT, 3-Android + 4-growth LATER), constraints, 3 open questions.
- Phase 2 entry criteria noted: auth method decision + user tables + RLS.

## 2026-09-11 — Suggestion-image UI adopted + PRD flows (no topics)
- Installed `lucide-react` + `@react-native-async-storage/async-storage`.
- Practice = hub (4 Lucide mode cards: exam/subject/custom/bookmarks) + per-mode
  configure (era chips, multi-subject, RangePicker presets+custom, CountPicker,
  seq/random SegControl, SummaryCard + NotesCard) + runner (bookmark toggle,
  finish → result with wrong-review + retry) + local recents with one-tap rerun
  + wrong-questions set. NO topic hierarchy anywhere (taxonomy = 10 subjects).
- Mock = source SegControl (full/exam/subject/custom) + range/count/time/order
  config + timed runner with flag mark-for-review (palette red-ring) + result
  (score/breakdown/subject bars/review incl. marked) + mock recents with rerun.
- Local-only `lib/library.ts` (zustand/persist, key `bcs-library`): recents(8),
  bookmarks(500), wrongIds(300). Cloud/user tracking deferred per user.
- Fixed en route: useExamPaper edit accident (repaired + added useQuestionPool),
  practice feedback precedence + require() hack, tsc PracticeMode index error.
- Verified: `tsc` clean; `expo export` → / /practice /exam; pages serve 200;
  bundle contains custom/mock/review/bookmark/palette strings, lucide,
  persist key, pool limit 6000.
- Deferred: Victory/RHF-Zod/PostHog, user accounts + cloud sync, landing recents.

## 2026-09-11 — Static site removed (complete shift to Expo)
- Deleted `index.html`, `practice.html`, `exam.html` + `assets/` (CSS/JS) per user
  option 1. `apps/web` is now the only frontend. Static content lives on in git
  history if ever needed.

## 2026-09-11 — Expo web app scaffolded in apps/web (stack shift, web only)
- Stack per user (minus EAS/deploy): Expo SDK 57 + Expo Router (Tabs: হোম/অনুশীলন/
  পরীক্ষা) + NativeWind 4.2.6/Tailwind 3.4 + Zustand 5 + TanStack Query 5 +
  supabase-js 2.116 + @expo/vector-icons + expo-font Google Bangla fonts
  (Hind Siliguri + Noto Serif Bengali). Charts (Victory) + RHF/Zod + PostHog
  deliberately deferred (no admin forms yet; result bars are plain Views).
- Screens port our static site's UX: landing (live stats/steps/subjects/rules),
  practice (era chips + subject chips + instant-feedback reader, ?subject= link),
  exam (picker cards + timed runner + palette + -0.25 scoring + review). Anon key
  (read-only RLS) in `src/lib/supabase.ts`, same as static site.
- Env notes: `create-expo-app` scaffold FAILED (npm 12 breaks its template fetch);
  extracted `expo-template-default@sdk-57` tarball manually. pnpm 11 used for
  installs (`node-linker=hoisted` in apps/web/.npmrc for Metro). Pinned
  `react-native-css-interop@0.2.6` (NW dep pnpm didn't hoist). Added `css.d.ts`.
- Verified: `tsc --noEmit` clean; `expo export --platform web` → dist with
  `/`, `/practice`, `/exam` + 10KB NW CSS; Bangla strings + `.bg-paper`/accent
  confirmed in bundle; static HTML files serve 200.
- Run: `cd apps/web && pnpm exec expo start --web`. Static `index/practice/exam.html`
  at repo root still served by `npx serve .` (unchanged fallback).

## 2026-09-11 — Exam-room UI adopted from user's reference version
- Kept multi-page structure + Supabase live data; adopted reference patterns:
  pill chips with counts, `qcard` (tags/counter/accent progress), options with
  letter keys, right-border feedback (green/red), score side-panels, sticky dark
  `timerbar` (red under 10 min), palette with striped unanswerable cells +
  mobile fullscreen overlay, fixed bottom `examnav` (tab bar auto-hides while
  examining via `body.exam-running`), result with score-hero/breakdown/subject
  bars/review `<details>`.
- Exam now shows the FULL paper: defective no-answer rows appear as striped
  palette cells with disabled options (excluded from scoring, counted in header).
- Fixed along the way: `btn-primary` alias missing in CSS; feedback-builder
  precedence bug; anchor `.tax-card` underline.
- Verified: practice/exam module JS `node --check` OK; 0 `<select>`; markup
  classes all present in CSS (only template-fragment false positives).

## 2026-09-11 — Multi-page rebuild: landing + practice + exam (UX pass)
- Split the single-page demo into `index.html` (landing only: hero, live stats,
  3-step journey, feature cards, subject preview, rules, footer), `practice.html`
  (era-grouped year chips + subject chips + reader), `exam.html` (exam card grid
  + timed runner + result). Shared `assets/css/main.css` + `assets/js/app.js`
  (Supabase client, constants, helpers, drawer/bottom-nav behavior).
- Research-grounded changes: mobile bottom tab bar for the 3 core destinations
  (হোম/অনুশীলন/পরীক্ষা) + labeled hamburger drawer with aria-expanded/Esc/outside-click;
  dropdowns replaced by visible single-tap chips/cards; 48px targets; safe-area
  padding; skip-link + aria-current + aria-live feedback; one question per screen
  with top progress bar; Bangla-digit chips via toBn().
- Cross-page journey: subject cards deep-link to `practice.html?subject=N`.
- Verified: 4/4 JS modules `node --check` OK; 0 `<select>` in practice/exam;
  all asset links resolve; bottombar/hamburger/drawer/720px/1024px/safe-area/
  focus-visible/reduced-motion rules present in CSS. Serve with `npx serve .`.

## 2026-09-11 — index.html rebuilt as working Bangla quiz app on Supabase
- Same design language (paper bg, red accent, bordered cards, reveal anim) but:
  Bangla-first copy; Hind Siliguri (UI) + Noto Serif Bengali (display) + IBM Plex
  Mono (digits/codes only, no letter-spacing on Bangla text); custom cursor,
  particle canvas, and unused GSAP removed; "11 subjects" fixed to live 10.
- Features (all live from Supabase anon/read-only): hero stats (exams/questions/
  subjects/has_image counts); year+subject practice with instant feedback + ব্যাখ্যা
  + images; full-paper timed mock exam per BCS year (null-answer rows excluded from
  scoring, −0.25 negative, palette, auto-submit, review list); subject cards jump
  into practice; footer carries uttoron.academy/PSC attribution per DATA_LICENSE.
- Verified: module JS `node --check` OK; zero hits for cursor/particles/gsap/
  Montserrat/Inter in index.html. Run with `npx serve .` then open the page.

## 2026-09-11 — Advisor fixes: pg_trgm schema + storage list policy
- NEW `supabase/migrations/20260911000300_advisor_fixes.sql` (applied live):
  `extensions` schema created, `pg_trgm` moved public→extensions, storage.objects
  SELECT policy `public read bcs-images` dropped.
- `20260911000000_schema.sql` §0 now creates pg_trgm `WITH SCHEMA extensions`;
  `20260911000100_storage.sql` documents why no SELECT policy (public bucket serves
  direct URLs with no RLS check; app uses deterministic URLs from question_images,
  never the list API; service_role can still list for ops).
- Verified live: pg_trgm in `extensions`, 0 policies on storage.objects,
  bucket_objects=799, search_path includes extensions, `%`/ILIKE/FTS queries work,
  public GET → 200, anon list API → 200 with `[]` (nothing enumerable).
- If listing is ever needed, re-add a PREFIX-scoped policy, not bucket-wide.

## 2026-09-11 — SECURITY DEFINER advisor fixed on v_questions_with_images
- Fix: `CREATE OR REPLACE VIEW ... WITH (security_invoker = true)` (PG15+ pattern;
  project is PG 17). View now enforces the querying user's RLS instead of the owner's.
- Files: NEW `supabase/migrations/20260911000200_view_security_invoker.sql` (applied live);
  `20260911000000_schema.sql` §5 updated so fresh projects get the fixed view.
- Verified live: `pg_class.reloptions = ['security_invoker=true']`, view_rows=5350 ==
  questions, anon PostgREST read of `11st_bcs q78` via the view → HTTP 200. No RLS
  policy change needed (anon/authenticated already have SELECT on underlying tables).
- Note: no Supabase CLI on this machine — applied via psycopg pooler URL from `.env`.

## 2026-09-11 — Images vendored into dataset/images (reverses NOT-in-repo decision)
- Copied `C:\Users\isang\Desktop\Code\bcs_dataset\images` → `dataset/images`:
  808 files, ~14.8 MB. Verified: 799/799 `image_manifest.csv` keys present,
  9/9 `orphan_images_ignored` present on disk (skipped at upload, unchanged).
- `.env IMAGES_DIR` repointed to `dataset\images` (self-contained; seed accepts
  either the dataset root or its `images/` dir per `seed.py:257`).
- Tradeoffs accepted by user: repo grows ~15 MB; QUESTION DATA + IMAGES stay
  third-party copyright (`dataset/DATA_LICENSE.md` — educational/research basis,
  no paid-republish, takedown on request). Supabase Storage `bcs-images` remains
  the runtime source of truth; `dataset/images` is the local seed source.
- NOTE: `SUPABASE_AGENT_BRIEF.md` §1 + §4A updated same day to match (binaries vendored).

## 2026-09-11 — Image binaries DONE (Storage upload complete)
- Ran `python scripts/seed.py --images-only --images-dir C:\Users\isang\Desktop\Code\bcs_dataset\images`
  (799 keys from `image_manifest.csv`): `VALIDATE OK + UPLOAD DONE: ok=799 missing/failed=0`.
- Spot-checked public URLs (all HTTP 200): `21st_bcs/q1_img1.jpg` (solve image),
  `11st_bcs/q78_img1.jpg` (image-only question), `50th_bcs/q124_img1.png`.
- `.env` created (gitignored via new `.gitignore`): project URLs + anon/service_role +
  pooler DB URL (password URL-encoded). `SUPABASE_PUBLISHABLE_KEY` still empty (optional).
- Migration now fully seeded: DB 5,350 questions / 799 image rows + 799 Storage objects in `bcs-images`.

## 2026-09-11 — DB migration DONE, image binaries PENDING
- Project `bcs-console` created: ref `cbebidcjrijottcqlqpq`, region `ap-south-1`
  (Mumbai, chosen for BD latency), status `ACTIVE_HEALTHY`, Postgres 17.
- DB password: generated strong, shown to user once at creation — NOT stored here.
- Connection: direct `db.<ref>.supabase.co` does NOT resolve from some networks;
  use Supavisor session pooler
  `postgresql://postgres.<ref>:<pw>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
  (`scripts/seed.py` defaults to this; override with `SUPABASE_DB_URL`).
- Applied `supabase/migrations/20260911000000_schema.sql` (fixed ORDER BY-in-FILTER
  syntax once) + `20260911000100_storage.sql`. Subjects=10, bucket `bcs-images` public.
- `python scripts/seed.py --db-only` → questions=5350, image_rows=799.
- Post-seed checks ALL PASS: 41 exams; per-exam counts == manifest; subjects
  1:1008 … 10:126; has_image=766; NULL correct_answer=8 (the defective rows, kept blank);
  0 bad slugs; FTS populated; view=5350 rows; RLS on all 4 tables.
- Schema decisions: NORMALIZED `question_images` over text[]/JSONB (1:1 Storage
  objects, per-type embed/filter, orphan auditing); `correct_answer` NULL = blank;
  `has_image` generated column; FTS `simple` config + trigram index (no `bengali`
  TS config exists in Postgres); anon/authenticated SELECT-only, service_role writes.
- PENDING (needs user): (1) image binaries — not in this repo; clone dataset repo's
  `images/` and run `python scripts/seed.py --images-only --images-dir <path>`
  (2) `SUPABASE_SERVICE_ROLE_KEY` env (Storage upload requires service_role;
  DB rows already carry deterministic public URLs, so upload converges later).
- Seed bug fixed: `--full` default=True defeated `--db-only` (argparse mutex);
  now defaults to full only when no mode flag is given.
- Pre-seed validation (`--validate-only`) enforces: 41/5350 counts, taxonomy 1..10
  + en/bn match, flags==arrays, slug pattern, 0 mojibake, refs == image_manifest.csv
  (799), orphans unreferenced, blank set == manifest 8.

## 2026-09-14 — Bangla Typography: Hind Siliguri standardization
- Fixed `<Bn>` component in `apps/web/src/components/ui.tsx` so that text fragments
  and Bengali words are explicitly rendered with Hind Siliguri (`FONT.ui` / `FONT.uiBold` /
  `FONT.displayBlack`) instead of unstyled inner `<Text>` nodes that lost font-family on web.
- Loaded all Hind Siliguri weights (`HindSiliguri_300Light`, `400Regular`, `500Medium`,
  `600SemiBold`, `700Bold`) in `apps/web/src/lib/fonts.ts`.
- Configured `tailwind.config.js` with `fontFamily.sans` defaulting to Hind Siliguri.
- Added Google Fonts `@import` and base typography rules in `apps/web/src/global.css`.
- Added `apps/web/src/app/+html.tsx` to preconnect and link Google Fonts Hind Siliguri for Expo web.
- Standardized all raw `<Text>` elements rendering Bengali words to use `HindSiliguri` fonts
  (e.g., hero titles, brand headers, filter clear links, and study aids).
- Verified with AST/regex scan: 0 `<Text>` elements rendering Bengali without Hind Siliguri.
  `pnpm tsc --noEmit` passed with 0 errors.
