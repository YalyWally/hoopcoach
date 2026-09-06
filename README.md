# HoopCoach — AI Basketball Performance Coach

A full-stack, personalized AI basketball training, fitness, and nutrition app. Built from the PRD as a working "core loop" MVP: it tests a player, builds a real long-term training + nutrition program, tracks performance, and lets an AI coach actually edit the plan through conversation.

## What's included

- **Onboarding** — basics, goal prioritization (ranked), schedule, equipment, dietary restrictions.
- **Skills & Athletic Assessment** — a real test battery (shooting, ball handling, finishing, passing, defense, sprint/agility/vertical/broad jump, conditioning, bodyweight strength). Produces per-category ratings and an NBA2K-style Overall Rating (OVR).
- **Auto-generated 12-week training program** — Foundation → Development → Performance → Deload/Retest blocks, sequencing Skills / Gym / Field / Recovery days from the player's actual schedule and equipment, avoiding bad sequencing (e.g. heavy legs the day before sprint work, hard sessions before games). Every workout is a real multi-drill session (warm-up, main blocks across categories, cooldown) weighted toward the player's top-priority goals.
- **Pre-workout soreness/injury check-in** that can automatically modify or lighten that day's session, with a "seek medical care" nudge for anything that sounds serious (the app never diagnoses).
- **Post-workout feedback** (difficulty, energy, soreness, pain, overall rating) that automatically nudges the *next* similar session's intensity up or down — real progressive overload/backoff logic, not just logging.
- **Nutrition** — personalized calorie/macro/micronutrient targets (Mifflin-St Jeor + activity + goal adjustment), a MyFitnessPal-style daily log, free-text meal logging with AI macro estimation, dynamic remaining-target recalculation, and a 14-day history chart.
- **AI Coach chat** — powered by the Claude API with real tool-calling. It can actually modify workouts, move the calendar, change goal priorities/equipment, log soreness/injury or meals, update nutrition targets, and rebalance the upcoming plan — not just suggest changes. Every meaningful AI edit is written to an **AI Change History** log the player can review.
- **Fix My Plan** — a rule-based scanner (bad sequencing, excessive back-to-back intensity, pre-game overload, repetitive drills, equipment conflicts, missing recovery) that hands its findings to the AI coach to actually fix.
- **Progress** — OVR trend chart, per-category rating deltas between assessments, badges (Sharpshooter, Speed Demon, High Flyer, Handle Master, Lockdown), assessment history.
- **Gamification** — XP, levels, streaks, badges.
- **Calendar** — color-coded 4-week view (Skills/Gym/Field/Recovery/Testing/Game).
- **Position-specific training emphasis** — Point Guard, Shooting Guard, Small Forward, Power Forward, and Center each nudge the skill/gym category weighting toward the drills that matter most for that role (e.g. ball-handling/passing for Point Guards, post moves/finishing for Centers), on top of the player's own ranked goals.
- **Real recipe library + auto-generated weekly meal plan** — an 84-recipe database (breakfast/lunch/dinner/snack) built from a shared ~40-item ingredient database, so nutrition is computed consistently rather than hand-typed per recipe. Meal plans are generated to hit each player's calorie/macro targets, respect their dietary restrictions (vegetarian/vegan/gluten-free/dairy-free/nut allergy, etc.) and per-ingredient food preferences, and avoid repeating meals within the same week. Any meal can be swapped for an alternative with one tap (or by asking the AI coach).
- **Auto-updating grocery list** — aggregates ingredient quantities across the whole week's meal plan into a categorized shopping list (protein, produce, grains, dairy, pantry) with friendly units (e.g. "15 eggs" instead of grams). Regenerates automatically whenever the meal plan changes.
- **AI photo meal scanning** — snap or upload a photo of a meal and Claude's vision API identifies the foods and estimates calories/macros, pre-filling a log entry you can correct before saving.
- **Calendar sync** — a subscribable `.ics` feed of the player's training calendar (add it to Google/Apple Calendar as "From URL") plus one-way import of an external `.ics` file (games, practice, school schedule) so Fix My Plan can flag training scheduled on top of a game.
- **Push notifications** — opt-in browser push (via a service worker + Web Push/VAPID) for workout reminders, meal-logging nudges, retest reminders, recovery-day heads-ups, and milestone/badge celebrations, each independently toggleable in **Settings**.

### Scope notes (what's intentionally simplified)

This app was built in two passes: a "core loop" MVP first, then a second pass that filled in the remaining PRD features listed above. What's still intentionally simplified:

- The training plan generator is deterministic (not AI-generated) for reliability and speed — see "Known limitations" below.
- Calendar sync has no recurrence (RRULE) support — each event is a single imported occurrence, and the training feed is a flat list of concrete dated events rather than a recurring rule.
- Push notifications work over plain HTTP on localhost (fine for this dev setup); a real deployment would want HTTPS, which browsers require for push outside of localhost.
- No authentication — see "Known limitations" below.

## Architecture

```
backend/   Node.js + Express + libSQL (SQLite-compatible; a local file in dev, Turso in production)
  src/app.js          the Express app itself (routes, middleware) — no listen()/timers, so it can be
                       reused by both the local server and the Netlify function below
  src/server.js       local dev entrypoint: puts app.js behind /api, opens a port, runs the
                       notification-sweep timer
  src/lib/            training plan generator, ratings/assessment scoring, nutrition math,
                       adaptation logic, Fix My Plan scanner, Claude tool-calling,
                       meal plan generator, grocery list builder, iCalendar (ICS) read/write,
                       web push (VAPID) + notification sweep
  src/data/           ingredient database (per-100g nutrition) and the 84-recipe library
                       built from it
  src/routes/         REST API
  src/db/schema.sql   database schema
  src/db/seed.js      optional demo data seeder
  netlify/functions/  api.mjs wraps app.js as one serverless function; notification-sweep.mjs
                       is a scheduled function that replaces the local timer in production

frontend/  React + Vite (single-page app), react-router, recharts for charts
  public/sw.js        service worker for push notifications
  src/push.js         push subscribe/unsubscribe helpers

netlify.toml   deployment config — build command, the /api/* → function redirect, the SPA
               fallback redirect, and the notification-sweep function's cron schedule
```

The database layer (`backend/src/db/index.js`) talks to libSQL over `@libsql/client`, which is wire-compatible with SQLite — the exact same schema and SQL queries run against a plain local file in development (`backend/data.db`, zero setup) and against a real hosted Turso database in production, controlled by whether `TURSO_DATABASE_URL` is set.

The AI coach uses the **Anthropic Messages API with tool use**: the backend gives Claude the player's full live context (profile, goals, latest ratings, upcoming workouts, recent feedback, nutrition targets/totals, today's meal plan, upcoming external calendar events, food preferences/restrictions, recent AI changes) plus a set of tools (`modify_workout`, `move_workout`, `update_goal_priorities`, `update_equipment`, `log_checkin`, `set_nutrition_target`, `log_meal`, `rebalance_upcoming_training`, `set_deadline_goal`, `swap_meal`, `update_food_preference`, `regenerate_meal_plan`). When Claude calls a tool, the backend actually executes the change against the database and logs it to AI Change History, then reports the result back to Claude to summarize in plain language.

Photo meal scanning uses the same SDK with an **image content block** (base64) instead of tool-only text, with a forced tool call to extract structured macros from what Claude sees in the photo.

When `ANTHROPIC_API_KEY` is not configured, the app still runs completely — the AI coach, AI meal-estimation, and AI photo-scanning features return a clear "not connected" message instead of failing, and everything else (assessment, plan generation, meal plan generation, grocery list, nutrition tracking with manual macros, calendar import/export, push notifications, Fix My Plan's rule-based scan) works normally, since none of those depend on the AI.

## Running it locally

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and paste your key:
#   ANTHROPIC_API_KEY=sk-ant-...
# (get one at https://console.anthropic.com/)
npm start
```

This starts the API on `http://localhost:4000` and creates `backend/data.db` (SQLite) on first run.

Optional — populate a fully-fleshed-out demo player (profile, two assessments showing improvement, a generated plan, some completed workout history, and nutrition logs) instead of starting from a blank slate:

```bash
npm run seed
```

Then open the app and, in the browser console, run `localStorage.setItem('hc_player_id', '<the id printed by the seed script>')` and refresh — or just skip this and use the in-app Onboarding flow to create your own player.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL it prints (default `http://localhost:5173`). The dev server proxies `/api` to the backend on port 4000.

### 3. Try it

1. Complete Onboarding (goals, schedule, equipment, dietary restrictions, position).
2. Complete the Skills & Athletic Assessment — this generates your OVR, your first 12-week program, and a 14-day meal plan.
3. Explore Home / Train / Progress / Plan / Nutrition.
4. On the **Plan** page, check the **Meal Plan** tab (swap any meal), **Grocery List** tab (auto-built from the week's meals), and **Calendar Sync** tab (subscribe URL for the training calendar; paste an `.ics` export to import games/practice).
5. On the **Nutrition** page, try the **Scan Meal** card (upload a food photo) and set a few **Food Preferences** (love/like/neutral/dislike/can't eat) to see them steer future meal plans.
6. Open **Settings** (gear icon, top right) to turn on push notifications and choose which types you want.
7. Go to **Coach** and try things like:
   - "This workout is too easy, make it harder"
   - "I don't have dumbbells today"
   - "I have a game Saturday, adjust my week"
   - "Focus more on my shooting"
   - "I ate a burger and fries for lunch"
   - "Swap out today's dinner"
   - "I don't like salmon"
   - Tap **Fix My Plan**

The AI coach chat, AI text/photo meal estimation, and Fix My Plan's auto-fix step require `ANTHROPIC_API_KEY` to be set to actually converse and make live edits; without it you'll see a friendly explanation instead, and everything else above still works.

## Deploying to Netlify (so it runs 24/7 and you can use it on your phone)

Running it "locally" (above) only works while your computer is on and both processes are running. To open the app from your iPhone (or any device) at any time, deploy it to Netlify — this turns the frontend into a static site and the backend into a serverless function, both served over HTTPS from one URL, which is also what makes push notifications and "Add to Home Screen" work on iOS.

This costs a small amount of money once you're past free trial credits (Netlify's free tier covers small projects, and Turso's free tier is generous — see their pricing pages for current numbers), but there's no bill until you're past those limits.

### 1. Push your code to GitHub

If this project isn't already in a GitHub repo, create one and push it there — Netlify deploys by connecting to a GitHub (or GitLab/Bitbucket) repo and rebuilding automatically on every push.

### 2. Create a Turso database (replaces the local SQLite file)

The app normally stores its data in a local SQLite file, which doesn't exist in Netlify's serverless environment — there's no persistent disk between requests. [Turso](https://turso.tech) is a hosted database that speaks the same SQLite dialect, so nothing about the app's data or queries needs to change, only where they run.

1. Sign up at [turso.tech](https://turso.tech) (their dashboard lets you create a database without installing anything, or use their CLI — either works).
2. Create a new database.
3. Copy its **database URL** (starts with `libsql://`) and generate an **auth token** for it.

You'll paste both into Netlify's environment variables in step 4.

### 3. Generate VAPID keys for push notifications (one-time)

```bash
cd backend
npm install   # if you haven't already
npm run generate-vapid-keys
```

This prints a `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Copy both — you'll only ever do this once for this deployment; regenerating later would break everyone's existing notification subscriptions.

### 4. Create the Netlify site and set environment variables

1. In Netlify, choose **Add new site → Import an existing project**, and connect the GitHub repo from step 1. Netlify will detect `netlify.toml` at the repo root and use its build settings automatically (build command, publish directory, functions directory, redirects) — you shouldn't need to change anything in the UI here.
2. Before the first deploy finishes successfully, go to **Site configuration → Environment variables** and add:
   - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (from step 2)
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (from step 3)
   - `ANTHROPIC_API_KEY` (optional — only needed for the AI coach chat, AI meal-macro estimation, and AI photo scanning; everything else works without it)
   - `CLAUDE_MODEL` (optional, only if you want to override the default model)
3. Trigger a deploy (or push a commit) so the build picks up the new environment variables.

### 5. Open it and add it to your iPhone's home screen

Once the deploy finishes, Netlify gives you a URL like `https://your-site-name.netlify.app`. Open it in Safari on your iPhone, complete onboarding, then:

1. Tap the **Share** button (the square with an arrow pointing up).
2. Tap **Add to Home Screen**.

This gives you an app icon that opens full-screen, without Safari's address bar — and on iOS 16.4+, it's also what makes push notifications work at all (iOS only allows web push for sites added to the home screen this way, not for a page open in a regular Safari tab). Open **Settings** in the app and tap **Enable Notifications** to try it.

From here the app behaves exactly like it does locally — the same onboarding, assessment, training plan, nutrition, meal plans, chat, and everything else — just reachable from anywhere, any time, without your computer needing to be on.

### Updating it later

Netlify rebuilds and redeploys automatically on every push to the branch it's connected to — there's nothing extra to run. If you ever change the VAPID keys or the Turso database, existing users would need to re-subscribe to push and their data would live in the new database respectively, so avoid changing either casually once people are using it.

## Project structure quirks worth knowing

- `backend/src/lib/content.js` is the drill/exercise library the plan generator draws from, including `POSITION_SKILL_BOOST`/`POSITION_GYM_BOOST` (the position-specific category weighting) — add more drills/exercises or adjust position boosts here.
- `backend/src/lib/assessmentTests.js` defines the test battery and the (intentionally simple, not clinically validated) benchmark scoring used to compute ratings — tune the `mean`/`sd` benchmarks per test if you want the rating scale to feel different.
- `backend/src/data/ingredients.js` and `backend/src/data/recipes.js` are the nutrition source of truth for meal planning — add an ingredient once and any recipe built from it (via `buildRecipe`) gets correct, consistent macros automatically.
- `backend/vapid.json` (gitignored) holds the auto-generated Web Push VAPID keypair in local dev only; delete it to force new keys (existing push subscriptions in the DB would then need to re-subscribe). In production (Netlify) there's no local file to write, so `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` env vars are required instead — see "Deploying to Netlify".
- `backend/src/db/index.js` exports a small async shim (`db.prepare(sql).get/all/run(...params)`) over `@libsql/client` rather than using the driver's own API directly, so the rest of the codebase reads almost exactly like it would with a synchronous SQLite driver — just with `await` in front of each call.
- `tools/e2e.js` and `tools/seeded_check.js` are Playwright scripts used during development to smoke-test the app. Not required to run the app; kept for convenience if you keep developing this further.

## Known limitations / next steps

- The training plan generator is deterministic (not AI-generated) for reliability and speed; the AI coach edits it conversationally on top. A future pass could have Claude draft entire blocks too.
- Rating benchmarks are a single generic baseline adjusted by a simple age/experience factor — not a real sports-science norm table.
- No authentication — this is a single-player local app (one browser = one player, tracked via `localStorage`).
- Calendar import/export has no recurrence (RRULE) support and no two-way sync (imported events are a one-time snapshot; re-import to refresh).
- Push notifications need a real HTTPS origin to work outside of localhost (a browser platform requirement, not app-specific) — see "Deploying to Netlify" above, which gets you one.
