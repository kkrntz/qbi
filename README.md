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

## How the rotation works

- **Check in** adds a player to the back of the queue with a skill level.
- **Start next game** takes the first 4 players in line (2 in singles mode) and
  splits them into even teams, pairing the strongest available player with the
  weakest.
- **Won / End, no winner** records the game, credits games played and wins, and
  returns everyone to the queue — losers first, so the side that has been
  waiting longest plays again sooner.
- **Winners stay** instead puts the winning team back at the front of the line.
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
