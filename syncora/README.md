# Syncora

Your goals, your crew, your progress.
A friendly, mobile-first shared productivity space: join a room with a code, keep your own task list, see everyone's progress, cheer each other on.

Stack: React + Vite, Tailwind CSS v4, Supabase (Auth, Postgres, RLS, Realtime), hosted on Vercel, installable as a PWA.

---

## Build phases

| # | Phase | Done when |
|---|---|---|
| **1** | **Setup** — Vite, Tailwind, Supabase client, routing, nav shell, PWA manifest | App runs locally and shows "Supabase connected" |
| **2** | **Auth + profiles** — Google sign-in, profile auto-created, edit name/avatar, route guard | Two Google accounts have separate profiles |
| **3** | **Rooms** — create, join by code (cap 20), members list, regenerate code, remove member, leave | Second account joins by code; outsiders can't read room data |
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

## Phase 2 — Auth + profiles

### 1. Run the migration
Supabase → **SQL Editor** → New query → paste all of `supabase/migrations/002_profiles.sql` → **Run**.
It creates the `profiles` table, the signup trigger, the RLS rules and the `avatars` storage bucket.

Check: **Table Editor** shows `profiles`; **Storage** shows an `avatars` bucket.

### 2. Run the app
```bash
npm install
npm run dev
```

### 3. Phase 2 checklist
- [ ] Opening http://localhost:5173 while signed out lands on **/signin**
- [ ] **Continue with Google** → Google → back to the **Welcome** screen with your Google name and photo prefilled
- [ ] Change your name / photo on Welcome → **Continue** → Home says "Good …, <first name>"
- [ ] Refreshing keeps you signed in; Welcome doesn't show again
- [ ] Profile tab: change name or photo → **Save changes** → "Saved ✓", header avatar updates
- [ ] **Remove** photo → initials show instead
- [ ] Sign out → back to /signin
- [ ] Sign in with a **second Google account** (add it as a test user on the OAuth consent screen first) → it gets its own Welcome + profile
- [ ] Supabase **Table Editor → profiles** has two rows, both `onboarded = true`

**If Google sign-in fails:** check the redirect URI in Google Cloud is exactly `https://<project-ref>.supabase.co/auth/v1/callback`, and that `http://localhost:5173/**` is in Supabase → Authentication → URL Configuration → Redirect URLs.

---

## Phase 3 — Rooms

### 1. Run the migration
Supabase → SQL Editor → paste all of `supabase/migrations/003_rooms.sql` → Run.
It adds `rooms`, `room_members`, `activity_events` (filled now, shown in Phase 5), the RLS rules, and the room functions (`create_room`, `join_room`, `regenerate_join_code`, `remove_member`, `leave_room`, `delete_room`).

It also widens profile visibility: you can now see the profiles of people who share a room with you.

### 2. Phase 3 checklist
Use two Google accounts — e.g. a normal window (A) and an incognito window (B).
- [ ] A: Rooms → **Create room** → lands on the room page with an 8-character code, A is **Admin**
- [ ] A: **Copy code** works (and **Share** on a phone)
- [ ] B: Rooms → **Join with code** → type it in lowercase or with a dash — still works
- [ ] B: a wrong code shows "That room code doesn't match any room."
- [ ] Both see 2 members with names + avatars; B has no Remove / Edit / New code buttons
- [ ] A: **Edit** name/description → saved; B sees it after refresh
- [ ] A: **New code** → old code stops working for a third account
- [ ] A: **Remove** B → B's Rooms list no longer shows the room; opening its URL says "Room not found"
- [ ] B rejoins, then **Leave room** → gone from B's list
- [ ] A, alone in the room: **Delete room** works. With others in it, the button is replaced by the Phase 7 note
- [ ] Shared link: open `http://localhost:5173/rooms/join?code=XXXXXXXX` signed out → after sign-in the code is prefilled

---

## Project structure

```
src/
  lib/supabase.js          Supabase client (reads env vars)
  components/Layout.jsx    Header + bottom nav shell
  context/AuthContext.jsx  Session + profile state (useAuth hook)
  components/RequireAuth.jsx  Route guard: signed out → /signin, new user → /welcome
  components/ProfileForm.jsx  Name + photo form (Welcome and Profile)
  lib/avatars.js           Crop/resize photo to 256px, upload to Storage
  lib/rooms.js             Room queries + RPC calls, join-code formatting
  components/ui.jsx        Shared buttons, inputs, cards
  components/ConfirmDialog.jsx  Confirmation for destructive actions
  pages/                   One file per screen
  index.css                Tailwind + design tokens (bg-brand, text-muted, …)
supabase/migrations/       SQL files, one per database phase
public/                    PWA manifest + icon
```
