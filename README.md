# In-Que

A court-rotation and player-queue board for open-play pickleball clubs. Each
club keeps its own courts and runs a series of sessions over time — check
players into a session, let the app pull the next group onto a free court
with balanced teams, record results, and when the night's done, end the
session (it becomes permanent, read-only history) and start the next one.
Operators sign in (a super admin runs every club; a club admin runs only
the ones assigned to them); players never need an account — self check-in
and their personal status page work from a plain link.

## Requirements

Node 20+ (a `.nvmrc` pins 22). With nvm: `nvm use`.

## Running

```bash
npm install
npm run dev       # http://localhost:3000
```

### Configuration

Copy `.env.example` to `.env.local` to override the defaults (both values are
optional; uncomment only what you need):

- `PORT` — port the dev/production server listens on (Next.js reads this
  natively).
- `DATA_DIR` — where club, session, and user data is stored. Relative paths
  resolve against the project root; absolute paths are used as-is. Useful
  for a mounted volume in a container, or a separate directory per facility.
- `AUTH_SECRET` — signs login session cookies. Optional: if unset, one is
  generated and saved to `.data/auth-secret` on first run, so this is only
  worth setting explicitly if you're running more than one server instance
  against the same `DATA_DIR` and want them to share login sessions.

`.env.local` is gitignored; `.env.example` is the committed template.

Data lives under `.data/` (`clubs.json`, `users.json`, and one
`club-sessions/<clubId>.json` per club), so it survives a restart and every
device pointed at the server sees the same state (pages refetch every few
seconds). If `.data/session.json` exists from a version of this app before
clubs existed, it's imported automatically into a new "My Club" the first
time `/clubs` loads.

## Accounts and roles

The first time anyone visits `/login` with no users yet, it shows a one-time
setup form instead of a login form — whatever account is created there
becomes the first **super admin**. After that, setup is disabled; a super
admin manages every account from **`/users`** — create, **edit** (email,
password, role, and which clubs a club admin runs — reassigning clubs takes
effect on that admin's very next request, no re-login needed), and remove.
A change takes effect immediately rather than waiting for a fresh login,
since every request re-reads the account's current role straight from disk.
Removing an account, or editing away the app's only super admin, is blocked
— there must always be at least one.

- **Super admin** — full club CRUD and user management, and can **view**
  every club's sessions (live or ended) — but cannot run them. A live
  session opened by a super admin renders fully read-only: no check-in, no
  starting/ending games, no court or settings changes, no creating/ending/
  deleting a session. That's deliberate — super admin is for club/user
  administration and cross-club oversight, not operating one club's
  gameplay day to day.
- **Club admin** — manages only the club(s) assigned to them (`/users` lets a
  super admin pick one or more): full control over those clubs' live
  sessions. They see a filtered `/clubs` list with no club create/rename/
  delete controls, and get redirected away from any other club's pages.

Every signed-in user lands on **`/dashboard`**, a report scoped to what they
can see: stat tiles (clubs, sessions live right now, all-time totals for
sessions/games/check-ins), a per-club table (status, sessions, games,
check-ins, last activity, linking into each club), and a recent-activity feed
of the most recently started sessions. A super admin's version covers every
club platform-wide, plus a total-admins tile (super/club breakdown); a club
admin's is the same layout filtered to just the club(s) assigned to them —
genuinely useful once someone runs more than one, and still a reasonable
overview with just one. Everything is computed fresh on each page load by
reading the relevant session files — fine at the scale a file-backed store
targets, and simplest to keep correct as the data model evolves.

**Self check-in and player status pages stay public on purpose** — players
don't have accounts, so `/clubs/<clubId>/sessions/<sessionId>/checkin` and
`/p/<playerId>` work with no login, same as the three self-service actions
they rely on (`checkIn`, `checkOut`, `setBenched`). Every other action —
starting/ending games, court management, settings, creating/ending/deleting a
session — requires a signed-in club admin for that specific club (not a
super admin — see above).

## Clubs and sessions

- **`/clubs`** — full CRUD for clubs: create, rename, delete. Each club is
  independent — its own courts, queue, and session history.
- **`/clubs/<clubId>`** — a club's home: its active session (if any), a form
  to start a new one when there isn't, and its five most recent past
  sessions. A club can only have **one active session at a time** — end it
  before starting another.
- **`/clubs/<clubId>/sessions`** — the full session history for a club. A
  **×** next to any session (active or ended) permanently deletes it and its
  match history; a stronger warning appears if it's still active.
- **`/clubs/<clubId>/sessions/<sessionId>`** — the dashboard. While active
  it's the full interactive board described below; once ended it's a
  read-only summary (duration, final standings, match history, a **Download
  session data** button, and a **Delete session** button). Ended sessions are
  kept forever unless explicitly deleted (deleting the club deletes all of
  its session history too).

**End session** in the dashboard's header opens a summary with a **Download
session data** button — a JSON file with the session's name, final player
stats, and full match history (player names, not internal ids). Download as
many times as you like before committing; **End session** then marks it
ended for good. Starting the next session for that club carries over its
court setup and mode/winner-priority settings, same as before.

### Self check-in

Every session has its own standalone, phone-friendly check-in page at
`/clubs/<clubId>/sessions/<sessionId>/checkin` — players add themselves to
the queue, no operator needed. Click **Self check-in link** in the dashboard
header to get the shareable URL (copy it, text it, or print it as a QR code
for court-side signage). After checking in, a player sees their spot in line
and can hand the device to the next person — or tap **View my status** for
their own personal, bookmarkable status page.

### Player landing page

`/clubs/<clubId>/sessions/<sessionId>/p/<playerId>` is a live status page for
one checked-in player — reached via **View my status** after self check-in.
It updates automatically as the session changes: while waiting it shows their
position in line and a **Leave the queue** button; once their match starts it
shows the court, teammate and opponents, and a live clock; if an operator
benches them it offers **I'm back — rejoin the queue**. A player who's been
checked out sees a friendly prompt to check in again instead of an error, and
once the session ends everyone's page shows a simple "thanks for playing"
message instead.

Players checked in by an operator (not via self check-in) don't get this link
automatically, so a small **🔗** button next to every player's name — in the
queue, the sitting-out list, and on a live court — copies their personal
status link to the clipboard for the operator to hand off.

## How the rotation works

- **Check in** adds a player with a skill level, placed ahead of anyone
  already queued who has played at least one game this session, but behind
  anyone still waiting for their first game — so everyone gets a first game
  before regulars get a second, with FCFS order preserved within each group.
- **Start next game** takes the first 4 players in line (2 in singles mode) and
  splits them into even teams, pairing the strongest available player with the
  weakest. If that exact foursome played together in one of the last couple of
  matches, it swaps the two lowest-priority slots for the next two queued
  players instead of repeating the same group (one slot if only one
  replacement is available) — the longest-waiting players in the group keep
  their spot whenever possible. **Assign players…** opens a manual picker
  instead, pre-filled with that same next-in-line, skill-balanced group as a
  starting point — rearrange who's on which team, or swap anyone out for a
  different player currently waiting, then press **Start game**. **Reset**
  returns to that automatic suggestion; **Clear** empties the picker to build
  the lineup from scratch.
- **✎ (edit teams)** on a live court lets you reshuffle who's playing after the
  game has already started — move someone between teams, or swap a player out
  for someone currently waiting. A swapped-out player goes back to the front
  of the queue (they didn't choose to leave); a swapped-in player starts
  playing immediately. Stats are only credited for whoever is on the roster
  when the game actually ends.
- **Won / End, no winner** records the game, credits games played and wins, and
  returns everyone to the back of the queue — nobody cuts ahead of players
  who were already waiting. **Winner priority** decides the order of the two
  teams rejoining from that match: the winners rejoin just ahead of their
  opponents, within that new block at the end of the line. Toggle it off and
  both teams rejoin together in strict first-come, first-served order.
- **Cancel** returns a court's players to the front of the queue without
  recording a game.
- Queue rows can be reordered, benched (sit out without losing your spot in the
  roster), or checked out entirely.
- Courts can be added, closed to take them out of rotation, or removed.

## Layout

| Path | Purpose |
| --- | --- |
| `src/lib/types.ts` | Domain model: `Player`, `Court`, `Club`, `Session`, `User`, settings |
| `src/lib/store.ts` | Pure reducer — `apply(state, action)` for every in-session mutation; knows nothing about persistence |
| `src/lib/clubStore.ts` | File-backed persistence for clubs and their session history; calls `apply()` for game actions, migrates a legacy single-session file on first run; `getPlatformReport()`/`getClubAdminReport()` build the `/dashboard` rollups (every club vs. a filtered subset) over a shared `buildReport()` core |
| `src/lib/auth.ts` | Password hashing, signed session cookies, user storage/CRUD — no framework dependency |
| `src/lib/permissions.ts` | `canAccessClub` (view) / `canManageClub` (run live sessions) — pure, client-safe, no fs/crypto, so both API routes and client components can import it |
| `src/lib/session.ts` | Cookie get/set/clear and `getCurrentUser()`, built on `next/headers` |
| `src/lib/pageAuth.ts` | `requirePageUser`/`requirePageClubAccess`/`requirePageClubManager`/`requirePageSuperAdmin` — redirect-on-failure guards for Server Component pages |
| `src/lib/teamPicker.ts` | Shared team-balancing/placement logic used by the automatic picker and the manual modals |
| `src/app/api/auth` | `login`, `logout`, `setup` (first-run bootstrap), `me` |
| `src/app/api/users` | User CRUD, super admin only |
| `src/app/api/clubs` | Club CRUD (`GET`/`POST`), and nested `[clubId]` (`PATCH`/`DELETE`) |
| `src/app/api/clubs/[clubId]/sessions` | Session list/create, nested `[sessionId]` (get/delete), `/end`, and `/actions` (the game-action dispatch endpoint — publicly reachable only for `checkIn`/`checkOut`/`setBenched`) |
| `src/app/clubs` | Club list, club home, session history, the live session board, self check-in, and player-status pages |
| `src/app/login`, `src/app/users`, `src/app/dashboard` | Sign-in/setup, the super-admin user manager, and the role-aware report landing page every user gets |
| `src/components` | Session board, court cards, queue and side panels; `PlatformReportView` is the dashboard's shared stat-tiles/table/feed, reused by both roles |
