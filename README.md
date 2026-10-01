# Pickleball Queue

A court-rotation and player-queue board for open-play pickleball. Check players
in, let the app pull the next group off the queue onto a free court with
balanced teams, then record the result and send everyone back into the
rotation.

## Requirements

Node 20+ (a `.nvmrc` pins 22). With nvm: `nvm use`.

## Running

```bash
npm install
npm run dev       # http://localhost:3000
```

The session lives in `.data/session.json`, so the board survives a restart and
every device pointed at the server sees the same queue (the page refetches
every few seconds). Delete that file — or hit **Reset** — to start a fresh
session.

### Self check-in

`/checkin` is a standalone, phone-friendly page players can use to add
themselves to the queue — no operator needed. Click **Self check-in link** in
the header to get the shareable URL (copy it, text it, or print it as a QR
code for court-side signage). After checking in, a player sees their spot in
line and can hand the device to the next person — or tap **View my status**
for their own personal, bookmarkable `/p/<id>` page.

### Player landing page

`/p/<id>` is a live status page for one checked-in player — reached via
**View my status** after self check-in. It updates automatically as the
session changes: while waiting it shows their position in line and a
**Leave the queue** button; once their match starts it shows the court,
teammate and opponents, and a live clock; if an operator benches them it
offers **I'm back — rejoin the queue**. A player who's been checked out (or a
session that's been reset) sees a friendly prompt to check in again instead
of an error.

Players checked in by an operator (not via self check-in) don't get this link
automatically, so a small **🔗** button next to every player's name — in the
queue, the sitting-out list, and on a live court — copies their personal
`/p/<id>` link to the clipboard for the operator to hand off.

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
| `src/lib/types.ts` | Domain model and game-mode helpers |
| `src/lib/store.ts` | File-backed session store, team balancing, all actions |
| `src/app/api/state` | `GET` the current session |
| `src/app/api/actions` | `POST` an action, returns the updated session |
| `src/components` | Dashboard, court cards, queue and side panels |
