# Syncora

Your goals, your crew, your progress.
A friendly, mobile-first shared productivity space: join a room with a code, keep your own task list, see everyone's progress, cheer each other on.

Stack: React + Vite, Tailwind CSS v4, Supabase (Auth, Postgres, RLS, Realtime), hosted on Vercel, installable as a PWA.

---

## Build phases

| # | Phase | Done when |
|---|---|---|
| **1** | **Setup** — Vite, Tailwind, Supabase client, routing, nav shell, PWA manifest | App runs locally and shows "Supabase connected" |
| 2 | Auth + profiles — Google sign-in, profile auto-created, edit name/avatar, route guard | Two Google accounts have separate profiles |
| 3 | Rooms — create, join by code (cap 20), members list, regenerate code, remove member, leave | Second account joins by code; outsiders can't read room data |
| 4 | Tasks — add/edit/delete, check/uncheck, due dates, ownership rules | Members edit only their own tasks |
| 5 | Dashboards + activity feed — personal Today view, room view, feed | Each account sees the correct data |
| 6 | Reactions + streaks — 👏🔥💪🎉 on completed tasks, derived streak | Unchecking removes reactions/events; streak is predictable |
| 7 | Deletion votes — delete/leave requests, majority vote, 48h expiry, admin transfer | Vote passes/fails/expires correctly |
| 8 | Realtime + polish — live updates, loading/empty/error states | A second device sees changes without refresh |
| 9 | PWA + reminder banner + deploy — PNG icons, install prompt, Vercel | Installed on a phone and used by the pilot group |

Each database phase adds one file in `supabase/migrations/` that you run in the Supabase SQL editor, in order.

---

## Phase 1 setup

### 1. Install and run

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:5173. You should see the Home screen and a yellow "Supabase not configured" banner — that's expected until step 2.

### 2. Create the Supabase project

1. https://supabase.com → **New project** → name it `syncora`. Pick the region closest to you (Mumbai = `ap-south-1`).
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `.env.local`.
3. Restart `npm run dev`. The banner should turn green: **Supabase connected**.

### 3. Prepare Google sign-in (used in Phase 2 — easier to do now)

**Google Cloud Console** (https://console.cloud.google.com):
1. Create a project (e.g. `syncora`).
2. **APIs & Services → OAuth consent screen** → External → fill in app name, your email. Add yourself (and pilot friends) as **test users** while it's in Testing mode.
3. **Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - **Authorized JavaScript origins:** `http://localhost:5173`
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret**.

**Supabase dashboard:**
1. **Authentication → Sign In / Providers → Google** → enable, paste the Client ID and secret, save.
2. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:5173`
   - **Redirect URLs:** add `http://localhost:5173/**`
   (Your Vercel URL gets added here in Phase 9.)

### 4. Phase 1 checklist

- [ ] `npm run dev` runs with no errors
- [ ] Bottom nav switches between Home / Rooms / Activity / Profile
- [ ] Home shows **Supabase connected** (green)
- [ ] `npm run build` succeeds
- [ ] Google provider enabled in Supabase (ready for Phase 2)

---

## Project structure

```
src/
  lib/supabase.js          Supabase client (reads env vars)
  components/Layout.jsx    Header + bottom nav shell
  components/ConnectionStatus.jsx   Phase 1 sanity check (remove after Phase 2)
  pages/                   One file per screen
  index.css                Tailwind + design tokens (bg-brand, text-muted, …)
supabase/migrations/       SQL files, one per database phase
public/                    PWA manifest + icon
```
