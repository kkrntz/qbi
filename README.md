# Pickleball Queue

A court-rotation and player-queue board for open-play pickleball clubs. Each
club keeps its own courts and runs a series of sessions over time — check
players into a session, let the app pull the next group onto a free court
with balanced teams, record results, and when the night's done, end the
session (it becomes permanent, read-only history) and start the next one.

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
- `DATA_DIR` — where club and session data is stored. Relative paths resolve
  against the project root; absolute paths are used as-is. Useful for a
  mounted volume in a container, or a separate directory per facility.

`.env.local` is gitignored; `.env.example` is the committed template.

Data lives under `.data/` (`clubs.json` plus one `club-sessions/<clubId>.json`
per club), so it survives a restart and every device pointed at the server
sees the same state (pages refetch every few seconds). If `.data/session.json`
exists from a version of this app before clubs existed, it's imported
automatically into a new "My Club" the first time `/clubs` loads.

## Clubs and sessions

- **`/clubs`** — full CRUD for clubs: create, rename, delete. Each club is
  independent — its own courts, queue, and session history.
- **`/clubs/<clubId>`** — a club's home: its active session (if any), a form
  to start a new one when there isn't, and its five most recent past
  sessions. A club can only have **one active session at a time** — end it
  before starting another.
- **`/clubs/<clubId>/sessions`** — the full session history for a club.
- **`/clubs/<clubId>/sessions/<sessionId>`** — the dashboard. While active
  it's the full interactive board described below; once ended it's a
  read-only summary (duration, final standings, match history, and a
  **Download session data** button) — ended sessions are kept forever and
  never deleted automatically (deleting the club deletes its history too, so
  that's the one irreversible action).

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
| `src/lib/types.ts` | Domain model: `Player`, `Court`, `Club`, `Session`, settings |
| `src/lib/store.ts` | Pure reducer — `apply(state, action)` for every in-session mutation; knows nothing about persistence |
| `src/lib/clubStore.ts` | File-backed persistence for clubs and their session history; calls `apply()` for game actions, migrates a legacy single-session file on first run |
| `src/lib/teamPicker.ts` | Shared team-balancing/placement logic used by the automatic picker and the manual modals |
| `src/app/api/clubs` | Club CRUD (`GET`/`POST`), and nested `[clubId]` (`PATCH`/`DELETE`) |
| `src/app/api/clubs/[clubId]/sessions` | Session list/create, nested `[sessionId]` (get/delete), `/end`, and `/actions` (the game-action dispatch endpoint) |
| `src/app/clubs` | Club list, club home, session history, the dashboard, self check-in, and player-status pages |
| `src/components` | Dashboard, court cards, queue and side panels |
