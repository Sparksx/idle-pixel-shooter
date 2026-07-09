# Roadmap — making the game last longer

The POC can be "finished" in a single sitting: gold snowballs, every upgrade
gets bought, and nothing new happens after wave ~50. This document plans the
features that turn it into a game you come back to for weeks. Phases are
ordered by impact-per-effort and each one is shippable on its own.

## Already done (this branch)

- **Offline cap**: offline earnings capped at 4h, extendable to 24h with the
  OFFLINE TIME upgrade — coming back regularly matters now.
- **Wave-gated portal upgrades**: SPAWN tab levels unlock with wave progress
  (one level per N waves), so income multipliers and difficulty scale with
  progression instead of being front-loaded with farmed gold.
- **Phase 1 — prestige / rebirth loop** (see below): shipped.
- **Phase 2 — enemy variety** (see below): shipped.
- **Phase 3 — weapon evolutions & milestones** (see below): shipped.
- **Phase 4 — elite waves & daily challenges** (see below): shipped.
- **The wall (lose mechanism)**: enemies that reach the turret line latch
  onto a wall with HP and bite it every second instead of looping back to
  the portal. The wall self-repairs between bites and fully between waves;
  a breach clears the field and pushes the run back 5 waves (never a game
  over, so unattended runs oscillate around the wave they can hold). New
  wave-gated WALL HP / WALL REPAIR portal upgrades grow the buffer.

## Phase 1 — Prestige / rebirth loop ✅ done

The core of every long-lived idle game: reset to multiply. As shipped:

- **REBIRTH** action in the new **CORE** tab, unlocked at wave 50. It resets
  gold, wave, turrets, turret upgrades and the rate/gold/swarm portal levels;
  OFFLINE portal levels persist (kinder), and so do cores, core upgrades and
  lifetime kills.
- Grants **cores** on reset: `floor((wave / 10)^1.5)` — wave 50 pays 11,
  wave 100 pays 31; pushing 10 waves further is always visibly worth more.
- Cores buy permanent upgrades in the CORE tab: **CORE DMG** and **CORE
  GOLD** (+25%/level global multipliers), **HEAD START** (+150 starting gold
  per level) and **WAVE SKIP** (start 2 waves further per level, max 20).
- Each run gets shorter as core multipliers grow, which is the addictive part;
  the wave wall (HP × 1.16^wave) guarantees every run eventually stalls and
  makes rebirth the right move.

## Phase 2 — Enemy variety ✅ done

Every non-boss spawn now rolls a type from the pool unlocked by wave, so
each bracket of waves changes the optimal turret mix. As shipped
(`ENEMY_TYPES` in config):

- **RUNNER** (wave 15+) — 2× speed, 0.5× HP, 1.2× gold; favours
  GUN/DRONE/FREEZER.
- **TANK** (wave 25+) — 0.5× speed, 4× HP, 2.5× gold; favours SNIPER/MORTAR.
- **SPLITTER** (wave 35+) — breaks into 2–3 faster minis on death, each
  carrying a share of hp and gold; favours splash damage.
- **GHOST** (wave 50+) — blinks out of phase for 1s of every 3.2s cycle
  (untargetable and immune while phased); punishes slow-rate turrets,
  favours LASER's continuous beam.
- From wave 60, every **boss** rolls a modifier from the same pool: runner,
  tank, splitting or blinking boss.
- A toast introduces each type the first time it spawns; each type has its
  own pixel shape so the mix is readable at a glance.

## Phase 3 — Weapon evolutions & milestones ✅ done

- **Evolutions**: once a weapon's DMG+RATE levels reach 25 combined, its tab
  offers a one-time gold purchase (300× the weapon's base cost) with a
  visual change and a twist. Evolutions reset on rebirth — they are the
  mid-run goal. As shipped: GUN → **TWIN GUN** (second bullet at another
  enemy), MORTAR → **CLUSTER** (3 scattered mini-blasts), DRONE → **WASP**
  (stings two enemies at once), LASER → **PRISM** (beam splits to a second
  target at half power), FREEZER → **PERMAFROST** (zones also deal damage
  per second), SNIPER → **RAILGUN** (shots pierce everything in their path).
- **Milestones**: 13 passive bonuses at lifetime kills / best wave / gold
  earned thresholds, listed in the new **FEATS** tab with progress shown.
  All three stats survive rebirth, so the bonuses (+5%…+25% damage or gold,
  additive per column) give the numbers a memory across the whole save.

## Phase 4 — Wave texture & challenges ✅ done

- **Elite waves**: every 25th wave carries a fixed modifier, rotating
  deterministically — wave 25 **FRENZY** (1.75× speed, 1.5× gold), 50
  **GOLD RUSH** (1.25× hp, 3× gold), 75 **REGEN** (enemies heal 2% max
  hp/s, 1.5× gold), then the cycle repeats. Announced before the first
  spawn with a toast plus an on-canvas banner, and tagged in the corner
  for the whole wave. Elite multipliers stack with enemy kinds and boss
  modifiers.
- **Daily challenge** (CORE tab, unlocked after the first rebirth): the
  UTC date seeds one rule from a pool of nine — a banned weapon (mortar /
  drone / laser / freezer / sniper), HALF GOLD, RUNNERS ONLY, TANKS ONLY,
  or BRITTLE WALL (30% wall hp) — same challenge for everyone, no backend.
  Starting it stashes the main run and opens a fresh wave-1 run under the
  rule (permanent core & milestone bonuses still apply). Clearing wave 30
  pays `15 + rebirth(bestWave)/2` cores, so the daily stays relevant as
  the save grows; abandoning restores the main run unrewarded and the
  day can be retried. One completion per day.

## What's next (planned)

Ordered by impact-per-effort, same rule as before: each phase shippable
on its own.

### Phase 5 — Juice & QoL

The systems are in; now make them feel good and safe to invest in.

- **Sound & feedback**: tiny synthesized blips (WebAudio, no assets) for
  kills, bosses, breaches and evolutions, with a mute toggle in the
  footer; hit particles and a 1-frame screen shake on boss deaths and
  wall breaches.
- **Numbers readout**: a small stats line (DPS, gold/min, wall pressure)
  so upgrade choices become informed instead of vibes.
- **Save export/import**: copy/paste the save as base64 from the footer —
  cheap insurance for a weeks-old save in localStorage.
- **PWA manifest + offline cache**: install-to-homescreen, loads without
  network; pairs naturally with the offline-earnings loop.

### Phase 6 — Deeper endgame

For when regulars max the current arc (~wave 200, offline cap done).

- **Ascension**: a second prestige layer at high rebirth counts — trade
  all cores and core upgrades for **shards** with meta-multipliers, the
  same reset-to-multiply trick one level up.
- **Elite affix stacking**: past wave 100, elite waves roll two modifiers
  at once (regenerating gold rush…); past 200, bosses are always modified.
- **Weekly challenge**: same seeded machinery keyed on the ISO week — a
  wave-60 target with a rule *pair* and a fat core payout.
- **Cosmetics from streaks**: canvas border styles / palettes for daily
  streaks and weekly clears — pure bragging rights, stored in the save.

## Balance targets

Rough pacing to tune toward once prestige lands (time to reach wave N from a
fresh run, active play):

| Milestone | Fresh save | After 3–4 rebirths |
|---|---|---|
| Wave 25 | ~30 min | ~5 min |
| Wave 50 (first rebirth) | ~2 h | ~20 min |
| Wave 100 | — | ~2 h |
| Wave 200 (offline cap maxed) | — | days |

Levers if the curve is off: enemy HP growth (1.16), gold growth (1.10),
turret cost growth (1.7–1.8), core formula exponent.
